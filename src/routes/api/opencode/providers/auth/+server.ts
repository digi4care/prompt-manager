import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLocalOpencodeClient, getRemoteOpencodeClient } from '$lib/server/opencode/client';
import { getOpencodeConnectionConfig } from '$lib/server/services/opencode-connection.service';

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
 * POST /api/opencode/providers/auth
 * Set API key for a provider using SDK
 *
 * Body: { providerId: string, apiKey: string }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { providerId, apiKey } = body;

		if (!providerId || typeof providerId !== 'string') {
			throw error(400, 'providerId is required');
		}

		if (!apiKey || typeof apiKey !== 'string') {
			throw error(400, 'apiKey is required');
		}

		const client = await getClient();

		// SDK: client.auth.set() for API key authentication
		await client.auth.set({
			path: { id: providerId },
			body: { type: 'api', key: apiKey }
		});

		return json({ success: true, providerId });
	} catch (err) {
		console.error('Failed to set provider auth:', err);
		throw error(500, 'Failed to set provider authentication');
	}
};

/**
 * DELETE /api/opencode/providers/auth
 * Remove API key for a provider by setting empty key
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

		const client = await getClient();

		// SDK: set empty key to remove auth
		await client.auth.set({
			path: { id: providerId },
			body: { type: 'api', key: '' }
		});

		return json({ success: true, providerId });
	} catch (err) {
		console.error('Failed to remove provider auth:', err);
		throw error(500, 'Failed to remove provider authentication');
	}
};
