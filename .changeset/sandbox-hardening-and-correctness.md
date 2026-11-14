---
"ecma-evaluator": patch
---

Harden the sandbox and fix cross-runtime correctness issues (no API change).

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
