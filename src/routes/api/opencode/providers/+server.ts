import { json } from '@sveltejs/kit';
import { getProviderCatalog, refreshProviderCatalog } from '$lib/server/services/opencode.service';
import type { RequestHandler } from './$types';

/**
 * GET /api/opencode/providers
 *
 * Returns the provider/model catalog from OpenCode.
 * Uses in-memory TTL cache (5 minutes) by default.
 *
 * Query params:
 * - refresh=true: Force cache refresh
 */
export const GET: RequestHandler = async ({ url }) => {
	const refresh = url.searchParams.get('refresh') === 'true';

	try {
		const catalog = refresh ? await refreshProviderCatalog() : await getProviderCatalog(false);

		return json(catalog, {
			headers: {
				'Cache-Control': `public, max-age=${catalog.ttlSeconds}`
			}
		});
	} catch (err) {
		// Return error response
		const message = err instanceof Error ? err.message : 'Failed to fetch provider catalog';
		return json(
			{
				error: 'Failed to fetch provider catalog',
				message
			},
			{ status: 503 }
		);
	}
};
