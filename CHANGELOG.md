# ecma-evaluator

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
