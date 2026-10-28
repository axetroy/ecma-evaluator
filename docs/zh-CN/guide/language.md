# 语言与安全边界

本页介绍支持的表达式语法和运行时边界。函数签名、参数、返回值和异常请参阅[API 参考](/zh-CN/guide/reference)。

## 支持的表达式

求值器接受表达式和以分号分隔的表达式序列，并返回最后一个表达式的结果。

| 类别 | 示例 |
| --- | --- |
| 字面量和数据 | 数字、字符串、布尔值、`null`、`undefined`、数组和加括号的对象字面量 |
| 运算符 | 算术、比较、相等、逻辑、空值合并、位运算、一元和三元运算符 |
| 属性访问 | 点号访问、计算属性访问和可选链 |
| 函数 | 箭头函数，以及对已开放函数/方法的调用 |
| 其他表达式 | 模板字面量，以及对已开放构造函数的 `new` 表达式 |

```js
import { evalExpression } from "ecma-evaluator";

evalExpression("({ price: 12, quantity: 3 }).price * 3"); // 36
evalExpression("user?.name ?? 'Anonymous'", { user: null }); // "Anonymous"
evalExpression("[1, 2, 3].map(value => value * 2)"); // [2, 4, 6]
```

不支持 `if`、`for`、`const`、函数声明等语句和声明，也不支持赋值、`delete`、`await`、导入和函数表达式。

## 内置对象

沙箱开放一组受限内置对象，包括 `Math`、`Number`、`String`、`Boolean`、`Array`、`Object`、`Map`、`Set`、`Date`、`JSON`、`RegExp`、部分类型化数组和标准错误构造函数，也开放常用数值及 URI 辅助函数。具体可用项可能受宿主运行时影响。

沙箱不开放 `Promise`、`Function`、`eval`、`process`、`require`、浏览器全局对象以及文件/网络 API。`WeakMap` 和 `WeakSet` 实例不能通过结构化克隆边界；`Symbol` 值也不能通过该边界传递。

## 副作用与数据

求值器会阻止数组、对象、集合、日期、类型化数组和部分 Web API 的可变方法，例如 `array.push(...)`、`map.set(...)` 和 `date.setTime(...)`。对象/原型变更及原型属性访问也受到限制。

求值前会克隆上下文，返回前会克隆结果；两者都必须受 `structuredClone` 支持。函数、Promise、DOM 节点、弱集合和 Symbol 不能作为上下文值传入或作为结果返回。求值器不是通用 JavaScript 隔离边界；请将其用于受限表达式求值，并妥善处理用户输入导致的异常。

## 异常

语法无效或不受支持、标识符未定义、操作无效、调用被阻止的方法或数据不可克隆，都可能导致求值抛出异常。`evalTemplate` 会将未定义标识符对应的 `ReferenceError` 转成字面文本 `"undefined"`；其他求值错误会继续抛出。详见 [API 异常说明](/zh-CN/guide/reference#错误处理)。
