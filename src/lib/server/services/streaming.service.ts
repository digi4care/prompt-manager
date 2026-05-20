/**
 * Streaming Service
 *
 * Bridges OpenCode SDK events to SSE consumers via async generator.
 * Subscribes to OpenCode message.part.delta events and yields streaming deltas.
 */
import { type OpencodeClient, type Session } from '@opencode-ai/sdk';
import {
	resolveFunctionSettings,
	type RunOverrides,
	type ResolutionResult
} from './settings-cascade.service';
import { getOpencodeClient, getProviders } from './opencode.service';
import type { FunctionType } from './function-defaults.service';
import { withRetry } from '../utils/retry';

export interface StreamingDeps {
	getOpencodeClient?: typeof getOpencodeClient;
	resolveFunctionSettings?: typeof resolveFunctionSettings;
	getProviders?: typeof getProviders;
}
/**
 * Streaming event types emitted to SSE clients
 */
export type StreamingEventType = 'delta' | 'complete' | 'error';

/**
 * Delta event - incremental text chunk
 */
export interface StreamingDeltaEvent {
	type: 'delta';
	delta: string;
	accumulated: string;
}

/**
 * Complete event - execution finished successfully
 */
export interface StreamingCompleteEvent {
	type: 'complete';
	content: string;
	usage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	duration: {
		ms: number;
		seconds: number;
	};
	model: {
		providerId: string;
		modelId: string;
		displayName: string;
	};
}

/**
 * Error event - execution failed
 */
export interface StreamingErrorEvent {
	type: 'error';
	message: string;
	code?: string;
}

/**
 * Union type for all streaming events
 */
export type StreamingEvent = StreamingDeltaEvent | StreamingCompleteEvent | StreamingErrorEvent;

/**
 * Options for streaming prompt execution
 */
export interface StreamPromptOptions {
	promptId: number;
	content: string;
	functionType?: FunctionType;
	overrides?: RunOverrides;
}

/**
 * OpenCode event types (from SDK)
 * These are the event types yielded by event.subscribe().stream
 */
interface OpenCodeEvent {
	type: string;
	properties?: Record<string, unknown>;
}

/**
 * Event properties from OpenCode SDK for message.part.delta
 */
interface MessagePartDeltaProperties {
	sessionID: string;
	messageID: string;
	partID: string;
	field: string;
	delta: string;
}

/**
 * Event properties from OpenCode SDK for session.idle
 */
interface SessionIdleProperties {
	sessionID: string;
}

/**
 * Event properties from OpenCode SDK for session.error
 */
interface SessionErrorProperties {
	sessionID: string;
	error?: {
		message?: string;
		code?: string;
	};
}

/**
 * Stream prompt execution via OpenCode SDK events
 *
 * This async generator:
 * 1. Subscribes to OpenCode events FIRST (prevents race conditions)
 * 2. Creates an ephemeral session
 * 3. Sends the prompt (non-blocking)
 * 4. Yields delta events filtered by sessionID
 * 5. Yields complete/error events and returns cleanup function
 *
 * CRITICAL: Event subscription happens BEFORE session creation to avoid
 * missing early deltas for fast responses.
 *
 * @yields StreamingEvent - delta, complete, or error events
 * @returns Cleanup function that deletes the OpenCode session
 */
