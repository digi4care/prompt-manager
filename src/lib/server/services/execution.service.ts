/**
 * Execution Service
 *
 * Wraps OpenCode SDK session.prompt() API with settings cascade resolution,
 * timing measurement, and structured error handling.
 */
import { type OpencodeClient, type Session, type Part, type TextPart } from '@opencode-ai/sdk';
import {
	resolveFunctionSettings,
	type RunOverrides,
	type ResolutionResult
} from './settings-cascade.service';
import { getOpencodeClient } from './opencode.service';
import type { FunctionType } from './function-defaults.service';

/**
 * Custom error class for execution errors
 * Maps SDK errors to user-friendly messages with recovery hints
 */
export class ExecutionError extends Error {
	constructor(
		public readonly statusCode: number,
		public readonly code: string,
		public readonly userMessage: string,
		public readonly recoveryHint?: string
	) {
		super(userMessage);
		this.name = 'ExecutionError';
	}

	/**
	 * Map SDK errors to user-friendly ExecutionError instances
	 */
	static fromSDKError(error: unknown): ExecutionError {
		// Check for known SDK error types
		if (error instanceof Error) {
			const errorMessage = error.message.toLowerCase();

			// Authentication errors
			if (
				error.name === 'ProviderAuthError' ||
				errorMessage.includes('authentication') ||
				errorMessage.includes('unauthorized') ||
				errorMessage.includes('401')
			) {
				return new ExecutionError(
					401,
					'AUTH_FAILED',
					'API authentication failed',
					'Check your API key configuration in provider settings'
				);
			}

			// Rate limit errors
			if (
				errorMessage.includes('rate limit') ||
				errorMessage.includes('too many requests') ||
				errorMessage.includes('429')
			) {
				return new ExecutionError(
					429,
					'RATE_LIMITED',
					'Too many requests',
					'Wait a moment and try again'
				);
			}

			// Connection errors
			if (
				errorMessage.includes('connection') ||
				errorMessage.includes('network') ||
				errorMessage.includes('econnrefused') ||
				errorMessage.includes('enotfound')
			) {
				return new ExecutionError(
					503,
					'NO_CONNECTION',
					'Cannot connect to AI service',
					'Check your internet connection and try again'
				);
			}

			// Timeout errors
			if (
				errorMessage.includes('timeout') ||
				errorMessage.includes('etimedout') ||
				errorMessage.includes('timed out')
			) {
				return new ExecutionError(
					504,
					'TIMEOUT',
					'Request took too long',
					'Try again or reduce the complexity of your prompt'
				);
			}

			// API errors with status codes
			if (errorMessage.includes('400') || errorMessage.includes('bad request')) {
				return new ExecutionError(
					400,
					'BAD_REQUEST',
					'Invalid request parameters',
					'Check your input and try again'
				);
			}

			if (errorMessage.includes('404') || errorMessage.includes('not found')) {
				return new ExecutionError(
					404,
					'NOT_FOUND',
					'Resource not found',
					'The requested resource does not exist'
				);
			}

			// Generic error with original message
			return new ExecutionError(
				500,
				'UNKNOWN',
				error.message || 'An unexpected error occurred',
				'Try again or contact support if the problem persists'
			);
		}

		// Non-Error thrown
		return new ExecutionError(
			500,
			'UNKNOWN',
			'An unexpected error occurred',
			'Try again or contact support if the problem persists'
		);
	}
}

/**
 * Result of a prompt execution
 */
export interface ExecutionResult {
	content: string;
	model: {
		providerId: string;
		modelId: string;
		displayName: string;
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
	source: 'run' | 'prompt' | 'default';
}

/**
 * Options for executing a prompt
 */
export interface ExecutePromptOptions {
	promptId: number;
	content: string;
	functionType?: FunctionType;
	overrides?: RunOverrides;
}

/**
 * Execute a prompt using the OpenCode SDK
 *
 * 1. Resolves settings through the cascade (run > prompt > default)
 * 2. Creates an ephemeral session
 * 3. Sends the prompt and waits for response
 * 4. Cleans up the session
 * 5. Returns structured result with timing and usage info
 */
export async function executePrompt(options: ExecutePromptOptions): Promise<ExecutionResult> {
	const { promptId, content, functionType = 'executor', overrides } = options;

	const startTime = Date.now();
	let session: Session | null = null;

	try {
		// Resolve settings through cascade
		const settings = await resolveFunctionSettings({
			functionType,
			promptId,
			runOverrides: overrides
		});

		// Parse model ID format: providerId/modelId
		const modelIdValue = settings.modelId.value;
		const slashIndex = modelIdValue.indexOf('/');
		let providerId: string;
		let modelId: string;

		if (slashIndex === -1) {
			// Default to 'openai' if no provider specified
			providerId = 'openai';
			modelId = modelIdValue;
		} else {
			providerId = modelIdValue.substring(0, slashIndex);
			modelId = modelIdValue.substring(slashIndex + 1);
		}

		// Get OpenCode client
		const client = await getOpencodeClient();

		// Create ephemeral session
		const createResult = await client.session.create();

		if (createResult.error) {
			throw new ExecutionError(
				500,
				'SESSION_CREATE_FAILED',
				'Failed to create execution session',
				'Try again in a moment'
			);
		}

		session = createResult.data as Session;

		// Send prompt to session
		const promptResult = await client.session.prompt({
			path: { id: session.id },
			body: {
				parts: [{ type: 'text', text: content }],
				model: {
					providerID: providerId,
					modelID: modelId
				}
			}
		});

		if (promptResult.error) {
			throw ExecutionError.fromSDKError(promptResult.error);
		}

		const response = promptResult.data;
		if (!response) {
			throw new ExecutionError(
				500,
				'NO_RESPONSE',
				'No response received from AI service',
				'Try again'
			);
		}

		// Extract text content from response parts
		let responseContent = '';
		if (response.parts && Array.isArray(response.parts)) {
			for (const part of response.parts) {
				if ('type' in part && part.type === 'text' && 'text' in part) {
					responseContent += (part as TextPart).text;
				}
			}
		}

		// Extract usage info from response
		const info = response.info;
		const inputTokens = info?.tokens?.input ?? 0;
		const outputTokens = info?.tokens?.output ?? 0;

		// Calculate duration
		const endTime = Date.now();
		const durationMs = endTime - startTime;

		// Build result
		const result: ExecutionResult = {
			content: responseContent,
			model: {
				providerId: info?.providerID ?? providerId,
				modelId: info?.modelID ?? modelId,
				displayName: `${info?.providerID ?? providerId}/${info?.modelID ?? modelId}`
			},
			usage: {
				inputTokens,
				outputTokens,
				totalTokens: inputTokens + outputTokens
			},
			duration: {
				ms: durationMs,
				seconds: Math.round(durationMs / 100) / 10
			},
			source: settings.modelId.source
		};

		return result;
	} finally {
		// Always clean up the session
		if (session) {
			try {
				const client = await getOpencodeClient();
				await client.session.delete({ path: { id: session.id } });
			} catch {
				// Log but don't throw - session cleanup failure shouldn't affect response
				console.error(`Failed to cleanup session ${session.id}`);
			}
		}
	}
}
