export type TemplateToken = {
	type: "text" | "expression";
	value: string;
	start: number;
	end: number;
	// Optional: the position of the content inside expression tokens
	contentStart?: number;
	contentEnd?: number;
};

export interface TemplateParserOptions {
	preserveWhitespace?: boolean;
	expressionStart?: string;
	expressionEnd?: string;
	/** Maximum template length in UTF-16 code units. @default 100000 */
	maxTemplateLength?: number;
	/** Maximum parsed token count. @default 1000 */
	maxTokens?: number;
	/** Maximum evaluated expressions in evalTemplate. @default 100 */
	maxExpressions?: number;
	/** Maximum expression length in evalTemplate. @default 10000 */
	maxExpressionLength?: number;
	/** Maximum AST node visits per expression in evalTemplate. @default 10000 */
	maxEvaluationSteps?: number;
	/** Maximum output length in UTF-16 code units. @default 100000 */
	maxOutputLength?: number;
}

export class TemplateParser {
	constructor(options?: TemplateParserOptions);

	/**
	 * 解析模板字符串为 token 数组
	 */
	parse(template: string): TemplateToken[];

	/**
	 * 静态方法：快速解析模板
	 */
	static parse(template: string, options?: TemplateParserOptions): TemplateToken[];
}
