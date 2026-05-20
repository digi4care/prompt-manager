import type { Handle, RequestEvent } from '@sveltejs/kit';

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

export const rateLimitMiddleware: Handle = async ({ event, resolve }) => {
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
	return resolve(event);
};
