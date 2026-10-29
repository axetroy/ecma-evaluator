# ecma-evaluator

[![Badge](https://img.shields.io/badge/link-996.icu-%23FF4D5B.svg?style=flat-square)](https://996.icu/#/en_US)
[![LICENSE](https://img.shields.io/badge/license-Anti%20996-blue.svg?style=flat-square)](https://github.com/996icu/996.ICU/blob/master/LICENSE)
![Node](https://img.shields.io/badge/node-%3E=14-blue.svg?style=flat-square)
[![npm version](https://badge.fury.io/js/ecma-evaluator.svg)](https://badge.fury.io/js/ecma-evaluator)

A tiny, fast, and **secure** JavaScript expression evaluator for safely evaluating expressions and template strings in a sandboxed environment.

English | [简体中文](./README.zh-CN.md)

## Features

- Sandboxed evaluation without `eval()` or `Function()`
- Supports JavaScript expressions and `{{ }}` templates
- TypeScript definitions included

## Installation

```bash
npm install ecma-evaluator
```

## Quick Start

```js
import { evalExpression, evalTemplate } from "ecma-evaluator";

evalExpression("a + b * c", { a: 1, b: 2, c: 3 }); // 7
evalTemplate("Hello {{ name }}!", { name: "World" }); // "Hello World!"
```

## Documentation

- [Getting started](/guide/getting-started)
- [API, supported features, security, and usage reference](/guide/reference)
- [Online playground](https://axetroy.github.io/ecma-evaluator/#playground)

See the [documentation site](https://axetroy.github.io/ecma-evaluator/).
