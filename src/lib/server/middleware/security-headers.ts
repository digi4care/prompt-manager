import type { Handle, RequestEvent } from '@sveltejs/kit';

export function applySecurityHeaders(response: Response, event: RequestEvent): Response {
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

export const securityHeadersMiddleware: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	return applySecurityHeaders(response, event);
};
