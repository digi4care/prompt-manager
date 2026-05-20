import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createSSEHandler } from '$lib/server/utils/sse-handler';
import { streamPromptExecution } from '$lib/server/services/streaming.service';

/**
 * Schema includes promptId (injected from URL params via extractParams)
 */
const streamRequestSchema = z.object({
	promptId: z.number().int().positive(),
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
 */
export const POST: RequestHandler = createSSEHandler({
	schema: streamRequestSchema,
	extractParams: (event) => {
		const promptId = parseInt(event.params.id ?? '', 10);
		if (isNaN(promptId) || promptId <= 0) {
			throw new Error('Invalid prompt ID');
		}
		return { promptId };
	},
	createGenerator: (data) =>
		streamPromptExecution({
			promptId: data.promptId,
			content: data.content,
			functionType: 'executor',
			overrides: data.overrides
		}),
	isTerminal: (e) => e.type === 'complete' || e.type === 'error'
});
