# ecma-evaluator

## 2.1.1

### Patch Changes

- c378400: Speed up the evaluation hot path (no API change).

  - Cache parsed ASTs in a bounded, module-level cache. acorn parsing dominated the
    runtime of a short expression; repeated expressions (templates, repeated rules)
    no longer re-parse on every call.
  - Skip `structuredClone` for primitive results, which cost ~300ns per call even
    for a number. Object and array results are still deep-cloned.
  - Skip the `assertBoundedData` traversal for primitive values.
  - Merge the two-level `visit`/`visitNode` dispatch into a single method.
  - Reuse a shared, frozen default context instead of cloning an empty object on
    every construction. The one-shot `evalExpression('1 + 2')` path no longer pays
    for a `structuredClone` of nothing; caller-supplied contexts are still
    validated and cloned.

  Measured ~10-15x faster on simple expressions and ~3-5x on array/object-heavy
  expressions versus the previous release. Run `pnpm run bench` for the case
  breakdown, or `node benchmark/ab.mjs` for a before/after comparison against a
  git revision.

- 7aee22b: Harden the sandbox and fix cross-runtime correctness issues (no API change).

  - Screen regex patterns for catastrophic backtracking. Regex literals and
    `RegExp(...)` / `new RegExp(...)` constructions are rejected when they match
    the classic exponential shapes (`(a+)+`, `(a\d+)*`, `(a|ab)+`, ...). The same
    screen runs at the call site, closing paths that bypass construction: a
    `RegExp` supplied in the evaluation context, a string argument to
    `String.prototype.match`/`matchAll`/`search` (compiled internally by the host),
    and the `RegExp.prototype[Symbol.*]` methods. This is a conservative static
    heuristic, not a proof, but it removes the demonstrated event-loop-blocking
    exploit class.
  - Bound regex-pattern `replace`/`replaceAll` output before it is built. A
    `$&`-style replacement was only rejected for string patterns, so
    `"a".repeat(1e5).replace(/a/g, "$&".repeat(1000))` allocated the whole expanded
    string natively (~600 MB) and could exhaust the heap before the post-hoc length
    check ran. The expansion guard now covers RegExp patterns and the match count
    is computed up front for both.
  - Fix a cross-runtime bug in the `Error.prepareStackTrace` guard. On runtimes
    that leave `Error.prepareStackTrace` undefined (Node 18 and 24), the bare
    identity test also matched an `undefined` callee, so calling a non-function
    reported `Error.prepareStackTrace is not allowed` instead of
    `<callee> is not a function`.
  - Reset per-evaluation resource budgets through a single `resetBudget()` and key
    the `execute()` re-entry guard on an `evaluating` flag. Previously a thrown
    step limit left `remainingEvaluationSteps` at `-1`, which defeated the `=== 0`
    guard on a subsequent direct `execute()` call.
  - Build the shared sandbox global scope lazily and memoise it, so importing the
    module has no side effect and `sideEffects: false` holds exactly.
  - Fix `exports` condition ordering (`types` before `default`) so TypeScript
    resolves the declarations under `moduleResolution: node16`/`bundler`.

## 2.1.0

### Minor Changes

- 46c2a4c: Harden the sandbox and fix correctness issues found in an audit.

  Security

  - Bound every typed array, including `Float16Array` (previously unbounded).
  - Block the `%TypedArray%.prototype` mutators (`fill`, `reverse`, `sort`, `set`, `copyWithin`) that the own-property walk missed for all typed arrays.
  - Block `Object.create`, closing an arbitrary-prototype vector.
  - Add an interpreter recursion-depth limit (`maxDepth`, default `1000`) and convert parser stack overflows into `SyntaxError: Expression nesting is too deep to parse`.
  - Bound `RegExp` source (`1000`) and flags (`32`) length.
  - Switch exposed globals to an allowlist and withhold `WeakRef`, `FinalizationRegistry`, `Iterator`, `escape`, `unescape`, and `SharedArrayBuffer`.

  Fixes

  - Reading a missing property of a null-prototype object no longer throws a misleading "prototype properties" error.
  - `getNodeString` no longer crashes on array holes (e.g. `[1,,2].x()`).
  - Templates now recognize regex literals, so `{{ /a}}b/ }}` parses correctly.

  Other

  - Cache the static global scope instead of rebuilding it per `Evaluator` instance.
  - Run `.mjs` tests in CI, replace the brittle npm-banner dist snapshot, and add `engines.node >= 18`.

## 2.0.10

### Patch Changes

- fca93d9: release
