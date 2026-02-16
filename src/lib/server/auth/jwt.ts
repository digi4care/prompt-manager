import jwt from 'jsonwebtoken';
import { error, type RequestEvent } from '@sveltejs/kit';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface JwtPayload {
	userId: string;
	email: string;
	role: 'user' | 'admin';
	iat: number;
	exp: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
	return jwt.sign(payload, JWT_SECRET, {
		expiresIn: '7d', // Token expires in 7 days
		issuer: 'prompt-wallet',
		audience: 'prompt-wallet-client'
	});
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload {
	try {
		return jwt.verify(token, JWT_SECRET, {
			issuer: 'prompt-wallet',
			audience: 'prompt-wallet-client'
		}) as JwtPayload;
	} catch (err) {
		if (err instanceof jwt.TokenExpiredError) {
			throw error(401, JSON.stringify({ message: 'Token expired', code: 'TOKEN_EXPIRED' }));
		}
		if (err instanceof jwt.JsonWebTokenError) {
			throw error(401, JSON.stringify({ message: 'Invalid token', code: 'INVALID_TOKEN' }));
		}
		throw error(401, JSON.stringify({ message: 'Authentication failed', code: 'AUTH_FAILED' }));
	}
}

/**
 * Extract token from Authorization header
 * Format: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader: string | null | undefined): string | undefined {
	if (!authHeader?.startsWith('Bearer ')) {
		return undefined;
	}
	return authHeader.substring(7);
}

/**
 * Authenticate request and return user payload
 * Throws 401 if authentication fails
 */
export function authenticateRequest(event: RequestEvent): JwtPayload {
	// First try to get token from jwt_token cookie
	let token = event.cookies.get('jwt_token');

	// If not in cookie, try Authorization header
	if (!token) {
		const authHeader = event.request.headers.get('Authorization');
		token = extractTokenFromHeader(authHeader ?? undefined);
	}

	if (!token) {
		throw error(
			401,
			JSON.stringify({
				message: 'Authentication required. Please provide a valid Bearer token.',
				code: 'AUTH_REQUIRED'
			})
		);
	}

	return verifyToken(token);
}

/**
 * Optional authentication - returns user if authenticated, null otherwise
 * Does NOT throw on missing/invalid token
 */
export function optionalAuthenticateRequest(event: RequestEvent): JwtPayload | null {
	try {
		return authenticateRequest(event);
	} catch {
		return null;
	}
}

/**
 * Middleware to require authentication for specific routes
 * Use in hooks.server.ts or individual routes
 */
export function requireAuth(event: RequestEvent): JwtPayload {
	return authenticateRequest(event);
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(event: RequestEvent): JwtPayload {
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

/**
 * Authenticate request using Better Auth session (preferred) or JWT fallback
 * This is the recommended way to authenticate API requests
 */
export function authenticateWithBetterAuth(event: RequestEvent): {
	userId: string;
	email: string;
	role: 'user' | 'admin';
} {
	// First check Better Auth session (source of truth)
	if (event.locals.auth?.session && event.locals.auth?.user) {
		return {
			userId: event.locals.auth.user.id,
			email: event.locals.auth.user.email ?? '',
			role: (event.locals.auth.user as { role?: 'user' | 'admin' }).role ?? 'user'
		};
	}

	// Fallback to JWT token for backward compatibility
	try {
		return authenticateRequest(event);
	} catch {
		throw error(
			401,
			JSON.stringify({
				message: 'Authentication required',
				code: 'AUTH_REQUIRED'
			})
		);
	}
}
