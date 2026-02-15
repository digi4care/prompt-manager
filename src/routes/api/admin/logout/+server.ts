import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/auth';

/**
 * POST /api/admin/logout
 * Logout admin user using Better Auth
 */
export const POST: RequestHandler = async ({ cookies, request }) => {
	try {
		// Sign out using Better Auth
		await auth.api.signOut({
			headers: request.headers
		});

		console.log('[AUDIT] Admin logout successful');
		return json({ success: true, message: 'Logged out' });
	} catch (err) {
		console.error('[ERROR] Logout error:', err);
		return json({ success: false, message: 'Logout failed' }, { status: 500 });
	}
};
