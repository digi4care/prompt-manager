import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { produce } from 'sveltekit-sse';
import { executeCouncilReview } from '$lib/server/services/council-review.service';
import { authenticateWithBetterAuth } from '$lib/server/auth/jwt';

/**
 * Request validation schema for council review endpoint
 */
const councilReviewRequestSchema = z.object({
	promptId: z.number().int().positive(),
	userPrompt: z.string().min(1, 'Prompt content is required').max(100000, 'Content too long')
});

/**
 * POST /api/council/review
 *
 * Execute a PARALLEL council review where multiple agents review
 * the SAME user prompt from different perspectives.
 *
 * Request body:
 * - promptId: The prompt ID being reviewed (for context/settings)
 * - userPrompt: The content of the prompt to review
 *
 * SSE Events:
 * - event: review_start - { type, data: { agentCount, agents } }
 * - event: agent_start - { type, agentId, agentName, data }
 * - event: agent_delta - { type, agentId, agentName, data: { delta, accumulated } }
 * - event: agent_complete - { type, agentId, agentName, data: CouncilAgentResult }
 * - event: review_complete - { type, data: { results, summary } }
 * - event: error - { type, agentId?, agentName?, data: { message } }
 *
 * Configuration:
 * - Heartbeat ping every 15 seconds to maintain connection
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

	const validation = councilReviewRequestSchema.safeParse(body);

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

	const { promptId, userPrompt } = validation.data;

	// Create SSE stream using sveltekit-sse produce()
	return produce(
		async function start({ emit, lock }) {
			try {
				// Create the council review generator
				const generator = executeCouncilReview({
					promptId,
					userPrompt
				});

				// Iterate over review events
				let result = await generator.next();
				while (!result.done) {
					const reviewEvent = result.value;

					// Emit the event
					const emitResult = emit(reviewEvent.type, JSON.stringify(reviewEvent));

					// Check for emit errors (client disconnected)
					if (emitResult.error) {
						console.log('[CouncilReview] Emit error, client likely disconnected');
						lock.set(false);
						return;
					}

					// If review_complete or error, close the connection
					if (reviewEvent.type === 'review_complete' || reviewEvent.type === 'error') {
						console.log('[CouncilReview] Council review complete:', reviewEvent.type);
						lock.set(false);
						return;
					}

					// Get next event
					result = await generator.next();
				}

				// Generator completed (should have been handled by review_complete event)
				console.log('[CouncilReview] Generator finished');
			} catch (err) {
				console.error('[CouncilReview] Streaming error:', err);

				// Emit error event
				emit(
					'error',
					JSON.stringify({
						type: 'error',
						data: {
							message: err instanceof Error ? err.message : 'Council review failed',
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
