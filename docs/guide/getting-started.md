# Getting started

## Install

```sh
npm install ecma-evaluator
```

## Evaluate an expression

Pass an expression and, optionally, an object containing its variables:

```js
import { evalExpression } from "ecma-evaluator";

evalExpression("price * quantity", { price: 12, quantity: 3 }); // 36
evalExpression("Math.max(2, 5, 3)"); // 5
```

## Render a template

Use `{{ }}` to interpolate expressions:

```js
import { evalTemplate } from "ecma-evaluator";

evalTemplate("Hello {{ name }}!", { name: "World" }); // "Hello World!"
```

## Security

The evaluator supports expressions, not arbitrary JavaScript statements. It does not expose `eval()` or the `Function` constructor, and blocks mutating methods. See the [project README](https://github.com/axetroy/ecma-evaluator#security-features) for details.

Try expressions in the [playground](/#playground).
