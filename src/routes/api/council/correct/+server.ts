import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { produce } from 'sveltekit-sse';
import { executeCouncilCorrect } from '$lib/server/services/council-correct.service';
import { authenticateWithBetterAuth } from '$lib/server/auth.helper';

/**
 * Request validation schema for council correct endpoint
 */
const councilRequestSchema = z.object({
	promptId: z.number().int().positive(),
	content: z.string().min(1, 'Content is required').max(100000, 'Content too long')
});

/**
 * POST /api/council/correct
 *
 * Execute a council correct workflow with streaming response via Server-Sent Events.
 *
 * Request body:
 * - promptId: The prompt ID to use for settings resolution (required)
 * - content: The initial input content (required, max 100000 chars)
 *
 * SSE Events:
 * - event: step_start - { type, step, round, data: { input } }
 * - event: step_delta - { type, step, round, data: { delta, accumulated } }
 * - event: step_complete - { type, step, round, data: CouncilStepResult }
 * - event: round_complete - { type, round, data: { round, issuesFound, fixerOutput } }
 * - event: council_complete - { type, round, data: { finalOutput, reason, ... } }
 * - event: error - { type, round, data: { message, code } }
 *
 * Configuration:
 * - Heartbeat ping every 15 seconds to maintain connection
 * - Automatic cleanup on client disconnect
 */
export const POST: RequestHandler = async (event) => {
	// Require authentication
	authenticateWithBetterAuth(event);

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

	const validation = councilRequestSchema.safeParse(body);

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

	const { promptId, content } = validation.data;

	// Create SSE stream using sveltekit-sse produce()
	return produce(
		async function start({ emit, lock }) {
			try {
				// Create the council correct generator
				const generator = executeCouncilCorrect({
					promptId,
					content
				});

				// Iterate over council events
				let result = await generator.next();
				while (!result.done) {
					const councilEvent = result.value;

					// Determine event name based on type
					// For step_delta, use 'delta' as event name for consistency with streaming endpoint
					const eventName = councilEvent.type === 'step_delta' ? 'delta' : councilEvent.type;

					// Emit the event
					const emitResult = emit(eventName, JSON.stringify(councilEvent));

					// Check for emit errors (client disconnected)
					if (emitResult.error) {
						console.log('[CouncilCorrect] Emit error, client likely disconnected');
						lock.set(false);
						return;
					}

					// If council_complete or error, close the connection
					if (councilEvent.type === 'council_complete' || councilEvent.type === 'error') {
						console.log('[CouncilCorrect] Council execution complete:', councilEvent.type);
						lock.set(false);
						return;
					}

					// Get next event
					result = await generator.next();
				}

				// Generator completed (should have been handled by council_complete event)
				console.log('[CouncilCorrect] Generator finished');
			} catch (err) {
				console.error('[CouncilCorrect] Streaming error:', err);

				// Emit error event
				emit(
					'error',
					JSON.stringify({
						type: 'error',
						round: 0,
						data: {
							message: err instanceof Error ? err.message : 'Council execution failed',
							code: 'COUNCIL_ERROR'
						}
					})
				);

				lock.set(false);
			}
		},
		{
			// Heartbeat every 15 seconds to keep connection alive
			ping: 15000
		}
	);
};
