import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLocalOpencodeClient, getRemoteOpencodeClient } from '$lib/server/opencode/client';
import { getOpencodeConnectionConfig } from '$lib/server/services/opencode-connection.service';
import { clearProvidersCache } from '$lib/server/services/opencode.service';

/**
 * Get the appropriate client based on connection mode
 */
async function getClient() {
	const config = await getOpencodeConnectionConfig();

	if (config.mode === 'remote' && config.baseUrl) {
		return getRemoteOpencodeClient(config.baseUrl, config.password);
	}

	return getLocalOpencodeClient();
}

/**
 * GET /api/opencode/providers/auth
 * Get authentication methods for all providers
 *
 * Returns: { [providerId]: [{ type: 'oauth'|'api', label: string }] }
 */
export const GET: RequestHandler = async () => {
	try {
		const config = await getOpencodeConnectionConfig();
		const baseUrl = config.baseUrl || 'http://127.0.0.1:10000';

		// Direct HTTP GET to OpenCode server
		const response = await fetch(`${baseUrl}/provider/auth`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('OpenCode /provider/auth failed:', errorText);
			throw error(response.status, `Failed to get auth methods: ${errorText}`);
		}

		const authMethods = await response.json();

		return json(authMethods);
	} catch (err) {
		console.error('Failed to get provider auth methods:', err);
		throw error(500, 'Failed to get provider authentication methods');
	}
};

/**
 * POST /api/opencode/providers/auth
 * Set API key for a provider using SDK
 *
 * Body: { providerId: string, apiKey?: string, authType?: 'api' }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { providerId, apiKey, authType } = body;

		if (!providerId || typeof providerId !== 'string') {
			throw error(400, 'providerId is required');
		}

		// If authType is 'api', we need an API key
		if (authType === 'api' && (!apiKey || typeof apiKey !== 'string')) {
			throw error(400, 'apiKey is required for API authentication');
		}

		const client = await getClient();

		// SDK: client.auth.set() for API key authentication
		await client.auth.set({
			path: { id: providerId },
			body: { type: 'api', key: apiKey }
		});

		// Clear providers cache so fresh data is fetched on next load
		clearProvidersCache();

		return json({ success: true, providerId });
	} catch (err) {
		console.error('Failed to set provider auth:', err);
		throw error(500, 'Failed to set provider authentication');
	}
};

/**
 * DELETE /api/opencode/providers/auth
 * Remove authentication for a provider by calling OpenCode DELETE /auth/:providerId
 *
 * Body: { providerId: string }
 */
export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { providerId } = body;

		if (!providerId || typeof providerId !== 'string') {
			throw error(400, 'providerId is required');
		}

		const config = await getOpencodeConnectionConfig();
		const baseUrl = config.baseUrl || 'http://127.0.0.1:10000';

		// Direct HTTP DELETE to OpenCode server
		const response = await fetch(`${baseUrl}/auth/${providerId}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('OpenCode DELETE failed:', errorText);
			throw error(response.status, `Failed to disconnect provider: ${errorText}`);
		}

		// Clear providers cache so fresh data is fetched on next load
		clearProvidersCache();

		return json({ success: true, providerId });
	} catch (err) {
		console.error('Failed to remove provider auth:', err);
		throw error(500, 'Failed to remove provider authentication');
	}
};
