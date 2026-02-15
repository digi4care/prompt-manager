import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';
import { getAllSettings } from '$lib/server/services/admin-settings.service';
import { verifyToken } from '$lib/server/auth/jwt';

/**
 * GET /api/admin/settings
 * Fetch all admin settings grouped by category
 */
export const GET: RequestHandler = async ({ cookies, request }) => {
	try {
		// Check authentication: Better Auth session OR JWT token
		let isAuthenticated = false;

		// 1. Try Better Auth session first
		const session = await auth.api.getSession({
			headers: request.headers
		});
		if (session) {
			isAuthenticated = true;
		}

		// 2. If no session, try JWT token from cookie
		if (!isAuthenticated) {
			const jwtToken = cookies.get('jwt_token');
			if (jwtToken) {
				try {
					verifyToken(jwtToken);
					isAuthenticated = true;
				} catch {
					// Invalid JWT, continue to unauthorized
				}
			}
		}

		if (!isAuthenticated) {
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
