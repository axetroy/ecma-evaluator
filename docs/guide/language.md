# Language and Security

This page describes the expression syntax and runtime boundaries. For callable signatures, parameters, return values, and errors, see the [API reference](/guide/reference).

## Supported Expressions

The evaluator accepts expressions and semicolon-separated expression sequences. It returns the value of the last expression.

| Category | Examples |
| --- | --- |
| Literals and data | Numbers, strings, booleans, `null`, `undefined`, arrays, and parenthesized object literals |
| Operators | Arithmetic, comparison, equality, logical, nullish-coalescing, bitwise, unary, and ternary operators |
| Access | Dot access, computed access, and optional chaining |
| Functions | Arrow functions and calls to exposed functions/methods |
| Other expressions | Template literals and `new` expressions for exposed constructors |

```js
import { evalExpression } from "ecma-evaluator";

evalExpression("({ price: 12, quantity: 3 }).price * 3"); // 36
evalExpression("user?.name ?? 'Anonymous'", { user: null }); // "Anonymous"
evalExpression("[1, 2, 3].map(value => value * 2)"); // [2, 4, 6]
```

Statements and declarations such as `if`, `for`, `const`, and function declarations are not supported. Assignment, `delete`, `await`, imports, and function expressions are also unsupported.

## Built-ins

The sandbox exposes a restricted set of built-ins, including `Math`, `Number`, `String`, `Boolean`, `Array`, `Object`, `Map`, `Set`, `Date`, `JSON`, `RegExp`, selected typed arrays, and standard error constructors. It also exposes common numeric and URI helper functions. Availability can vary with the host runtime.

`Promise`, `Function`, `eval`, `process`, `require`, browser globals, and file/network APIs are not exposed. `WeakMap` and `WeakSet` instances cannot cross the structured-clone boundary. `Symbol` values likewise cannot be passed through that boundary.

## Side Effects and Data

The evaluator blocks mutating methods on arrays, objects, collections, dates, typed arrays, and selected web APIs. For example, calls such as `array.push(...)`, `map.set(...)`, and `date.setTime(...)` are rejected. Object/prototype mutation and prototype-property access are restricted as well.

The input context is cloned before evaluation, and the result is cloned before it is returned. Both must be supported by `structuredClone`; functions, promises, DOM nodes, weak collections, and symbols cannot be passed as context values or returned. The evaluator does not provide a general-purpose JavaScript isolation boundary; use it for constrained expression evaluation and handle failures from user-provided input.

## Errors

Invalid or unsupported syntax, unresolved identifiers, invalid operations, blocked methods, and uncloneable data can make evaluation throw. `evalTemplate` converts an undefined-identifier `ReferenceError` into the literal text `"undefined"`; other evaluation errors propagate. See [API error behavior](/guide/reference#error-handling).
