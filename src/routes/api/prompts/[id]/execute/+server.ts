import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { executePrompt, ExecutionError } from '$lib/server/services/execution.service';
import { eventBus } from '$lib/server/events';
import { authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

/**
 * Request validation schema for execute endpoint
 */
const executeRequestSchema = z.object({
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
 * POST /api/prompts/[id]/execute
 *
 * Execute a prompt with resolved settings from the cascade.
 */
export const POST: RequestHandler = async (event) => {
	authenticateRequest(event);

	const promptId = parseInt(event.params.id, 10);
	if (isNaN(promptId) || promptId <= 0) {
		apiFail('Invalid prompt ID', 400);
	}

	const { content, overrides } = await validateRequest(event, executeRequestSchema);

	try {
		const result = await executePrompt({
			promptId,
			content,
			functionType: 'executor',
			overrides
		});

		eventBus.emit('execution:completed', {
			promptId,
			inputContent: content,
			result,
			functionType: 'executor'
		});

		return apiSuccess(result);
	} catch (err) {
		if (err instanceof ExecutionError) {
			eventBus.emit('execution:completed', {
				promptId,
				inputContent: content,
				result: null,
				error: { code: err.code, message: err.userMessage },
				functionType: 'executor'
			});

			throw error(
				err.statusCode,
				JSON.stringify({
					message: err.userMessage,
					code: err.code,
					recovery: err.recoveryHint
				})
			);
		}

		console.error('Prompt execution failed:', err);
		apiFail('An unexpected error occurred during execution', 500);
	}
};
