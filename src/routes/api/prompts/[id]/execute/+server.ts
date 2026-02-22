import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { executePrompt, ExecutionError } from '$lib/server/services/execution.service';
import { authenticateWithBetterAuth } from '$lib/server/auth/jwt';

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
 *
 * Request body:
 * - content: The prompt content to execute (required, max 100000 chars)
 * - versionId: Optional version ID to execute
 * - overrides: Optional run-level overrides for model/temperature/maxTokens
 *
 * Response:
 * - 200: ExecutionResult with content, model, usage, and duration
 * - 400: Validation error
 * - 401: Authentication required
 * - 4xx/5xx: Execution error with message, code, and recovery hint
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

	const validation = executeRequestSchema.safeParse(body);

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

	// Execute the prompt
	try {
		const result = await executePrompt({
			promptId,
			content,
			functionType: 'executor',
			overrides
		});

		return json(result);
	} catch (err) {
		// Handle ExecutionError instances
		if (err instanceof ExecutionError) {
			throw error(
				err.statusCode,
				JSON.stringify({
					message: err.userMessage,
					code: err.code,
					recovery: err.recoveryHint
				})
			);
		}

		// Log unexpected errors
		console.error('Prompt execution failed:', err);

		throw error(
			500,
			JSON.stringify({
				message: 'An unexpected error occurred during execution',
				code: 'INTERNAL_ERROR',
				recovery: 'Try again or contact support if the problem persists'
			})
		);
	}
};
