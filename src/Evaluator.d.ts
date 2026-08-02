import { Node } from "acorn";

export interface EvaluatorOptions {
	/**
	 * Maximum allowed length (in characters) of a single expression.
	 * @default 10000
	 */
	maxInputLength?: number;
}

export declare class Evaluator {
	constructor(variables?: unknown, options?: EvaluatorOptions);

	static evaluate<T = unknown>(expression: string, variables?: unknown): T;

	evaluate<T = unknown>(expression: string): T;
}

export declare function getNodeString(node: Node): string;
