import { json } from '@sveltejs/kit';
import { getOpencodeConnectionStatus } from '$lib/server/services/opencode-connection.service';
import type { RequestHandler } from './$types';

/**
 * GET /api/opencode/providers/all
 *
 * Returns ALL providers from OpenCode server (not just configured ones).
 * Uses the /provider endpoint directly.
 */
export const GET: RequestHandler = async () => {
	try {
		const status = await getOpencodeConnectionStatus();

		if (!status.connected || !status.baseUrl) {
			return json({ error: 'Not connected to OpenCode server' }, { status: 503 });
		}

		const response = await fetch(`${status.baseUrl}/provider`, {
			headers: {
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`OpenCode server returned ${response.status}`);
		}

		const data = await response.json();

		return json(data);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch providers';
		return json({ error: message }, { status: 500 });
	}
};
