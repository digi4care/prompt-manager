import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getImprovePreset,
	updateImprovePreset,
	deleteImprovePreset,
	validatePresetData
} from '$lib/server/services/improve-presets.service';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';

/**
 * GET /api/admin/improve-presets/[id]
 * Fetch a single improve preset by ID
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id, 10);

		if (isNaN(id)) {
			throw error(
				400,
				JSON.stringify({
					message: 'Invalid preset ID'
				})
			);
		}

		const preset = await getImprovePreset(id);

		if (!preset) {
			throw error(
				404,
				JSON.stringify({
					message: 'Improve preset not found'
				})
			);
		}

		return json({ success: true, data: preset });
	} catch (err) {
		// Re-throw HttpErrors (they have a status property)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Failed to fetch improve preset:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to fetch improve preset',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};

/**
 * PUT /api/admin/improve-presets/[id]
 * Update an improve preset
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id, 10);

		if (isNaN(id)) {
			throw error(
				400,
				JSON.stringify({
					message: 'Invalid preset ID'
				})
			);
		}

		// Check if preset exists
		const existing = await getImprovePreset(id);
		if (!existing) {
			throw error(
				404,
				JSON.stringify({
					message: 'Improve preset not found'
				})
			);
		}

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

		// Update preset
		const updated = await updateImprovePreset(id, {
			name,
			description,
			instruction,
			model: model !== undefined ? model : undefined,
			modelVariant: modelVariant !== undefined ? modelVariant : undefined,
			temperature: temperature !== undefined ? temperature : undefined,
			allowedModels: allowedModels !== undefined ? allowedModels : undefined,
			isDefault: isDefault !== undefined ? isDefault : undefined,
			updatedBy: 'admin'
		});

		if (!updated) {
			throw error(
				404,
				JSON.stringify({
					message: 'Failed to update improve preset'
				})
			);
		}

		return json({ success: true, data: updated });
	} catch (err) {
		// Re-throw HttpErrors (they have a status property)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Failed to update improve preset:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to update improve preset',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};

/**
 * DELETE /api/admin/improve-presets/[id]
 * Delete an improve preset
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id, 10);

		if (isNaN(id)) {
			throw error(
				400,
				JSON.stringify({
					message: 'Invalid preset ID'
				})
			);
		}

		// Check if preset exists
		const existing = await getImprovePreset(id);
		if (!existing) {
			throw error(
				404,
				JSON.stringify({
					message: 'Improve preset not found'
				})
			);
		}

		const deleted = await deleteImprovePreset(id);

		if (!deleted) {
			throw error(
				500,
				JSON.stringify({
					message: 'Failed to delete improve preset'
				})
			);
		}

		return json({ success: true, message: 'Improve preset deleted successfully' });
	} catch (err) {
		// Re-throw HttpErrors (they have a status property)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('Failed to delete improve preset:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to delete improve preset',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};
