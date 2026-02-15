import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	updateSetting,
	validateSettingValue,
	getSetting
} from '$lib/server/services/admin-settings.service';
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

		if (value === null) {
			throw error(404, JSON.stringify({
				message: `Setting '${key}' not found`,
				errors: null
			}));
		}

		return json({ success: true, data: { key, value } });
	} catch (err) {
		if (err instanceof Response) throw err;
		console.error(`Failed to fetch setting '${key}':`, err);
		throw error(500, JSON.stringify({
			message: 'Failed to fetch setting',
			errors: err instanceof Error ? err.message : null
		}));
	}
};

/**
 * PUT /api/admin/settings/[key]
 * Update a single setting
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	const { key } = params;

	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({
			message: 'Invalid JSON body',
			errors: null
		}));
	}

	const parsed = updateSettingSchema.safeParse(data);
	if (!parsed.success) {
		throw error(400, JSON.stringify({
			message: 'Validation failed',
			errors: parsed.error.flatten()
		}));
	}

	const { value, updatedBy } = parsed.data;

	// Validate setting value
	const validation = validateSettingValue(key, value);
	if (!validation.valid) {
		throw error(400, JSON.stringify({
			message: validation.error || 'Invalid setting value',
			errors: null
		}));
	}

	try {
		const updated = await updateSetting({ key, value, updatedBy });
		return json({ success: true, data: updated });
	} catch (err) {
		console.error(`Failed to update setting '${key}':`, err);
		throw error(500, JSON.stringify({
			message: 'Failed to update setting',
			errors: err instanceof Error ? err.message : null
		}));
	}
};
