# AGENTS.md

Repository-specific notes for `ecma-evaluator`, a sandboxed JavaScript
expression evaluator built on acorn.

## Commands

- `pnpm run test` — `node --test` (239 tests). The runner's default discovery
  picks up every `*.test.js` / `*.test.mjs` under the workspace, including
  `test/dist.test.js`, which runs `pnpm run build` and the `fixtures/`
  package-resolution checks in a `before` hook. Do NOT use an explicit glob
  (`node --test "**/*.test.{js,mjs}"`): brace expansion in the glob is only
  supported on Node 22+, so it silently finds nothing on Node 18/20 even though
  `engines.node` is `>=18`.
- `pnpm run typecheck` — `tsc --noEmit`. Only sees the hand-written `src/*.d.ts`
  (the `.js` files are never type-checked), so it catches `.d.ts` drift but not
  type errors in the implementation.
- `pnpm run build` — `knip && rslib build`. `knip` fails the build on unused
  files/exports, so any new top-level script (e.g. under `benchmark/`) must be
  added to `knip.json` `ignore` or it breaks CI.
- `pnpm run lint:publish` — `publint`. `pnpm run lint:types` — `attw --pack .`.
  Both validate the published `exports`/types wiring against the built `dist/`
  (run `pnpm run build` first; `attw --pack` packs the tarball).
- `pnpm run bench` — `node benchmark/index.mjs` (per-case ns/op).
- `node benchmark/ab.mjs [git-ref]` — before/after comparison; materializes the
  baseline `src/Evaluator.js` from git into `benchmark/.baseline.generated.mjs`
  (git-ignored) and imports it. Both sides are warmed together and the timed
  runs are interleaved, with the median of `AB_RUNS` (default 7) samples per
  case; running one side fully before the other lets JIT/GC drift bias whichever
  side goes second. Tune with `AB_ITERATIONS` / `AB_RUNS`.

## Architecture

- `src/Evaluator.js` — the interpreter. `parseExpression` (bounded FIFO AST
  cache) → `evaluate()` → `execute()` → `visit(node)` (single switch dispatch).
  The AST is treated as immutable, which is what makes the shared parse cache
  safe across instances.
- `src/index.js` — package entry: `evalExpression`, `evalTemplate` (reuses one
  `Evaluator` across a template's expressions).
- `src/block.js` — the mutable-method blocklist.
- `src/regExpSafety.js` — a conservative static screen for catastrophic
  backtracking. `isUnsafeRegExpPattern(pattern)` is called on every regex
  literal, on every `RegExp(...)` / `new RegExp(...)` construction, and at the
  call site (`assertSafeRegExpInvocation`) for the paths that bypass
  construction: a `RegExp` from the context, a string argument to
  `match`/`matchAll`/`search`, and the `RegExp.prototype[Symbol.*]` methods. It
  detects two shapes: an unbounded quantifier over a body that itself contains
  an unbounded quantifier (`(a+)+`), and an unbounded quantifier over an
  alternation whose branches overlap — either as textual prefixes (`(a|ab)+`)
  or through a shared first character (`(a|.)+`, `([ab]|a)+`, `(\w|a)+`). It is
  a heuristic, not a proof: it does not catch polynomial blowup from *adjacent*
  unbounded quantifiers (`.*.*x` is quadratic), so it must not be treated as a
  hard time bound. Verified safe patterns are memoised in
  `SAFE_REGEXP_PATTERNS` (bounded FIFO) so a repeated literal is screened once.
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
  ArrayBuffer sizes. Per-evaluation budgets are reset by `resetBudget()` at the
  start of every `evaluate()` (and by a direct `execute()` call when not already
  inside an evaluation); a thrown limit must never leave a stale counter.
- Regex catastrophic backtracking is screened statically (`regExpSafety.js`)
  both before a pattern is constructed and again at the call site, because a
  pattern can reach a native method without passing construction (a context
  `RegExp`, or a string argument to `match`/`matchAll`/`search`). It covers
  nested quantifiers, overlapping alternations, and adjacent overlapping
  quantifiers. This is a heuristic, not a hard time bound: execution itself
  still has no time limit, so do not evaluate untrusted patterns on a
  latency-sensitive thread.
- `replace`/`replaceAll` reject `$&`-style replacements (for string *and* RegExp
  patterns) and bound the match count up front, because the native engine builds
  the whole expanded string before any post-hoc length check — a
  `$&`-amplification pattern otherwise exhausts the heap.
- `Error.prepareStackTrace` is guarded with `typeof func === "function" &&
  func === Error.prepareStackTrace`. The `typeof` half is load-bearing: on
  runtimes that leave `Error.prepareStackTrace` undefined (Node 18, 24) a bare
  identity test also matches an `undefined` non-function callee.

## CI

- `.github/workflows/build.yml` — tests on Node 18/20/22 across
  ubuntu/macOS/windows, then runs `typecheck` and (on the Node 22 Linux leg)
  `publint` + `arethetypeswrong`.
- `publish.yml` — changesets release on `master` (Node 24).
- `deploy-docs.yml` — VitePress build/deploy on `master`.
- The matrix is what keeps `engines.node` (`>=18`) honest; keep at least Node 18
  in it, since Node 18 vs 20/24 differences have already produced real bugs
  (the `Error.prepareStackTrace` case above).

## Style

- Tabs for indentation, double quotes, semicolons. No ESLint/Prettier/Biome —
  only `.editorconfig`.
