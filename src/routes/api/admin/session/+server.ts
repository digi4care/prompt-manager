import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { optionalAuthenticateRequest } from '$lib/server/auth.helper';

/**
 * GET /api/admin/session
 * Get current session - used by client-side auth store for real-time session detection
 */
export const GET: RequestHandler = async (event: RequestEvent) => {
	const user = optionalAuthenticateRequest(event);

	if (!user) {
		return json({ user: null, authenticated: false });
	}

	return json({
		user: {
			id: user.userId,
			email: user.email,
			name: user.email,
			role: user.role
		},
		authenticated: true
	});
};
