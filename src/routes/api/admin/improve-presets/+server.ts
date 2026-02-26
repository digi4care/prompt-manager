import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAllImprovePresets,
	createImprovePreset,
	validatePresetData
} from '$lib/server/services/improve-presets.service';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';

/**
 * GET /api/admin/improve-presets
 * Fetch all improve presets
 */
export const GET: RequestHandler = async () => {
	try {
		const presets = await getAllImprovePresets();
		return json({ success: true, data: presets });
	} catch (err) {
		console.error('Failed to fetch improve presets:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to fetch improve presets',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};

/**
 * POST /api/admin/improve-presets
 * Create a new improve preset
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const {
			name,
			description,
			instruction,
			model,
			modelVariant,
			temperature,
			allowedModels,
			isDefault
		} = body;

		// Validate required fields
		if (!name || !instruction) {
			throw error(
				400,
				JSON.stringify({
					message: 'Missing required fields: name and instruction are required'
				})
			);
		}

		// Get current policy for validation
		const policy = await getOpenCodePolicy();

		// Validate preset data against policy
		const validation = validatePresetData(
			{ model, modelVariant, temperature, allowedModels },
			policy
		);

		if (!validation.valid) {
			throw error(
				400,
				JSON.stringify({
					message: 'Validation failed',
					errors: validation.errors
				})
			);
		}

		// Create preset
		const preset = await createImprovePreset({
			name,
			description,
			instruction,
			model: model || null,
			modelVariant: modelVariant || null,
			temperature: temperature !== undefined ? temperature : null,
			allowedModels: allowedModels || null,
			isDefault: isDefault || false,
			updatedBy: 'admin'
		});

		return json({ success: true, data: preset }, { status: 201 });
	} catch (err) {
		// Re-throw HttpErrors (they have a status property)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Failed to create improve preset:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to create improve preset',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};
