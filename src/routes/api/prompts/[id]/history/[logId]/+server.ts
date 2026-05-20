import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExecutionLog } from '$lib/server/services/execution-log.service';
import { authenticateRequest } from '$lib/server/auth.helper';

/**
 * GET /api/prompts/[id]/history/[logId]
 *
 * Get a single execution log with full details including input/output content.
 *
 * Response:
 * - 200: Full execution log details
 * - 400: Invalid prompt ID or log ID
 * - 401: Authentication required
 * - 404: Log not found
 */
export const GET: RequestHandler = async (event) => {
	// Require authentication
	authenticateRequest(event);

	// Parse prompt ID from path
	const promptIdParam = event.params.id;
	const promptId = parseInt(promptIdParam, 10);

	if (isNaN(promptId) || promptId <= 0) {
		throw error(400, 'Invalid prompt ID');
	}

	// Parse log ID from path
	const logIdParam = event.params.logId;
	const logId = parseInt(logIdParam, 10);

	if (isNaN(logId) || logId <= 0) {
		throw error(400, 'Invalid log ID');
	}

	// Get the execution log
	const log = await getExecutionLog(promptId, logId);

	if (!log) {
		throw error(404, 'Log not found');
	}

	return json({ data: log });
};
