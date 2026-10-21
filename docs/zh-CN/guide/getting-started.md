# 快速开始

## 安装

```sh
npm install ecma-evaluator
```

## 执行表达式

传入表达式，以及可选的变量上下文对象：

```js
import { evalExpression } from "ecma-evaluator";

evalExpression("price * quantity", { price: 12, quantity: 3 }); // 36
evalExpression("Math.max(2, 5, 3)"); // 5
```

## 渲染模板

使用 `{{ }}` 插入表达式：

```js
import { evalTemplate } from "ecma-evaluator";

evalTemplate("你好，{{ name }}！", { name: "世界" }); // "你好，世界！"
```

## 安全性

求值器支持表达式，而不是任意 JavaScript 语句。它不开放 `eval()` 或 `Function` 构造函数，并会阻止可变方法。详情请参阅[项目 README](https://github.com/axetroy/ecma-evaluator#安全特性)。

也可以在[在线体验](/zh-CN/#playground)中试用表达式。
