import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth.helper';
import { getAllSettings } from '$lib/server/services/admin-settings.service';

/**
 * GET /api/admin/settings
 * Fetch all admin settings grouped by category
 */
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);

	try {
		const settings = await getAllSettings();
		return json({ success: true, data: settings });
	} catch (err) {
		console.error('Failed to fetch admin settings:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to fetch admin settings',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};
