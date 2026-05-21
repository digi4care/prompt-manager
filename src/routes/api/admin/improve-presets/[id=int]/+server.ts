import type { RequestHandler } from './$types';
import {
	getImprovePreset,
	updateImprovePreset,
	deleteImprovePreset,
	validatePresetData
} from '$lib/server/services/improve-presets.service';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { requireAdmin } from '$lib/server/auth.helper';
import { parseJsonBody } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

function parseId(raw: string): number {
	return parseInt(raw, 10);
}

/**
 * GET /api/admin/improve-presets/[id]
 * Fetch a single improve preset by ID
 */
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	const id = parseId(event.params.id);

	try {
		const preset = await getImprovePreset(id);
		if (!preset) apiFail('Improve preset not found', 404);
		return apiSuccess(preset);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Failed to fetch improve preset:', err);
		apiFail('Failed to fetch improve preset', 500);
	}
};

/**
 * PUT /api/admin/improve-presets/[id]
 * Update an improve preset
 */
export const PUT: RequestHandler = async (event) => {
	requireAdmin(event);
	const id = parseId(event.params.id);

	// Check if preset exists
	const existing = await getImprovePreset(id);
	if (!existing) apiFail('Improve preset not found', 404);

	const body = (await parseJsonBody(event)) as Record<string, unknown>;
	const {
		name,
		description,
		instruction,
		model,
		modelVariant,
		temperature,
		allowedModels,
		isDefault
	}: {
		name?: string;
		description?: string;
		instruction?: string;
		model?: string | null;
		modelVariant?: string | null;
		temperature?: number | null;
		allowedModels?: string | null;
		isDefault?: boolean;
	} = body as Record<string, unknown> as any;

	// Get current policy for validation
	const policy = await getOpenCodePolicy();

	// Validate preset data against policy
	const validation = validatePresetData(
		{ model: model ?? null, modelVariant: modelVariant ?? null, temperature: temperature ?? null, allowedModels: allowedModels ?? null },
		policy
	);

	if (!validation.valid) {
		apiFail('Validation failed', 400, validation.errors);
	}

	try {
		const updated = await updateImprovePreset(id, {
			name,
			description,
			instruction,
			model: model !== undefined ? model : undefined,
			modelVariant: modelVariant !== undefined ? modelVariant : undefined,
			temperature: temperature !== undefined ? temperature : undefined,
			allowedModels: allowedModels !== undefined ? allowedModels : undefined,
			isDefault: isDefault !== undefined ? (isDefault as boolean) : undefined,
			updatedBy: 'admin'
		});

		if (!updated) {
			apiFail('Failed to update improve preset', 404);
		}

		return apiSuccess(updated);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Failed to update improve preset:', err);
		apiFail('Failed to update improve preset', 500);
	}
};

/**
 * DELETE /api/admin/improve-presets/[id]
 * Delete an improve preset
 */
export const DELETE: RequestHandler = async (event) => {
	requireAdmin(event);
	const id = parseId(event.params.id);

	// Check if preset exists
	const existing = await getImprovePreset(id);
	if (!existing) apiFail('Improve preset not found', 404);

	try {
		const deleted = await deleteImprovePreset(id);
		if (!deleted) {
			apiFail('Failed to delete improve preset', 500);
		}

		return apiSuccess({ message: 'Improve preset deleted successfully' });
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Failed to delete improve preset:', err);
		apiFail('Failed to delete improve preset', 500);
	}
};
