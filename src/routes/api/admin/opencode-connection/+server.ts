import type { RequestHandler } from './$types';
import {
	getOpencodeConnectionStatus,
	updateOpencodeConnectionSettings
} from '$lib/server/services/opencode-connection.service';
import {
	OpenCodeSettingsValidationError,
	validateSettings
} from '$lib/server/opencode/validate-settings';
import { parseJsonBody } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

/**
 * GET /api/admin/opencode-connection
 * Get OpenCode connection status with health check
 * Public endpoint - needed before login to check connection
 */
export const GET: RequestHandler = async () => {
	try {
		const status = await getOpencodeConnectionStatus();
		return apiSuccess(status);
	} catch (err) {
		console.error('Failed to get OpenCode connection status:', err);
		apiFail('Failed to get OpenCode connection status', 500);
	}
};

/**
 * PUT /api/admin/opencode-connection
 * Update OpenCode connection settings
 * Public endpoint - needed before login to configure connection
 */
export const PUT: RequestHandler = async (event) => {
	const body = (await parseJsonBody(event)) as Record<string, unknown>;

	const data = body;
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

		return apiSuccess(status);
	} catch (err) {
		if (err instanceof OpenCodeSettingsValidationError) {
			apiFail('Validation failed', 400, err.errors);
		}

		console.error('Failed to update OpenCode connection:', err);
		apiFail('Failed to update OpenCode connection', 500);
	}
};
