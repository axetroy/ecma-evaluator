# API Reference

This page documents the public API contract. Start with the [getting started guide](/guide/getting-started), or read about [supported syntax and security boundaries](/guide/language).

## Exports

| Export | Purpose |
| --- | --- |
| `evalExpression` | Evaluate an expression or expression sequence |
| `evalTemplate` | Evaluate delimited expressions in a text template |
| `Evaluator` | Reuse a cloned context and configure the expression length limit |
| `TemplateParser` | Parse templates into text and expression tokens |

## `evalExpression(expression, context?)`

```js
import { evalExpression } from "ecma-evaluator";

evalExpression("price * quantity", { price: 12, quantity: 3 }); // 36
evalExpression("1 + 1; 2 + 3"); // 5 (the last expression's result)
```

-   `expression` (`string`, required): Expression or semicolon-separated expression sequence. Maximum length is 10,000 UTF-16 code units by default.
-   `context` (`unknown`, optional): Cloneable data. Its own properties are available as identifiers. The evaluator clones it and does not mutate the caller's value.

**Returns:** The last expression's result, cloned before it is returned. The result may be a primitive or cloneable data. `undefined` is valid; functions, promises, symbols, and other non-cloneable values are rejected.

**Throws:** `TypeError` for a non-string expression or invalid operations; `SyntaxError` for invalid/unsupported syntax or an expression over the length limit; `ReferenceError` for an undefined identifier; and an error when context/result cloneability or security checks fail.

## `evalTemplate(template, context?, templateParserOptions?)`

```js
import { evalTemplate } from "ecma-evaluator";

evalTemplate("Hello {{ name }}!", { name: "Ada" }); // "Hello Ada!"
evalTemplate("{{ missing }}", {}); // "undefined"
```

-   `template` (`string`, required): Template text. A non-string value throws `TypeError`.
-   `context` (`unknown`, optional): Cloneable data whose own properties are available to expressions. The evaluator clones it.
-   `templateParserOptions` (object, optional): Delimiter and whitespace options listed under [`TemplateParser`](#templateparser).

**Returns:** A string. Expression results are converted using JavaScript string-concatenation semantics; for example, an array becomes comma-separated text and a plain object becomes `"[object Object]"`.

**Throws:** Evaluation errors propagate, except an undefined-identifier `ReferenceError` is rendered as the literal text `"undefined"`. A non-cloneable context is rejected before evaluation.

## `TemplateParser`

Use the instance or static API to parse a template:

```js
import { TemplateParser } from "ecma-evaluator";

const tokens = TemplateParser.parse("Hello {{ name }}!");
```

Each token contains `type` (`"text"` or `"expression"`), `value`, and zero-based `start`/`end` offsets measured in UTF-16 code units. `end` is exclusive. Expression tokens also include `contentStart` and `contentEnd`, which mark the expression content inside the delimiters.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `expressionStart` | `string` | opening double brace | Opening delimiter |
| `expressionEnd` | `string` | closing double brace | Closing delimiter |
| `preserveWhitespace` | `boolean` | `false` | Keep whitespace around the expression in its token value |

`TemplateParser.parse(template, options?)` throws `TypeError` if `template` is not a string. Empty expressions are omitted by default. An unclosed expression with content is kept as text and emits `console.warn`.

## `Evaluator`

```js
import { Evaluator } from "ecma-evaluator";

const evaluator = new Evaluator({ price: 12, quantity: 3 }, { maxInputLength: 20000 });
evaluator.evaluate("price * quantity"); // 36
Evaluator.evaluate("1 + 1"); // 2
```

-   `new Evaluator(variables?, options?)`: Clones `variables` (default: an empty object). The context must be supported by `structuredClone`.
-   `options.maxInputLength` (`number`, default `10000`): Maximum expression length in UTF-16 code units for this instance.
-   `evaluator.evaluate(expression)`: Evaluates with the instance context and options.
-   `Evaluator.evaluate(expression, variables?)`: Static convenience method using default options.

Both methods return the cloned result of the last expression and throw the same classes of errors as `evalExpression`. The static method does not accept an options argument.

## TypeScript

The package includes declarations. `evalExpression` defaults to `unknown`; its generic type parameter is a compile-time assertion and does not validate the runtime result.

```ts
import { evalExpression, evalTemplate } from "ecma-evaluator";

const total = evalExpression<number>("price * quantity", { price: 12, quantity: 3 });
const options = { expressionStart: "${", expressionEnd: "}" };
const message: string = evalTemplate("Hello ${ name }!", { name: "Ada" }, options);
```
