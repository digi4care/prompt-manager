import { json } from '@sveltejs/kit';
import { getOpencodeConnectionStatus } from '$lib/server/services/opencode-connection.service';
import type { RequestHandler } from './$types';

/**
 * GET /api/opencode/providers/all
 *
 * Returns ALL providers from OpenCode server (not just configured ones).
 * Uses the /provider endpoint directly.
 * Supports ?force=true to bypass cache.
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const force = url.searchParams.get('force') === 'true';
		const status = await getOpencodeConnectionStatus();

		if (!status.connected || !status.baseUrl) {
			return json({ error: 'Not connected to OpenCode server' }, { status: 503 });
		}

		// If force=true, bypass cache by adding cache-busting header
		const response = await fetch(`${status.baseUrl}/provider`, {
			headers: {
				Accept: 'application/json',
				...(force && { 'Cache-Control': 'no-cache' })
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
