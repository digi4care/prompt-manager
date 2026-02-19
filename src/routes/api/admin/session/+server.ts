import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/auth';

/**
 * GET /api/admin/session
 * Get current session - used by client-side auth store for real-time session detection
 */
export const GET: RequestHandler = async ({ cookies }: RequestEvent) => {
	try {
		// Get session using Better Auth
		const session = await auth.api.getSession({
			headers: {
				cookie: cookies.toString()
			}
		});

		if (!session) {
			return json({ user: null, authenticated: false });
		}

		return json({
			user: {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name || session.user.email,
				role: 'admin'
			},
			authenticated: true
		});
	} catch {
		return json({ user: null, authenticated: false });
	}
};
