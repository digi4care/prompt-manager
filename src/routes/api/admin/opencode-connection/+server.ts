import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getOpencodeConnectionStatus,
	updateOpencodeConnectionSettings
} from '$lib/server/services/opencode-connection.service';
import {
	OpenCodeSettingsValidationError,
	validateSettings
} from '$lib/server/opencode/validate-settings';

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
 * Body: { settings: OpenCodeConnectionSettings }
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

	const data = body as Record<string, unknown>;

	const resolvedSettings = data.settings ?? {
		mode: data.mode,
		remote:
			data.mode === 'remote'
				? {
						baseUrl: data.baseUrl,
						password: data.password
					}
				: undefined,
		local: data.mode === 'local' ? data.local : undefined
	};

	try {
		const normalizedSettings = validateSettings(resolvedSettings);

		console.log(
			`[AUDIT] Updating OpenCode connection: mode=${normalizedSettings.mode}, hasPassword=${Boolean(normalizedSettings.remote?.password)}`
		);

		await updateOpencodeConnectionSettings(normalizedSettings);

		// Get fresh status after update
		const status = await getOpencodeConnectionStatus();

		return json({ data: status });
	} catch (err) {
		if (err instanceof OpenCodeSettingsValidationError) {
			throw error(
				400,
				JSON.stringify({
					message: 'Validation failed',
					errors: err.errors
				})
			);
		}

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
