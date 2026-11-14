export interface EvaluatorOptions {
	/**
	 * Maximum expression length in UTF-16 code units (hard maximum: 100000).
	 * @default 10000
	 */
	maxInputLength?: number;
	/**
	 * Maximum AST node visits for a single evaluation (hard maximum: 100000).
	 * @default 10000
	 */
	maxEvaluationSteps?: number;
	/**
	 * Maximum interpreter recursion depth (hard maximum: 2000). Bounds nested
	 * expressions so a deeply nested input cannot exhaust the host call stack.
	 * @default 1000
	 */
	maxDepth?: number;
}

export declare class Evaluator {
	constructor(variables?: unknown, options?: EvaluatorOptions);

	static evaluate<T = unknown>(expression: string, variables?: unknown): T;

	evaluate<T = unknown>(expression: string): T;
}
