import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOpencodeConnectionConfig } from '$lib/server/services/opencode-connection.service';
import { clearProvidersCache } from '$lib/server/services/opencode.service';

/**
 * PUT /api/opencode/providers/auth/:providerId
 * Set API key for a provider using direct HTTP to OpenCode server
 *
 * Body: { type: 'api', key: string }
 */
export const PUT: RequestHandler = async ({ request, params }) => {
	try {
		const providerId = params.providerId;

		if (!providerId || typeof providerId !== 'string') {
			throw error(400, 'providerId is required');
		}

		const body = await request.json();
		const { type, key } = body;

		if (type !== 'api' || !key) {
			throw error(400, 'Body must be { type: "api", key: "..." }');
		}

		const config = await getOpencodeConnectionConfig();
		const baseUrl = config.baseUrl || 'http://127.0.0.1:10000';

		// Direct HTTP PUT to OpenCode server
		const response = await fetch(`${baseUrl}/auth/${providerId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ type: 'api', key })
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('OpenCode PUT failed:', errorText);
			throw error(response.status, `Failed to connect provider: ${errorText}`);
		}

		// Clear providers cache so fresh data is fetched on next load
		clearProvidersCache();

		// Call /global/dispose to refresh OpenCode state
		// This is required for the provider to appear as "connected"
		await fetch(`${baseUrl}/global/dispose`, { method: 'POST' });

		// Fetch updated connected providers
		const providerResponse = await fetch(`${baseUrl}/provider`);
		const providerData = await providerResponse.json();

		return json({
			success: true,
			providerId,
			connected: providerData.connected || []
		});
	} catch (err) {
		console.error('Failed to set provider auth:', err);
		throw error(500, 'Failed to set provider authentication');
	}
};

/**
 * DELETE /api/opencode/providers/auth/:providerId
 * Remove authentication for a provider
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const providerId = params.providerId;

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

		// Call /global/dispose to refresh OpenCode state
		// This is required for the provider to be removed from "connected"
		await fetch(`${baseUrl}/global/dispose`, { method: 'POST' });

		// Fetch updated connected providers
		const providerResponse = await fetch(`${baseUrl}/provider`);
		const providerData = await providerResponse.json();

		return json({
			success: true,
			providerId,
			connected: providerData.connected || []
		});
	} catch (err) {
		console.error('Failed to remove provider auth:', err);
		throw error(500, 'Failed to remove provider authentication');
	}
};
