import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { produce } from 'sveltekit-sse';
import { streamPromptExecution } from '$lib/server/services/streaming.service';
import { authenticateWithBetterAuth } from '$lib/server/auth/jwt';

/**
 * Request validation schema for stream endpoint
 * Matches the execute endpoint schema for consistency
 */
const streamRequestSchema = z.object({
	content: z.string().min(1, 'Content is required').max(100000, 'Content too long'),
	versionId: z.number().optional(),
	overrides: z
		.object({
			modelId: z.string().optional(),
			temperature: z.number().min(0).max(2).optional(),
			maxTokens: z.number().int().min(1).max(1000000).optional()
		})
		.optional()
});

/**
 * POST /api/prompts/[id]/stream
 *
 * Execute a prompt with streaming response via Server-Sent Events.
 *
 * Request body:
 * - content: The prompt content to execute (required, max 100000 chars)
 * - versionId: Optional version ID to execute
 * - overrides: Optional run-level overrides for model/temperature/maxTokens
 *
 * SSE Events:
 * - event: delta - { type: 'delta', delta: string, accumulated: string }
 * - event: complete - { type: 'complete', content: string, usage: {...}, duration: {...}, model: {...} }
 * - event: error - { type: 'error', message: string, code?: string }
 *
 * Configuration:
 * - Heartbeat ping every 15 seconds to maintain connection
 * - Automatic cleanup on client disconnect
 */
export const POST: RequestHandler = async (event) => {
	// Require authentication
	authenticateWithBetterAuth(event);

	// Parse prompt ID from path
	const promptIdParam = event.params.id;
	const promptId = parseInt(promptIdParam, 10);

	if (isNaN(promptId) || promptId <= 0) {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid prompt ID',
				code: 'INVALID_PROMPT_ID',
				errors: { id: 'Must be a positive number' }
			})
		);
	}

	// Parse and validate request body
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid JSON body',
				code: 'INVALID_JSON'
			})
		);
	}

	const validation = streamRequestSchema.safeParse(body);

	if (!validation.success) {
		const errors = validation.error.issues.reduce(
			(acc: Record<string, string>, err) => {
				const path = err.path.join('.');
				acc[path] = err.message;
				return acc;
			},
			{} as Record<string, string>
		);

		throw error(
			400,
			JSON.stringify({
				message: 'Validation failed',
				code: 'VALIDATION_ERROR',
				errors
			})
		);
	}

	const { content, overrides } = validation.data;

	// Store cleanup function for use in stop callback
	let sessionCleanup: (() => Promise<void>) | null = null;

	// Create SSE stream using sveltekit-sse produce()
	return produce(
		async function start({ emit, lock }) {
			try {
				// Create the streaming generator
				const generator = streamPromptExecution({
					promptId,
					content,
					functionType: 'executor',
					overrides
				});

				// Iterate over streaming events
				let result = await generator.next();
				while (!result.done) {
					const streamEvent = result.value;

					// Emit the event
					const emitResult = emit(streamEvent.type, JSON.stringify(streamEvent));

					// Check for emit errors (client disconnected)
					if (emitResult.error) {
						console.log('[StreamEndpoint] Emit error, client likely disconnected');
						lock.set(false);
						return;
					}

					// If complete or error, close the connection
					if (streamEvent.type === 'complete' || streamEvent.type === 'error') {
						console.log('[StreamEndpoint] Stream complete:', streamEvent.type);
						lock.set(false);
						return;
					}

					// Get next event
					result = await generator.next();
				}

				// Capture cleanup function from generator return value
				if (result.done && result.value) {
					sessionCleanup = result.value;
				}
			} catch (err) {
				console.error('[StreamEndpoint] Streaming error:', err);

				// Emit error event
				emit(
					'error',
					JSON.stringify({
						type: 'error',
						message: err instanceof Error ? err.message : 'Streaming failed',
						code: 'STREAM_ERROR'
					})
				);

				lock.set(false);
			}
		},
		{
			// Heartbeat every 15 seconds to keep connection alive
			ping: 15000,
			// Called when client disconnects - cleanup session
			stop() {
				console.log('[StreamEndpoint] Client disconnected, cleaning up session');
				if (sessionCleanup) {
					sessionCleanup().catch((err) => {
						console.error('[StreamEndpoint] Cleanup error:', err);
					});
				}
			}
		}
	);
};
