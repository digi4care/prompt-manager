import type { Actions as KitActions } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const load = async () => {
	throw redirect(302, '/settings');
};

export const actions: KitActions = {
	logout: async ({ cookies }) => {
		// Clear session cookies
		cookies.delete('admin_session', { path: '/' });
		cookies.delete('jwt_token', { path: '/' });

		// Redirect to login page
		throw redirect(303, '/login');
	}
};
