import { Evaluator } from "./Evaluator.js";
import { TemplateParser } from "./TemplateParser.js";

export { Evaluator, TemplateParser };

/**
 * Evaluates a JavaScript expression with an optional context.
 * @param {string} expression - The JavaScript expression to evaluate
 * @param {unknown} [context] - Optional context object with variables to use in the expression
 * @returns {*} The result of evaluating the expression
 * @example
 * evalExpression('a + b', { a: 1, b: 2 }) // returns 3
 */
export function evalExpression(expression, context) {
	return Evaluator.evaluate(expression, context);
}

/**
 * Evaluates a template string by replacing {{ expression }} patterns with their evaluated values.
 * Undefined variables in expressions are replaced with empty strings instead of throwing errors.
 * @param {string} template - The template string containing {{ expression }} patterns
 * @param {Object} [context] - Optional context object with variables to use in expressions
 * @param {Object} [templateParserOptions] - Optional options for the template parser
 * @returns {string} The template with all expressions evaluated and replaced
 * @example
 * evalTemplate('Hello {{ name }}!', { name: 'World' }) // returns 'Hello World!'
 */
export function evalTemplate(template, context, templateParserOptions) {
	let result = "";

	const typeHandler = {
		text: (token) => token.value,
		expression: (token) => {
			try {
				return Evaluator.evaluate(token.value, context);
			} catch (error) {
				// Replace undefined variables with empty string for graceful degradation
				if (error instanceof ReferenceError && error.message.endsWith("is not defined")) {
					return "undefined";
				} else {
					throw error;
				}
			}
		},
	};

	for (const token of TemplateParser.parse(template, templateParserOptions)) {
		// Unknown token type, treat as text
		const handler = typeHandler[token.type] ?? typeHandler["text"];

		result += handler(token);
	}

	return result;
}
