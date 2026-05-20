import type { RequestHandler } from './$types';
import { resetToDefaults, resetSetting } from '$lib/server/services/admin-settings.service';
import { parseJsonBodyOrDefault } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
import { requireAdmin } from '$lib/server/auth.helper';
import { z } from 'zod';

const resetSchema = z.object({
	key: z.string().optional() // If provided, reset only this key; otherwise reset all
});

/**
 * POST /api/admin/settings/reset
 * Reset settings to defaults
 * - If 'key' provided in body: reset that specific setting
 * - If no 'key': reset all settings to defaults
 */
export const POST: RequestHandler = async (event) => {
	requireAdmin(event);

	const raw = await parseJsonBodyOrDefault(event, {});
	const parsed = resetSchema.safeParse(raw);
	if (!parsed.success) {
		apiFail('Validation failed', 400, parsed.error.flatten());
	}

	const { key } = parsed.data;

	try {
		if (key) {
			// Reset specific setting
			const result = await resetSetting(key);
			if (!result) {
				apiFail(`Setting '${key}' not found or has no default`, 404);
			}
			return apiSuccess(result);
		} else {
			// Reset all settings
			await resetToDefaults();
			return apiSuccess({ message: 'All settings reset to defaults' });
		}
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Failed to reset settings:', err);
		apiFail('Failed to reset settings', 500);
	}
};
