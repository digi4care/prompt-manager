import { requireAdmin } from '$lib/server/auth.helper';
import type { RequestHandler } from './$types';
import { getFunctionDefaults } from '$lib/server/services/function-defaults.service';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

/**
 * GET /api/admin/function-defaults
 * Fetch all function defaults (executor, judge, improve, council)
 */
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);

	try {
		const defaults = await getFunctionDefaults();
		return apiSuccess(defaults);
	} catch (err) {
		console.error('Failed to fetch function defaults:', err);
		apiFail('Failed to fetch function defaults', 500);
	}
};
