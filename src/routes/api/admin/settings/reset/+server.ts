import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resetToDefaults, resetSetting } from '$lib/server/services/admin-settings.service';
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
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		// No body is fine - reset all
		data = {};
	}

	const parsed = resetSchema.safeParse(data);
	if (!parsed.success) {
		throw error(400, JSON.stringify({
			message: 'Validation failed',
			errors: parsed.error.flatten()
		}));
	}

	const { key } = parsed.data;

	try {
		if (key) {
			// Reset specific setting
			const result = await resetSetting(key);
			if (!result) {
				throw error(404, JSON.stringify({
					message: `Setting '${key}' not found or has no default`,
					errors: null
				}));
			}
			return json({ success: true, message: `Setting '${key}' reset to default`, data: result });
		} else {
			// Reset all settings
			await resetToDefaults();
			return json({ success: true, message: 'All settings reset to defaults' });
		}
	} catch (err) {
		if (err instanceof Response) throw err;
		console.error('Failed to reset settings:', err);
		throw error(500, JSON.stringify({
			message: 'Failed to reset settings',
			errors: err instanceof Error ? err.message : null
		}));
	}
};
