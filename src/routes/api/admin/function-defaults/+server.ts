import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFunctionDefaults } from '$lib/server/services/function-defaults.service';

/**
 * GET /api/admin/function-defaults
 * Fetch all function defaults (executor, judge, improve, council)
 */
export const GET: RequestHandler = async (event) => {
	// Require authentication via Better Auth
	if (!event.locals.auth?.session) {
		throw error(401, JSON.stringify({ message: 'Authentication required' }));
	}

	try {
		const defaults = await getFunctionDefaults();
		return json({ data: defaults });
	} catch (err) {
		console.error('Failed to fetch function defaults:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to fetch function defaults',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};
