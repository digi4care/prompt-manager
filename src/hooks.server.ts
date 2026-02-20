import 'dotenv/config';
import { validateEnvironment } from '$lib/server/env';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import * as crypto from 'crypto';
import { building } from '$app/environment';

// Validate environment on server start
validateEnvironment();

import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { logSecurityEvent } from '$lib/server/audit';
import { authenticateRequest, verifyToken } from '$lib/server/auth/jwt';
import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';

// Extend SvelteKit Locals type to include Better Auth session
declare module '@sveltejs/kit' {
	interface Locals {
		auth?: {
			user: {
				id: number;
				email: string;
				emailVerified: number | null;
				name: string | null;
				image: string | null;
				createdAt: number;
				updatedAt: number;
			};
			session: {
				id: number;
				userId: number;
				expiresAt: number;
				token: string;
				ipAddress: string | null;
				userAgent: string | null;
				createdAt: number;
				updatedAt: number;
			};
		};
	}
}

/**
 * HIGH-1 FIX: Rate limiting configuration
 * Protect against brute force and DoS attacks
 */
interface RateLimitEntry {
	count: number;
	resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute for general routes
const RATE_LIMIT_MAX_AUTH_REQUESTS = 30; // 30 requests per minute for auth routes

/**
 * Check if request exceeds rate limit
 */
function isRateLimited(event: RequestEvent): { limited: boolean; retryAfter: number } {
	const clientIP = event.getClientAddress?.() || 'unknown';
	const route = event.url.pathname;
	const isAuthRoute =
		route.includes('/login') || route.includes('/admin') || route.includes('/settings');
	const maxRequests = isAuthRoute ? RATE_LIMIT_MAX_AUTH_REQUESTS : RATE_LIMIT_MAX_REQUESTS;
	const key = `${clientIP}:${route}`;
	const now = Date.now();

	const entry = rateLimitMap.get(key);

	if (!entry || now > entry.resetTime) {
		rateLimitMap.set(key, {
			count: 1,
			resetTime: now + RATE_LIMIT_WINDOW_MS
		});
		return { limited: false, retryAfter: 0 };
	}

	entry.count++;

	if (entry.count > maxRequests) {
		const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
		console.warn(
			`[AUDIT] Rate limit exceeded: IP=${clientIP}, route=${route}, count=${entry.count}, max=${maxRequests}`
		);
		return { limited: true, retryAfter };
	}

	return { limited: false, retryAfter: 0 };
}

/**
 * Check if request requires authentication
 */
function requiresAuthentication(pathname: string): boolean {
	if (dev && pathname.startsWith('/api/admin/setup')) {
		return false;
	}

	const publicRoutes = [
		'/login',
		'/api/health',
		'/api/admin/health', // OpenCode connection status - needed before login
		'/api/admin/opencode-connection', // Connection settings - needed before login
		'/api/prompts', // Public prompts - auth handled per-method in endpoint
		'/favicon.ico',
		'/static/',
		'/.well-known/'
	];
	return !publicRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Check if request requires JWT authentication
 */
function requiresJwtAuthentication(pathname: string): boolean {
	if (dev && pathname.startsWith('/api/admin/setup')) {
		return false;
	}

	// Public admin endpoints - connection settings needed before login
	const publicAdminRoutes = ['/api/admin/health', '/api/admin/opencode-connection'];
	if (publicAdminRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
		return false;
	}

	return pathname.startsWith('/api/admin') || pathname.startsWith('/api/prompts');
}

/**
 * Verify admin authentication from Better Auth session or JWT
 */
function isAdminAuthenticated(event: RequestEvent): boolean {
	const pathname = event.url.pathname;
	const isJwtRequiredRoute = requiresJwtAuthentication(pathname);
	const hasJsonAccept = event.request.headers.get('accept')?.includes('application/json');

	// Logout and profile pages only need Better Auth session, not JWT
	if (pathname === '/logout' || pathname === '/admin/profile') {
		return !!event.locals.auth?.session;
	}

	// For API routes, prioritize JWT authentication
	if (isJwtRequiredRoute || hasJsonAccept) {
		try {
			authenticateRequest(event);
			return true;
		} catch (err: any) {
			// Allow Better Auth session for admin API routes when JWT is missing/invalid
			if (event.url.pathname.startsWith('/api/admin') && event.locals.auth?.session) {
				return true;
			}

			console.warn(`[AUTH] JWT authentication failed for ${event.url.pathname}: ${err?.message}`);
			return false;
		}
	}

	// Check for Better Auth session
	if (event.locals.auth?.session) {
		return true;
	}

	// Require authentication for all admin routes

	return false;
}

/**
 * Redirect to admin login page
 */
function redirectToAdminLogin(event: RequestEvent) {
	if (event.request.headers.get('accept')?.includes('application/json')) {
		const errorBody = JSON.stringify({
			error: 'Authentication required',
			message: 'Please provide a valid JWT token or admin session'
		});
		return new Response(errorBody, {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return redirect(302, '/login');
}

export async function handle({ event, resolve }: { event: RequestEvent; resolve: any }) {
	// 1. Fetch Better Auth session and populate event.locals
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		event.locals.auth = session as any;
	}

	// 2. Rate limiting
	const { limited, retryAfter } = isRateLimited(event);
	if (limited) {
		return new Response('Rate limit exceeded. Please try again later.', {
			status: 429,
			headers: {
				'Retry-After': String(retryAfter),
				'Content-Type': 'text/plain'
			}
		});
	}

	// 3. Handle Chrome DevTools detection
	if (dev && event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(undefined, { status: 404 });
	}

	// 4. Protect routes with authentication
	if (requiresAuthentication(event.url.pathname)) {
		if (!isAdminAuthenticated(event)) {
			return redirectToAdminLogin(event);
		}
	}

	// 5. Better Auth SvelteKit handler
	let response = await svelteKitHandler({ event, resolve, auth, building });

	// 6. Add security headers
	const origin = event.request.headers.get('origin');
	const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
	const isApiRoute = event.url.pathname.startsWith('/api/');

	if (isApiRoute && origin && allowedOrigins.includes(origin)) {
		response.headers.set('Access-Control-Allow-Origin', origin);
		response.headers.set('Access-Control-Allow-Credentials', 'true');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
		response.headers.set(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-CSRF-Token'
		);
	}

	if (event.request.method === 'OPTIONS' && isApiRoute) {
		return new Response(null, {
			status: 204,
			headers: {
				'Access-Control-Allow-Origin': origin || '*',
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token',
				'Access-Control-Max-Age': '86400'
			}
		});
	}

	const headers: Record<string, string> = {
		'Content-Security-Policy':
			"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' http://localhost:4096; report-uri /api/csp-report;",
		'X-Frame-Options': 'DENY',
		'X-Content-Type-Options': 'nosniff',
		'Referrer-Policy': 'strict-origin-when-cross-origin',
		'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
		'X-XSS-Protection': '1; mode=block'
	};

	if (process.env.NODE_ENV === 'production') {
		headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
	}

	Object.entries(headers).forEach(([key, value]) => {
		response.headers.set(key, value);
	});

	return response;
}

/**
 * MED-2 FIX: Error handling that doesn't expose stack traces in production
 */
export const handleError: HandleServerError = async ({ error, event }) => {
	const timestamp = new Date().toISOString();
	const clientIP = event.getClientAddress?.() || 'unknown';
	const userAgent = event.request.headers.get('user-agent') || 'unknown';
	const pathname = event.url.pathname;

	console.error(`[ERROR] ${timestamp} - ${pathname}`, {
		message: error instanceof Error ? error.message : 'Unknown error',
		stack: error instanceof Error ? error.stack : undefined,
		ip: clientIP,
		userAgent: userAgent,
		method: event.request.method
	});

	if (event.request.method !== 'GET' && [401, 403, 500].includes((error as any)?.status || 500)) {
		await logSecurityEvent('ERROR_OCCURRED', {
			path: pathname,
			status: (error as any)?.status || 500,
			method: event.request.method,
			ip: clientIP,
			timestamp
		});
	}

	const isProduction = process.env.NODE_ENV === 'production';

	if (isProduction) {
		return {
			message: error instanceof Error ? 'An unexpected error occurred' : 'Unknown error'
		};
	}

	return {
		message: error instanceof Error ? error.message : 'Unknown error'
	};
};
