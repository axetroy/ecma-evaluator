import test, { before } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, "..");

before(() => {
	execSync("pnpm run build", {
		cwd: rootDir,
		stdio: "inherit",
	});
});

// Run the fixture entry file directly instead of through `npm run`. npm
// prepends a banner whose wording varies by npm version, which made the old
// snapshot brittle. The fixture still resolves `ecma-evaluator` through its own
// node_modules, so this exercises the built `exports` map end to end.
function runFixture(dir, file) {
	const targetDir = path.join(rootDir, "fixtures", dir);

	execSync("pnpm install", { cwd: targetDir, stdio: "inherit" });

	const output = execSync(`node ${file}`, {
		cwd: targetDir,
		stdio: "pipe",
		env: {
			PATH: process.env.PATH,
			NO_COLOR: "1",
		},
	});

	return output.toString().trim();
}

test("test esm output", () => {
	assert.equal(runFixture("esm", "index.mjs"), "[Function: evalExpression] [Function: evalTemplate]");
});

test("test cjs output", () => {
	assert.equal(runFixture("cjs", "index.cjs"), "[Function: evalExpression] [Function: evalTemplate]");
});
