import 'dotenv/config';
import { validateEnvironment } from '$lib/server/env';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { dev } from '$app/environment';
import { eventBus, initEventSubscribers } from '$lib/server/events';
import {
	rateLimitMiddleware,
	authMiddleware,
	securityHeadersMiddleware
} from '$lib/server/middleware';

// Validate environment on server start
validateEnvironment();
initEventSubscribers();

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

// DevTools detection middleware
const devToolsMiddleware: Handle = async ({ event, resolve }) => {
	if (dev && event.url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
		return new Response(undefined, { status: 404 });
	}
	return resolve(event);
};

// Route protection middleware
const routeProtectionMiddleware: Handle = async ({ event, resolve }) => {
	const { requiresAuthentication, isAdminAuthenticated } = await import('$lib/server/middleware/auth');
	if (requiresAuthentication(event.url.pathname) && !isAdminAuthenticated(event)) {
		if (event.request.headers.get('accept')?.includes('application/json')) {
			const errorBody = JSON.stringify({
				error: 'Authentication required',
				message: 'Please log in to access this resource'
			});
			return new Response(errorBody, {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		return redirect(302, '/login');
	}
	return resolve(event);
};

export const handle: Handle = async ({ event, resolve }) => {
	return paraglideMiddleware(event.request, async ({ request: localizedRequest, locale }) => {
		// Update event.request with the localized request (de-localized URL)
		event.request = localizedRequest;

		const sequenceHandle = sequence(
			rateLimitMiddleware,
			devToolsMiddleware,
			authMiddleware,
			routeProtectionMiddleware,
			securityHeadersMiddleware
		);

		return sequenceHandle({
			event,
			resolve: (e) =>
				resolve(e, {
					transformPageChunk: ({ html }) => html.replace('%paraglide-locale%', locale)
				})
		});
	});
};

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
		eventBus.emit('security:event', {
			event: 'ERROR_OCCURRED',
			metadata: {
				path: pathname,
				status: (error as any)?.status || 500,
				method: event.request.method,
				ip: clientIP,
				timestamp
			}
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
