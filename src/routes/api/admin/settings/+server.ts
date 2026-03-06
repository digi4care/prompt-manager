import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';
import { getAllSettings } from '$lib/server/services/admin-settings.service';

/**
 * GET /api/admin/settings
 * Fetch all admin settings grouped by category
 */
export const GET: RequestHandler = async ({ request }) => {
	try {
		// Check authentication via Better Auth session
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

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
