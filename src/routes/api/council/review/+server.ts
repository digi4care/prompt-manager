import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createSSEHandler } from '$lib/server/utils/sse-handler';
import { executeCouncilReview } from '$lib/server/services/council-review.service';

const councilReviewRequestSchema = z.object({
	promptId: z.number().int().positive(),
	userPrompt: z.string().min(1, 'Prompt content is required').max(100000, 'Content too long'),
	agentOverrides: z
		.record(
			z.number().int().positive(),
			z.object({
				promptId: z.number().int().positive(),
				versionId: z.number().int().positive().optional()
			})
		)
		.optional()
});

/**
 * POST /api/council/review
 *
 * Execute a parallel council review where multiple agents review
 * the same user prompt from different perspectives.
 */
export const POST: RequestHandler = createSSEHandler({
	schema: councilReviewRequestSchema,
	createGenerator: (data) =>
		executeCouncilReview({
			promptId: data.promptId,
			userPrompt: data.userPrompt,
			agentOverrides: data.agentOverrides
		}),
	isTerminal: (e) => e.type === 'review_complete' || e.type === 'error'
});
