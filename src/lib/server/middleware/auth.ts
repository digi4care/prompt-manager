import type { Handle, RequestEvent } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { applySecurityHeaders } from './security-headers';

/**
 * Check if request requires authentication
 */
export function requiresAuthentication(pathname: string): boolean {
	const publicRoutes = [
		'/login',
		'/api/health',
		'/api/admin/health', // OpenCode connection status - needed before login
		'/api/prompts', // Public prompts - auth handled per-method in endpoint
		'/favicon.ico',
		'/static/',
		'/.well-known/'
	];
	return !publicRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Verify admin authentication from Better Auth session
 */
export function isAdminAuthenticated(event: RequestEvent): boolean {
	return !!event.locals.auth?.session;
}

export const authMiddleware: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		event.locals.auth = session as any;
	}

	const response = await resolve(event);

	const finalResponse = await svelteKitHandler({
		event,
		resolve: () => Promise.resolve(response),
		auth,
		building
	});

	return applySecurityHeaders(finalResponse, event);
};
