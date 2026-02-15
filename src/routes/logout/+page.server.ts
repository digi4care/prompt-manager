import { redirect, type RequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/auth';

export const actions = {
	default: async (event: RequestEvent) => {
		try {
			await auth.api.signOut({ headers: event.request.headers });
		} catch {
			// Ignore errors - proceed with cookie cleanup
		}

		event.cookies.delete('better-auth.session_token', { path: '/' });
		event.cookies.delete('jwt_token', { path: '/' });

		throw redirect(303, '/login');
	}
};
