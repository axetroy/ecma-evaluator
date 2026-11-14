# AGENTS.md

Repository-specific notes for `ecma-evaluator`, a sandboxed JavaScript
expression evaluator built on acorn.

## Commands

- `pnpm run test` — `node --test "**/*.test.{js,mjs}"` (229 tests). Note the
  glob also picks up `test/dist.test.js`, which runs `pnpm run build` and the
  `fixtures/` package-resolution checks in a `before` hook.
- `pnpm run build` — `knip && rslib build`. `knip` fails the build on unused
  files/exports, so any new top-level script (e.g. under `benchmark/`) must be
  added to `knip.json` `ignore` or it breaks CI.
- `pnpm run bench` — `node benchmark/index.mjs` (per-case ns/op).
- `node benchmark/ab.mjs [git-ref]` — before/after comparison; materializes the
  baseline `src/Evaluator.js` from git into `benchmark/.baseline.generated.mjs`
  (git-ignored) and imports it.

## Architecture

- `src/Evaluator.js` — the interpreter. `parseExpression` (bounded FIFO AST
  cache) → `evaluate()` → `execute()` → `visit(node)` (single switch dispatch).
  The AST is treated as immutable, which is what makes the shared parse cache
  safe across instances.
- `src/index.js` — package entry: `evalExpression`, `evalTemplate` (reuses one
  `Evaluator` across a template's expressions).
- `src/block.js` — the mutable-method blocklist.
- `src/*.d.ts` — hand-written, checked into source and copied to `dist` by a
  custom rslib plugin. They are NOT generated from the JSDoc in the `.js`
  files, so the two can drift (e.g. the constructor JSDoc omits `maxDepth`,
  which the `.d.ts` documents). `tsc` only ever sees the `.d.ts` files.

## Security model (deliberate boundaries — do not "optimize" away)

- Contexts and results are deep-cloned (`structuredClone`) at the boundary so
  the sandbox never holds a live reference to host state and closures cannot
  escape. Primitive results skip the clone; a shared frozen `EMPTY_CONTEXT`
  skips it only for the default (no-context) construction.
- Budgets: input length, evaluation steps, recursion depth, data size/nodes,
  string length, array/collection entries, RegExp source/flags, typed-array and
  ArrayBuffer sizes.
- Known limitation (documented in `docs/guide/reference.md`): regex execution
  has NO time limit. A catastrophic-backtracking pattern (e.g.
  `/^(a+)+$/.test("aaaa…!")`) blocks the event loop — 12s+ for ~30 chars. Do
  not evaluate untrusted patterns on a latency-sensitive thread.

## CI

- `.github/workflows/build.yml` — tests on Node 22 across ubuntu/macOS/windows.
- `publish.yml` — changesets release on `master` (Node 24).
- `deploy-docs.yml` — VitePress build/deploy on `master`.
- Gaps: no `tsc --noEmit` step (so the hand-written `.d.ts` are never
  type-checked in CI), no `publint`/`arethetypeswrong` check of the published
  `exports` map, and `engines.node` is `>=18` while CI only exercises Node 22+.

## Style

- Tabs for indentation, double quotes, semicolons. No ESLint/Prettier/Biome —
  only `.editorconfig`.
