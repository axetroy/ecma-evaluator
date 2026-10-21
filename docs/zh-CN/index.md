---
layout: home

hero:
  name: ecma-evaluator
  text: 安全的 JavaScript 表达式
  tagline: 小巧快速的表达式与模板求值器，无需使用 eval()。
  actions:
    - theme: brand
      text: 快速开始
      link: /zh-CN/guide/getting-started
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/axetroy/ecma-evaluator

features:
  - title: 安全设计
    details: 在受限环境中执行表达式，不开放 eval() 或 Function()。
  - title: 简单 API
    details: 使用普通 JavaScript 上下文对象执行表达式和模板。
  - title: 轻量快速
    details: 使用 Acorn 解析表达式，无需运行时代码生成。
---

## 在线体验 {#playground}

在浏览器中试用表达式或模板。编辑器使用与 npm 包相同的求值器。

<Playground locale="zh-CN" />
