import { Node } from "acorn";

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
}

export declare class Evaluator {
	constructor(variables?: unknown, options?: EvaluatorOptions);

	static evaluate<T = unknown>(expression: string, variables?: unknown): T;

	evaluate<T = unknown>(expression: string): T;
}

export declare function getNodeString(node: Node): string;
