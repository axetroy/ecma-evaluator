# API 参考

本页说明公开 API 契约。请先阅读[快速开始](/zh-CN/guide/getting-started)，或查看[支持语法与安全边界](/zh-CN/guide/language)。

## 导出项

| 导出项 | 用途 |
| --- | --- |
| `evalExpression` | 求值表达式或表达式序列 |
| `evalTemplate` | 求值文本模板中的定界表达式 |
| `Evaluator` | 复用已克隆的上下文并配置表达式长度限制 |
| `TemplateParser` | 将模板解析为文本和表达式 token |

## `evalExpression(expression, context?)`

```js
import { evalExpression } from "ecma-evaluator";

evalExpression("price * quantity", { price: 12, quantity: 3 }); // 36
evalExpression("1 + 1; 2 + 3"); // 5（最后一个表达式的结果）
```

-   `expression`（`string`，必填）：表达式或以分号分隔的表达式序列。默认最大长度为 10,000 个 UTF-16 代码单元。
-   `context`（`unknown`，可选）：不含可枚举访问器属性的可结构化克隆数据。其自有数据属性可作为标识符使用。求值器会先校验再克隆，不会调用 getter。

**返回值：** 最后一个表达式的求值结果，返回前会进行克隆。结果可以是原始值或可克隆数据。`undefined` 是有效结果；函数、Promise、Symbol 和其他不可克隆的值会被拒绝。

**异常：** 表达式不是字符串或操作无效时抛出 `TypeError`；语法无效/不受支持或表达式超过长度限制时抛出 `SyntaxError`；引用未定义标识符时抛出 `ReferenceError`；上下文/结果未通过克隆或安全检查时抛出错误。

## `evalTemplate(template, context?, templateParserOptions?)`

```js
import { evalTemplate } from "ecma-evaluator";

evalTemplate("你好，{{ name }}！", { name: "小明" }); // "你好，小明！"
evalTemplate("{{ missing }}", {}); // "undefined"
```

-   `template`（`string`，必填）：模板文本。传入非字符串时抛出 `TypeError`。
-   `context`（`unknown`，可选）：可结构化克隆的数据，其自有属性可供模板表达式使用。求值器会克隆该值。
-   `templateParserOptions`（对象，可选）：定界符和资源限制选项，详见 [`TemplateParser`](#templateparser)。

默认限制为：模板 100,000 个代码单元、1,000 个 token、100 个表达式、单条表达式 10,000 个代码单元、每条表达式 10,000 次 AST 访问、输出 100,000 个代码单元。硬上限分别为：模板/输出 1,000,000、token 10,000、表达式 1,000、单条表达式/AST 访问 100,000。

**返回值：** 字符串。表达式结果按 JavaScript 字符串拼接语义转换；例如数组会变成逗号分隔文本，普通对象会变成 `"[object Object]"`。

**异常：** 除未定义标识符对应的 `ReferenceError` 会被转换为字面文本 `"undefined"` 外，其他求值错误都会抛出。不可克隆的上下文会在求值前被拒绝。

## `TemplateParser`

可以使用实例方法或静态方法解析模板：

```js
import { TemplateParser } from "ecma-evaluator";

const tokens = TemplateParser.parse("你好，{{ name }}！");
```

每个 token 包含 `type`（`"text"` 或 `"expression"`）、`value` 和 `start`/`end` 偏移量。偏移量从 0 开始，按 UTF-16 代码单元计数；`end` 不包含在范围内。表达式 token 还包含 `contentStart` 和 `contentEnd`，表示定界符内表达式内容的范围。

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `expressionStart` | `string` | 左双花括号 | 开始定界符 |
| `expressionEnd` | `string` | 右双花括号 | 结束定界符 |
| `preserveWhitespace` | `boolean` | `false` | 在 token 的 `value` 中保留表达式两侧空白 |
| `maxTemplateLength` | `number` | `100000` | 模板最大长度（硬上限 `1000000`） |
| `maxTokens` | `number` | `1000` | token 数量上限（硬上限 `10000`） |
| `maxExpressions` | `number` | `100` | `evalTemplate` 的表达式数量上限（硬上限 `1000`） |
| `maxExpressionLength` | `number` | `10000` | 单条表达式长度（硬上限 `100000`） |
| `maxEvaluationSteps` | `number` | `10000` | 每条表达式的 AST 访问次数（硬上限 `100000`） |
| `maxOutputLength` | `number` | `100000` | 输出长度上限（硬上限 `1000000`） |

`TemplateParser.parse(template, options?)` 在 `template` 不是字符串时抛出 `TypeError`。默认会忽略空表达式。含有内容但未闭合的表达式会作为文本保留，不会向宿主控制台写日志。

## `Evaluator`

```js
import { Evaluator } from "ecma-evaluator";

const evaluator = new Evaluator({ price: 12, quantity: 3 }, { maxInputLength: 20000 });
evaluator.evaluate("price * quantity"); // 36
Evaluator.evaluate("1 + 1"); // 2
```

-   `new Evaluator(variables?, options?)`：先校验再克隆 `variables`（默认为空对象），上下文必须受 `structuredClone` 支持且不能含可枚举访问器属性。
-   `options.maxInputLength`（`number`，默认 `10000`）：该实例允许的最大表达式长度，单位为 UTF-16 代码单元（硬上限 `100000`）。
-   `options.maxEvaluationSteps`（`number`，默认 `10000`）：每次求值的 AST 节点访问次数上限（硬上限 `100000`）。
-   `evaluator.evaluate(expression)`：使用实例上下文和选项求值。
-   `Evaluator.evaluate(expression, variables?)`：使用默认选项的静态便捷方法。

两种方法均返回最后一个表达式的克隆结果，并抛出与 `evalExpression` 相同类别的异常。静态方法不接受选项参数。

上下文和结果还受以下限制：单个字符串最多 100,000 个代码单元，估算数据量合计最多 1,000,000 字节，数组/集合最多 10,000 项，数据节点最多 100,000 个。ArrayBuffer 和类型化数组最多 1,000,000 字节。正则表达式可用且没有执行时间上限；病态正则可能阻塞主线程。

## TypeScript

该包包含类型声明。`evalExpression` 默认返回类型为 `unknown`；泛型仅为编译期声明，不会在运行时校验结果。

```ts
import { evalExpression, evalTemplate } from "ecma-evaluator";

const total = evalExpression<number>("price * quantity", { price: 12, quantity: 3 });
const options = { expressionStart: "${", expressionEnd: "}" };
const message: string = evalTemplate("你好，${ name }！", { name: "小明" }, options);
```
