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
import { getOpencodeClient, getProviders } from './opencode.service';
import type { FunctionType } from './function-defaults.service';
import { withRetry } from '../utils/retry';

export interface ExecutionDeps {
	getOpencodeClient?: typeof getOpencodeClient;
	resolveFunctionSettings?: typeof resolveFunctionSettings;
	getProviders?: typeof getProviders;
}
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
	variant?: {
		id: string;
		source: 'run' | 'prompt' | 'default' | 'provider_default';
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
	/** Debug info - only included in development */
	debug?: {
		responsePartsCount: number;
		responsePartsTypes: string[];
		hasInfo: boolean;
		infoTokens?: { input?: number; output?: number };
		rawError?: string;
		sessionCreated?: boolean;
		modelRequested?: { providerId: string; modelId: string };
		promptError?: unknown;
	};
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
export async function executePrompt(
	options: ExecutePromptOptions,
	deps?: ExecutionDeps
): Promise<ExecutionResult> {
	const getClient = deps?.getOpencodeClient ?? getOpencodeClient;
	const resolveSettings = deps?.resolveFunctionSettings ?? resolveFunctionSettings;
	const getProvidersFn = deps?.getProviders ?? getProviders;
	const { promptId, content, functionType = 'executor', overrides } = options;

	const startTime = Date.now();
	let session: Session | null = null;

	try {
		// Resolve settings through cascade
		const settings = await resolveSettings({
			functionType,
			promptId,
			runOverrides: overrides
		});

		// Parse model ID format: providerId/modelId
		const modelIdValue = settings.modelId.value;
		const slashIndex = modelIdValue.indexOf('/');
		let providerId: string = 'openai'; // default fallback
		let modelId: string;

		if (slashIndex === -1) {
			// Model ID without provider prefix - find the provider from catalog
			modelId = modelIdValue;

			// Try to find the provider that has this model
			try {
				const providersResponse = await getProvidersFn();
				const providers = providersResponse?.providers || [];

				for (const provider of providers) {
					if (provider.models && provider.models[modelId]) {
						providerId = provider.id || providerId;
						console.log(`[ExecutionService] Found model "${modelId}" in provider "${providerId}"`);
						break;
					}
				}

				// Fallback to first connected provider if not found
				if (providerId === 'openai' && providers.length > 0) {
					providerId = providers[0].id || providerId;
					console.log(
						`[ExecutionService] Using first provider "${providerId}" as fallback for model "${modelId}"`
					);
				}
			} catch (e) {
				console.warn('[ExecutionService] Failed to get providers for model lookup:', e);
			}
		} else {
			providerId = modelIdValue.substring(0, slashIndex);
			modelId = modelIdValue.substring(slashIndex + 1);
		}

		// Get OpenCode client
		const client = await getClient();

		// Create ephemeral session
		const createResult = await client.session.create();

		console.log('[ExecutionService] Session create result:', {
			hasData: !!createResult.data,
			error: createResult.error,
			sessionId: (createResult.data as Session)?.id
		});

		if (createResult.error) {
			throw new ExecutionError(
				500,
				'SESSION_CREATE_FAILED',
				'Failed to create execution session',
				'Try again in a moment'
			);
		}

		session = (createResult.data as Session) ?? null;
		if (!session) {
			throw new ExecutionError(
				500,
				'SESSION_CREATE_FAILED',
				'Session creation returned null',
				'Try again in a moment'
			);
		}
		const activeSession = session;

		// Send prompt to session
		console.log('[ExecutionService] Sending prompt:', {
			sessionId: activeSession.id,
			contentLength: content.length,
			model: { providerId, modelId }
		});

		const promptResult = await withRetry(
			async () => {
				const result = await client.session.prompt({
					path: { id: activeSession.id },
					body: {
						parts: [{ type: 'text', text: content }],
						model: {
							providerID: providerId,
							modelID: modelId
						}
					}
				});
				// SDK returns error in result rather than throwing —
				// throw here so withRetry can catch transient failures
				if (result.error) {
					throw ExecutionError.fromSDKError(result.error);
				}
				return result;
			},
			{ maxRetries: 2 }
		);

		console.log('[ExecutionService] Prompt result:', {
			hasData: !!promptResult.data,
			error: promptResult.error,
			responseStatus: (promptResult as unknown as { response?: { status: number } }).response
				?.status
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

		// Debug logging for response structure
		console.log('[ExecutionService] Raw response:', JSON.stringify(response, null, 2));
		console.log('[ExecutionService] Response parts:', response.parts);
		console.log('[ExecutionService] Response info:', response.info);

		// Extract text content from response parts
		let responseContent = '';
		if (response.parts && Array.isArray(response.parts)) {
			for (const part of response.parts) {
				console.log('[ExecutionService] Processing part:', part);
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
		const resolvedVariant = settings.modelVariant.value;
		const result: ExecutionResult = {
			content: responseContent,
			model: {
				providerId: info?.providerID ?? providerId,
				modelId: info?.modelID ?? modelId,
				displayName: `${info?.providerID ?? providerId}/${info?.modelID ?? modelId}`
			},
			variant: resolvedVariant
				? {
						id: resolvedVariant,
						source: settings.modelVariant.source
					}
				: undefined,
			usage: {
				inputTokens,
				outputTokens,
				totalTokens: inputTokens + outputTokens
			},
			duration: {
				ms: durationMs,
				seconds: Math.round(durationMs / 100) / 10
			},
			source: settings.modelId.source,
			// Debug info for development
			debug: {
				responsePartsCount: response.parts?.length ?? 0,
				responsePartsTypes:
					response.parts?.map((p: Part) => ('type' in p ? p.type : 'unknown')) ?? [],
				hasInfo: !!info,
				infoTokens: info?.tokens,
				sessionCreated: !!session,
				modelRequested: { providerId, modelId },
				promptError: promptResult.error
			}
		};

		return result;
	} finally {
		// Always clean up the session
		if (session) {
			try {
				const client = await getClient();
				await client.session.delete({ path: { id: session.id } });
			} catch {
				// Log but don't throw - session cleanup failure shouldn't affect response
				console.error(`Failed to cleanup session ${session.id}`);
			}
		}
	}
}
