---
"ecma-evaluator": patch
---

Speed up the evaluation hot path (no API change).

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
