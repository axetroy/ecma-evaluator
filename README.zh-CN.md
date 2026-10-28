# ecma-evaluator

[![Badge](https://img.shields.io/badge/link-996.icu-%23FF4D5B.svg?style=flat-square)](https://996.icu/#/zh_CN)
[![LICENSE](https://img.shields.io/badge/license-Anti%20996-blue.svg?style=flat-square)](https://github.com/996icu/996.ICU/blob/master/LICENSE)
![Node](https://img.shields.io/badge/node-%3E=14-blue.svg?style=flat-square)
[![npm version](https://badge.fury.io/js/ecma-evaluator.svg)](https://badge.fury.io/js/ecma-evaluator)

一个小巧、快速且**安全**的 JavaScript 表达式求值器，用于在沙箱环境中安全地执行表达式和模板字符串。

[English](./README.md) | 简体中文

## 特性

- 沙箱环境执行，不使用 `eval()` 或 `Function()`
- 支持 JavaScript 表达式及 `{{ }}` 模板
- 内置 TypeScript 类型定义

## 安装

```bash
npm install ecma-evaluator
```

## 快速开始

```js
import { evalExpression, evalTemplate } from "ecma-evaluator";

evalExpression("a + b * c", { a: 1, b: 2, c: 3 }); // 7
evalTemplate("你好，{{ name }}！", { name: "世界" }); // "你好，世界！"
```

## 文档

- [快速开始](/zh-CN/guide/getting-started)
- [API、支持的特性、安全性和使用说明](/zh-CN/guide/reference)
- [在线体验](/zh-CN/#playground)

也可以访问[文档网站](https://axetroy.github.io/ecma-evaluator/zh-CN/)。
