import { error, type RequestEvent } from '@sveltejs/kit';

/**
 * Authenticate request using Better Auth session
 * This is the recommended way to authenticate API requests
 */
export function authenticateRequest(event: RequestEvent): {
	userId: number;
	email: string;
	role: 'user' | 'admin';
} {
	if (event.locals.auth?.session && event.locals.auth?.user) {
		return {
			userId: event.locals.auth.user.id,
			email: event.locals.auth.user.email,
			role: (event.locals.auth.user as { role?: 'user' | 'admin' }).role ?? 'user'
		};
	}

	throw error(
		401,
		JSON.stringify({
			message: 'Authentication required',
			code: 'AUTH_REQUIRED'
		})
	);
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 * Does NOT throw on missing/invalid session
 */
export function optionalAuthenticateRequest(event: RequestEvent): {
	userId: number;
	email: string;
	role: 'user' | 'admin';
} | null {
	try {
		return authenticateRequest(event);
	} catch {
		return null;
	}
}

/**
 * Alias for authenticateRequest for backward compatibility
 */
export const authenticateWithBetterAuth = authenticateRequest;

/**
 * Require admin role
 */
export function requireAdmin(event: RequestEvent): {
	userId: number;
	email: string;
	role: 'user' | 'admin';
} {
	const user = authenticateRequest(event);

	if (user.role !== 'admin') {
		throw error(
			403,
			JSON.stringify({
				message: 'Admin access required',
				code: 'FORBIDDEN'
			})
		);
	}

	return user;
}
