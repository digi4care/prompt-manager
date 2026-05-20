/**
 * Shared types for council mode strategies
 */

/**
 * Council mode identifiers
 */
export type CouncilMode = 'correct' | 'debate' | 'review';

/**
 * Common council execution options
 */
export interface CouncilExecutionOptions {
	promptId: number;
	inputContent: string;
	functionType?: 'council';
}

/**
 * Common event types for all council modes
 */
export type CouncilEventType =
	| 'council_start'
	| 'step_start'
	| 'step_delta'
	| 'step_complete'
	| 'round_complete'
	| 'council_complete'
	| 'error';

/**
 * Common council event shape
 */
export interface CouncilEvent {
	type: CouncilEventType;
	data: Record<string, unknown>;
	timestamp: number;
}

/**
 * Result from a single council agent/step
 */
export interface CouncilStepResult {
	output: string;
	model: {
		providerId: string;
		modelId: string;
		displayName?: string;
	};
	usage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	duration: {
		ms: number;
		seconds: number;
	};
}

/**
 * Strategy interface for council modes
 * Each council mode (correct, debate, review) implements this interface
 */
export interface CouncilModeStrategy {
	readonly mode: CouncilMode;
	execute(
		options: CouncilExecutionOptions
	): AsyncGenerator<CouncilEvent, CouncilStepResult, unknown>;
}
