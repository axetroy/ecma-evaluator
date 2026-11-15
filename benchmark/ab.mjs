// Before/after benchmark. Compares the working-tree evaluator against a
// baseline revision materialized from git, over the same cases as index.mjs.
//
// Usage:
//   node benchmark/ab.mjs                 # baseline defaults to origin/master
//   node benchmark/ab.mjs <git-ref>       # e.g. a tag, branch, or commit
//
// The baseline file is written next to this script (so bare imports such as
// `acorn` resolve) and removed afterwards.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { Evaluator as NewEvaluator } from "../src/Evaluator.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const ref = process.argv[2] ?? "origin/master";

const baselineSource = execFileSync("git", ["show", `${ref}:src/Evaluator.js`], { cwd: projectRoot, encoding: "utf8" })
	// The baseline imports `./block.js`; point it at the real module so the
	// materialized file does not need a sibling copy.
	.replace('from "./block.js"', `from ${JSON.stringify(path.join(projectRoot, "src", "block.js"))}`)
	.replace('from "./regExpSafety.js"', `from ${JSON.stringify(path.join(projectRoot, "src", "regExpSafety.js"))}`);

const baselineFile = path.join(here, ".baseline.generated.mjs");
fs.writeFileSync(baselineFile, baselineSource);
const { Evaluator: BaselineEvaluator } = await import(`./.baseline.generated.mjs?ref=${encodeURIComponent(ref)}`);

const CASES = [
	["arithmetic chain", "1 + 2 * 3 - 4 / 2 + 5 % 3", {}],
	["variable lookup", "a + b + c", { a: 1, b: 2, c: 3 }],
	["comparison/logical", "a > b && b < c || a === 1", { a: 1, b: 2, c: 3 }],
	["member access", "user.name + user.age", { user: { name: "Ada", age: 36 } }],
	["computed member", "obj['a'] + obj['b'] + obj['c']", { obj: { a: 1, b: 2, c: 3 } }],
	["string concat", "'a' + b + 'c' + d", { b: "x", d: "y" }],
	["Math calls", "Math.max(1, 2, 3) + Math.min(a, b)", { a: 5, b: 9 }],
	["conditional", "a > b ? a - b : b - a", { a: 10, b: 4 }],
	["array literal", "[1, 2, 3, 4, 5]", {}],
	["object literal", "({ x: 1, y: 2, z: a + b })", { a: 1, b: 2 }],
	["array map/reduce", "[1,2,3,4,5].map(v => v * 2).reduce((acc, v) => acc + v, 0)", {}],
	["regex literal test", "/^[a-z]+$/.test(name)", { name: "ada" }],
	["regex literal replace", "text.replace(/o/g, '0')", { text: "hello world" }],
];

const iterations = Number(process.env.AB_ITERATIONS ?? 200000);
const RUNS = Number(process.env.AB_RUNS ?? 7);

function median(samples) {
	samples.sort((a, b) => a - b);
	return samples[(samples.length - 1) >> 1];
}

function timeOne(fn) {
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) fn();
	return Number(process.hrtime.bigint() - start) / iterations;
}

console.log(`baseline: ${ref}`);
console.log("case".padEnd(20), "before".padStart(9), "after".padStart(9), "speedup".padStart(9));

let ratioSum = 0;
for (const [name, expr, context] of CASES) {
	const baseline = new BaselineEvaluator(context);
	const current = new NewEvaluator(context);
	const beforeFn = () => baseline.evaluate(expr);
	const afterFn = () => current.evaluate(expr);
	// Warm both up together so neither side pays JIT/parse-cache costs the other
	// avoids, then alternate the timed runs and keep the median of an odd number
	// of samples so a single GC pause cannot skew one side.
	for (let i = 0; i < Math.min(iterations, 20000); i++) {
		beforeFn();
		afterFn();
	}
	const beforeSamples = [];
	const afterSamples = [];
	for (let run = 0; run < RUNS; run++) {
		beforeSamples.push(timeOne(beforeFn));
		afterSamples.push(timeOne(afterFn));
	}
	const before = median(beforeSamples);
	const after = median(afterSamples);
	ratioSum += before / after;
	console.log(name.padEnd(20), before.toFixed(0).padStart(9), after.toFixed(0).padStart(9), `${(before / after).toFixed(2)}x`.padStart(9));
}
console.log("mean speedup:", `${(ratioSum / CASES.length).toFixed(2)}x`);

fs.rmSync(baselineFile, { force: true });
