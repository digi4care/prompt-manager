import type { RequestHandler } from './$types';
import {
	updateSetting,
	validateSettingValue,
	getSetting
} from '$lib/server/services/admin-settings.service';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
import { z } from 'zod';

const updateSettingSchema = z.object({
	value: z.string(),
	updatedBy: z.string().optional()
});

/**
 * GET /api/admin/settings/[key]
 * Fetch a single setting by key
 */
export const GET: RequestHandler = async ({ params }) => {
	const { key } = params;

	try {
		const value = await getSetting(key);
		if (value === null) apiFail(`Setting '${key}' not found`, 404);
		return apiSuccess({ key, value });
	} catch (err) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error(`Failed to fetch setting '${key}':`, err);
		apiFail('Failed to fetch setting', 500);
	}
};

/**
 * PUT /api/admin/settings/[key]
 * Update a single setting
 */
export const PUT: RequestHandler = async (event) => {
	const { key } = event.params;
	const { value, updatedBy } = await validateRequest(event, updateSettingSchema);

	// Validate setting value
	const validation = validateSettingValue(key, value);
	if (!validation.valid) {
		apiFail(validation.error || 'Invalid setting value', 400);
	}

	try {
		const updated = await updateSetting({ key, value, updatedBy });
		return apiSuccess(updated);
	} catch (err) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error(`Failed to update setting '${key}':`, err);
		apiFail('Failed to update setting', 500);
	}
};
