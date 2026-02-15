import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkOpencodeHealth } from '$lib/server/services/opencode.service';

/**
 * GET /api/admin/health
 * Check OpenCode connection health
 */
export const GET: RequestHandler = async () => {
	try {
		const health = await checkOpencodeHealth();
		return json({ success: true, data: health });
	} catch (err) {
		console.error('Failed to check OpenCode health:', err);
		return json(
			{
				success: false,
				data: {
					healthy: false,
					diagnostics: {
						baseUrl: process.env.OPENCODE_URL || 'http://localhost:4096',
						timestamp: new Date().toISOString(),
						error: err instanceof Error ? err.message : 'Unknown error'
					}
				}
			},
			{ status: 503 }
		);
	}
};
