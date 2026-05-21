import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getExecutionHistory } from '$lib/server/services/execution-log.service';
import { authenticateRequest } from '$lib/server/auth.helper';

/**
 * Query parameter validation schema for history endpoint
 */
const querySchema = z.object({
	limit: z.coerce.number().min(1).max(100).default(50),
	offset: z.coerce.number().min(0).default(0)
});

/**
 * GET /api/prompts/[id]/history
 *
 * Get paginated execution history for a prompt.
 *
 * Query parameters:
 * - limit: Number of logs to return (1-100, default 50)
 * - offset: Number of logs to skip (default 0)
 *
 * Response:
 * - 200: Paginated list of execution logs
 * - 400: Invalid prompt ID or query parameters
 * - 401: Authentication required
 */
export const GET: RequestHandler = async (event) => {
	// Require authentication
	authenticateRequest(event);

	// Parse prompt ID from path
	const promptIdParam = event.params.id;
	const promptId = parseInt(promptIdParam, 10);

	// Parse and validate query parameters
	const query = querySchema.safeParse(Object.fromEntries(event.url.searchParams));

	if (!query.success) {
		const errors = query.error.issues.reduce(
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
				message: 'Invalid query parameters',
				code: 'VALIDATION_ERROR',
				errors
			})
		);
	}

	const { limit, offset } = query.data;

	// Get execution history
	const { logs, totalCount } = await getExecutionHistory(promptId, limit, offset);

	return json({
		data: logs,
		pagination: {
			limit,
			offset,
			totalCount,
			hasMore: offset + logs.length < totalCount
		}
	});
};
