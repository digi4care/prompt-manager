import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getOpencodeConnectionStatus,
	updateOpencodeConnectionMode,
	validateConnectionMode,
	validateBaseUrl,
	type ConnectionMode
} from '$lib/server/services/opencode-connection.service';
import { authenticateRequest } from '$lib/server/auth/jwt';

/**
 * GET /api/admin/opencode-connection
 * Get OpenCode connection status with health check
 */
export const GET: RequestHandler = async (event) => {
	// Require authentication
	authenticateRequest(event);

	try {
		const status = await getOpencodeConnectionStatus();
		return json({ data: status });
	} catch (err) {
		console.error('Failed to get OpenCode connection status:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to get OpenCode connection status',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};

/**
 * PUT /api/admin/opencode-connection
 * Update OpenCode connection mode
 * Body: { mode: 'auto' | 'custom', baseUrl?: string }
 */
export const PUT: RequestHandler = async (event) => {
	// Require authentication
	const user = authenticateRequest(event);

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	// Type guard for body
	const data = body as Record<string, unknown>;
	const { mode, baseUrl } = data;

	// Validate mode
	const modeValidation = validateConnectionMode(mode);
	if (!modeValidation.valid) {
		throw error(
			400,
			JSON.stringify({
				message: 'Validation failed',
				errors: { mode: modeValidation.error }
			})
		);
	}

	// Validate baseUrl for custom mode
	if (mode === 'custom') {
		const urlValidation = validateBaseUrl(baseUrl);
		if (!urlValidation.valid) {
			throw error(
				400,
				JSON.stringify({
					message: 'Validation failed',
					errors: { baseUrl: urlValidation.error }
				})
			);
		}
	}

	try {
		// Log the update for audit purposes
		console.log(
			`[AUDIT] User ${user.userId} (${user.email}) updating OpenCode connection: mode=${mode}, baseUrl=${baseUrl || 'null'}`
		);

		const updated = await updateOpencodeConnectionMode(
			mode as ConnectionMode,
			baseUrl as string | undefined
		);

		// Get fresh status after update
		const status = await getOpencodeConnectionStatus();

		return json({ data: status, config: updated });
	} catch (err) {
		console.error('Failed to update OpenCode connection:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to update OpenCode connection',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};
