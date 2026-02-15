import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Check Better Auth session via locals.auth (set by hooks.server.ts)
	const isAuthenticated = !!locals?.auth?.session;

	return {
		isAuthenticated:
			isAuthenticated && !url.pathname.startsWith('/logout') && !url.pathname.startsWith('/login')
	};
};
