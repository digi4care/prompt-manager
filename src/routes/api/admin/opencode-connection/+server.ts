import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getOpencodeConnectionStatus,
	updateOpencodeConnection,
	validateConnectionMode,
	validateBaseUrl,
	type ConnectionMode
} from '$lib/server/services/opencode-connection.service';
import { authenticateRequest } from '$lib/server/auth/jwt';

/**
 * GET /api/admin/opencode-connection
 * Get OpenCode connection status with health check
 * Public endpoint - needed before login to check connection
 */
export const GET: RequestHandler = async () => {
	// No authentication required - connection status needed before login

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
 * Update OpenCode connection settings
 * Body: { mode: 'local' | 'remote', baseUrl?: string, password?: string }
 *
 * - local: SDK start embedded server, geen URL/password nodig
 * - remote: Verbind met externe server, URL en optioneel password
 *
 * Public endpoint - needed before login to configure connection
 */
export const PUT: RequestHandler = async (event) => {
	// No authentication required - connection settings needed before login

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	// Type guard for body
	const data = body as Record<string, unknown>;
	const { mode, baseUrl, password } = data;

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

	// Validate baseUrl for remote mode
	if (mode === 'remote') {
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

	// Validate password for remote mode (optional but recommended)
	const passwordStr = typeof password === 'string' && password.trim() ? password.trim() : null;

	try {
		// Log the update for audit purposes (don't log password!)
		console.log(
			`[AUDIT] Updating OpenCode connection: mode=${mode}, baseUrl=${baseUrl || 'null'}, hasPassword=${!!passwordStr}`
		);

		const updated = await updateOpencodeConnection(
			mode as ConnectionMode,
			baseUrl as string | null,
			passwordStr
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
