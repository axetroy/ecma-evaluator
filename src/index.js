import { Evaluator } from "./Evaluator.js";
import { TemplateParser } from "./TemplateParser.js";

export { Evaluator, TemplateParser };

const DEFAULT_MAX_TEMPLATE_EXPRESSIONS = 100;
const MAX_TEMPLATE_EXPRESSIONS = 1000;
const DEFAULT_MAX_TEMPLATE_OUTPUT_LENGTH = 100000;
const MAX_TEMPLATE_OUTPUT_LENGTH = 1000000;

function validateLimit(value, name, defaultValue, maximum) {
	if (value === undefined) {
		return defaultValue;
	}
	if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
		throw new RangeError(`${name} must be an integer between 1 and ${maximum}`);
	}
	return value;
}

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
	const options = templateParserOptions ?? {};
	const maxExpressions = validateLimit(options.maxExpressions, "maxExpressions", DEFAULT_MAX_TEMPLATE_EXPRESSIONS, MAX_TEMPLATE_EXPRESSIONS);
	const maxOutputLength = validateLimit(options.maxOutputLength, "maxOutputLength", DEFAULT_MAX_TEMPLATE_OUTPUT_LENGTH, MAX_TEMPLATE_OUTPUT_LENGTH);
	const tokens = TemplateParser.parse(template, options);
	let result = "";
	let expressionCount = 0;

	// Reuse a single Evaluator instance for every expression in the template.
	// `Evaluator.evaluate` builds a new instance per call, cloning the whole
	// context via structuredClone for each expression - wasteful when a
	// template contains many expressions. Reusing one instance is safe here:
	// evaluate() never mutates the scope chain outside its own call (arrow
	// function scopes are pushed and popped in a finally block), and closures
	// cannot escape because the cloneable-return gate rejects them.
	const evaluator = new Evaluator(context, {
		maxInputLength: options.maxExpressionLength,
		maxEvaluationSteps: options.maxEvaluationSteps,
	});

	const typeHandler = {
		text: (token) => token.value,
		expression: (token) => {
			try {
				return evaluator.evaluate(token.value);
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

	for (const token of tokens) {
		// Unknown token type, treat as text
		const handler = typeHandler[token.type] ?? typeHandler["text"];
		if (token.type === "expression") {
			expressionCount++;
			if (expressionCount > maxExpressions) {
				throw new RangeError(`Template exceeds the maximum expression count of ${maxExpressions}`);
			}
		}

		const chunk = String(handler(token));
		if (result.length + chunk.length > maxOutputLength) {
			throw new RangeError(`Template output exceeds the maximum length of ${maxOutputLength} characters`);
		}
		result += chunk;
	}

	return result;
}
