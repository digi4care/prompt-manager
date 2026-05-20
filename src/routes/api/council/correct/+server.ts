import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createSSEHandler } from '$lib/server/utils/sse-handler';
import { executeCouncilCorrect } from '$lib/server/services/council-correct.service';

const councilRequestSchema = z.object({
	promptId: z.number().int().positive(),
	content: z.string().min(1, 'Content is required').max(100000, 'Content too long')
});

/**
 * POST /api/council/correct
 *
 * Execute a council correct workflow with streaming SSE response.
 */
export const POST: RequestHandler = createSSEHandler({
	schema: councilRequestSchema,
	createGenerator: (data) =>
		executeCouncilCorrect({
			promptId: data.promptId,
			content: data.content
		}),
	eventNameMap: (e) => (e.type === 'step_delta' ? 'delta' : e.type),
	isTerminal: (e) => e.type === 'council_complete' || e.type === 'error'
});
