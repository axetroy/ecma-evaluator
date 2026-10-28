---
layout: home

hero:
  name: ecma-evaluator
  text: Safe JavaScript expressions
  tagline: A tiny, fast evaluator for expressions and templates — without eval().
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/axetroy/ecma-evaluator

features:
  - title: Secure by design
    details: Evaluate expressions in a restricted environment without exposing eval() or Function().
  - title: Simple API
    details: Evaluate expressions and templates with a plain JavaScript context object.
  - title: Lightweight
    details: Uses Acorn to parse expressions and has no runtime code-generation step.
---

## Playground {#playground}

Try an expression or template in your browser. The editor uses the same evaluator as the package.

<Playground locale="en" />
