// Micro-benchmark for the evaluator hot paths.
//
// Usage:
//   node bench/index.mjs            # run every case
//   node bench/index.mjs --json     # machine-readable output
//
// The numbers are only meaningful as a before/after comparison on the same
// machine; treat them as a relative signal, not an absolute throughput claim.
import { Evaluator, evalTemplate } from "../src/index.js";

const CASES = [
	{ name: "arithmetic chain", expr: "1 + 2 * 3 - 4 / 2 + 5 % 3", context: {} },
	{ name: "variable lookup", expr: "a + b + c", context: { a: 1, b: 2, c: 3 } },
	{ name: "comparison/logical", expr: "a > b && b < c || a === 1", context: { a: 1, b: 2, c: 3 } },
	{ name: "member access", expr: "user.name + user.age", context: { user: { name: "Ada", age: 36 } } },
	{ name: "computed member", expr: "obj['a'] + obj['b'] + obj['c']", context: { obj: { a: 1, b: 2, c: 3 } } },
	{ name: "array literal", expr: "[1, 2, 3, 4, 5]", context: {} },
	{ name: "array map/reduce", expr: "[1,2,3,4,5].map(v => v * 2).reduce((acc, v) => acc + v, 0)", context: {} },
	{ name: "object literal", expr: "({ x: 1, y: 2, z: a + b })", context: { a: 1, b: 2 } },
	{ name: "Math calls", expr: "Math.max(1, 2, 3) + Math.min(a, b)", context: { a: 5, b: 9 } },
	{ name: "string concat", expr: "'a' + b + 'c' + d", context: { b: "x", d: "y" } },
	{ name: "string method", expr: "name.toUpperCase() + '!'", context: { name: "ada" } },
	{ name: "template literal", expr: "`Hello ${name}, you are ${age}`", context: { name: "Ada", age: 36 } },
	{ name: "conditional", expr: "a > b ? a - b : b - a", context: { a: 10, b: 4 } },
	{ name: "nested member", expr: "data.items[0].value + data.items[1].value", context: { data: { items: [{ value: 1 }, { value: 2 }] } } },
	{ name: "big mixed", expr: "users.filter(u => u.active).map(u => u.age).reduce((a, b) => a + b, 0)", context: { users: [{ active: true, age: 30 }, { active: false, age: 40 }, { active: true, age: 25 }] } },
	{ name: "regex literal test", expr: "/^[a-z]+$/.test(name)", context: { name: "ada" } },
	{ name: "regex literal replace", expr: "text.replace(/o/g, '0')", context: { text: "hello world" } },
];

const TEMPLATE_CASE = {
	name: "evalTemplate (10 exprs)",
	template: Array.from({ length: 10 }, (_, i) => `{{ a + ${i} }}`).join(" "),
	context: { a: 1 },
};

function bench(fn, iterations) {
	// Warm up so JIT compilation is not measured.
	for (let i = 0; i < Math.min(iterations, 2000); i++) fn();
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) fn();
	const end = process.hrtime.bigint();
	const nsPerOp = Number(end - start) / iterations;
	return nsPerOp;
}

function format(nsPerOp) {
	const opsPerSec = 1e9 / nsPerOp;
	return `${nsPerOp.toFixed(0).padStart(8)} ns/op   ${Math.round(opsPerSec).toLocaleString("en-US").padStart(12)} ops/s`;
}

const iterations = Number(process.env.BENCH_ITERATIONS ?? 200000);
const json = process.argv.includes("--json");
const results = [];

for (const testCase of CASES) {
	const evaluator = new Evaluator(testCase.context);
	const fn = () => evaluator.evaluate(testCase.expr);
	bench(fn, Math.min(iterations, 20000)); // warm up JIT
	const nsPerOp = bench(fn, iterations);
	results.push({ name: testCase.name, nsPerOp });
	if (!json) console.log(`${testCase.name.padEnd(20)} ${format(nsPerOp)}`);
}

{
	const fn = () => evalTemplate(TEMPLATE_CASE.template, TEMPLATE_CASE.context);
	bench(fn, 5000);
	const nsPerOp = bench(fn, Math.min(iterations, 50000));
	results.push({ name: TEMPLATE_CASE.name, nsPerOp });
	if (!json) console.log(`${TEMPLATE_CASE.name.padEnd(20)} ${format(nsPerOp)}`);
}

if (json) {
	console.log(JSON.stringify(results, null, 2));
}