export async function* streamPromptExecution(
	options: StreamPromptOptions,
	deps?: StreamingDeps
): AsyncGenerator<StreamingEvent, () => Promise<void>, unknown> {
	const getClient = deps?.getOpencodeClient ?? getOpencodeClient;
	const resolveSettings = deps?.resolveFunctionSettings ?? resolveFunctionSettings;
	const getProvidersFn = deps?.getProviders ?? getProviders;
	const { promptId, content, functionType = 'executor', overrides } = options;

	const startTime = Date.now();
	let session: Session | null = null;
	let sessionID: string | null = null;
	let accumulatedContent = '';

	// Get OpenCode client
	const client = await getClient();

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

		try {
			const providersResponse = await getProvidersFn();
			const providers = providersResponse?.providers || [];

			for (const provider of providers) {
				if (provider.models && provider.models[modelId]) {
					providerId = provider.id || providerId;
					console.log(`[StreamingService] Found model "${modelId}" in provider "${providerId}"`);
					break;
				}
			}

			// Fallback to first connected provider if not found
			if (providerId === 'openai' && providers.length > 0) {
				providerId = providers[0].id || providerId;
				console.log(
					`[StreamingService] Using first provider "${providerId}" as fallback for model "${modelId}"`
				);
			}
		} catch (e) {
			console.warn('[StreamingService] Failed to get providers for model lookup:', e);
		}
	} else {
		providerId = modelIdValue.substring(0, slashIndex);
		modelId = modelIdValue.substring(slashIndex + 1);
	}

	// Subscribe to events FIRST to prevent race condition
	// OpenCode's event.subscribe() returns ServerSentEventsResult with .stream property
	// The .stream is an AsyncGenerator that yields events for ALL sessions
	console.log('[StreamingService] Subscribing to OpenCode events...');
	let eventStream: AsyncIterable<OpenCodeEvent>;
	try {
		const eventSubscription = await client.event.subscribe();
		eventStream = eventSubscription.stream;
	} catch (error) {
		yield {
			type: 'error',
			message: 'Failed to subscribe to OpenCode events',
			code: 'EVENT_SUBSCRIBE_FAILED'
		} as StreamingErrorEvent;
		return async () => {};
	}

	// Create session AFTER subscribing to events
	console.log('[StreamingService] Creating session...');
	const createResult = await client.session.create();

	if (createResult.error) {
		yield {
			type: 'error',
			message: 'Failed to create execution session',
			code: 'SESSION_CREATE_FAILED'
		} as StreamingErrorEvent;
		return async () => {};
	}

	session = createResult.data as Session;
	sessionID = session.id;

	console.log('[StreamingService] Session created:', {
		sessionId: sessionID,
		model: { providerId, modelId }
	});

	// Send prompt (non-blocking - events will stream via subscription)
	const promptPromise = withRetry(
		async () => {
			const result = await client.session.prompt({
				path: { id: sessionID },
				body: {
					parts: [{ type: 'text', text: content }],
					model: {
						providerID: providerId,
						modelID: modelId
					}
				}
			});
			// SDK returns error in result — throw so withRetry can retry transient failures
			if (result.error) {
				throw new Error(`SDK prompt error: ${JSON.stringify(result.error)}`);
			}
			return result;
		},
		{ maxRetries: 2 }
	);

	// Track usage from response
	let inputTokens = 0;
	let outputTokens = 0;

	// Process events from the stream
	try {
		for await (const event of eventStream) {
			// Handle delta events - these contain streaming text
			if (event.type === 'message.part.delta') {
				const props = event.properties as unknown as MessagePartDeltaProperties;

				// CRITICAL: Filter to only our session
				if (sessionID && props?.sessionID === sessionID) {
					accumulatedContent += props.delta;

					yield {
						type: 'delta',
						delta: props.delta,
						accumulated: accumulatedContent
					} as StreamingDeltaEvent;
				}
			}

			// Handle session idle - execution complete
			if (event.type === 'session.idle') {
				const props = event.properties as unknown as SessionIdleProperties;

				if (sessionID && props?.sessionID === sessionID) {
					// Get final response to extract usage info
					try {
						const promptResult = await promptPromise;
						const response = promptResult.data;

						if (response?.info?.tokens) {
							inputTokens = response.info.tokens.input ?? 0;
							outputTokens = response.info.tokens.output ?? 0;
						}
					} catch {
						// Continue without usage info if prompt fails
					}

					const endTime = Date.now();
					const durationMs = endTime - startTime;

					yield {
						type: 'complete',
						content: accumulatedContent,
						usage: {
							inputTokens,
							outputTokens,
							totalTokens: inputTokens + outputTokens
						},
						duration: {
							ms: durationMs,
							seconds: Math.round(durationMs / 100) / 10
						},
						model: {
							providerId,
							modelId,
							displayName: `${providerId}/${modelId}`
						}
					} as StreamingCompleteEvent;

					// Exit the event loop
					break;
				}
			}

			// Handle errors
			if (event.type === 'session.error') {
				const props = event.properties as unknown as SessionErrorProperties;

				if (sessionID && props?.sessionID === sessionID) {
					yield {
						type: 'error',
						message: props.error?.message || 'Execution failed',
						code: props.error?.code || 'EXECUTION_ERROR'
					} as StreamingErrorEvent;

					break;
				}
			}
		}
	} catch (error) {
		yield {
			type: 'error',
			message: error instanceof Error ? error.message : 'Unknown streaming error',
			code: 'STREAM_ERROR'
		} as StreamingErrorEvent;
	}

	// Return cleanup function
	return async function cleanup() {
		if (sessionID) {
			try {
				await client.session.delete({ path: { id: sessionID } });
				console.log('[StreamingService] Session cleaned up:', sessionID);
			} catch (e) {
				console.error('[StreamingService] Failed to cleanup session:', sessionID, e);
			}
		}
	};
}
