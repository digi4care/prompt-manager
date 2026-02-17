import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOpencodeConnectionConfig } from '$lib/server/services/opencode-connection.service';
import { clearProvidersCache } from '$lib/server/services/opencode.service';

/**
 * POST /api/opencode/providers/oauth/authorize
 * Start OAuth authorization flow
 *
 * Body: { providerId: string, method?: number }
 *
 * Returns: { url?: string, method: 'auto'|'code', instructions?: string, callback?: string }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { providerId, method = 0 } = body;

		if (!providerId || typeof providerId !== 'string') {
			throw error(400, 'providerId is required');
		}

		const config = await getOpencodeConnectionConfig();
		const baseUrl = config.baseUrl || 'http://127.0.0.1:10000';

		// Call OpenCode OAuth authorize endpoint
		const response = await fetch(`${baseUrl}/${providerId}/oauth/authorize`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ method })
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('OpenCode OAuth authorize failed:', errorText);
			throw error(response.status, `OAuth authorization failed: ${errorText}`);
		}

		const oauthData = await response.json();

		return json(oauthData);
	} catch (err) {
		console.error('Failed to start OAuth flow:', err);
		throw error(500, 'Failed to start OAuth authorization flow');
	}
};
