import type { RequestHandler } from './$types';
import {
	getAllImprovePresets,
	createImprovePreset,
	validatePresetData
} from '$lib/server/services/improve-presets.service';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { requireAdmin } from '$lib/server/auth.helper';
import { parseJsonBody } from '$lib/server/utils/validate-request';
import { apiSuccess, apiCreated, apiFail } from '$lib/server/utils/api-response';

/**
 * GET /api/admin/improve-presets
 * Fetch all improve presets
 */
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);

	try {
		const presets = await getAllImprovePresets();
		return apiSuccess(presets);
	} catch (err) {
		console.error('Failed to fetch improve presets:', err);
		apiFail('Failed to fetch improve presets', 500);
	}
};

/**
 * POST /api/admin/improve-presets
 * Create a new improve preset
 */
export const POST: RequestHandler = async (event) => {
	requireAdmin(event);

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
		name: string;
		description?: string;
		instruction: string;
		model?: string | null;
		modelVariant?: string | null;
		temperature?: number | null;
		allowedModels?: string | null;
		isDefault?: boolean;
	} = body as Record<string, unknown> as any;

	// Validate required fields
	if (!name || !instruction) {
		apiFail('Missing required fields: name and instruction are required', 400);
	}

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
		// Create preset
		const preset = await createImprovePreset({
			name,
			description: description || null,
			instruction,
			model: model || null,
			modelVariant: modelVariant || null,
			temperature: temperature ?? null,
			allowedModels: allowedModels || null,
			isDefault: (isDefault as boolean) || false,
			updatedBy: 'admin'
		});

		return apiCreated(preset);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Failed to create improve preset:', err);
		apiFail('Failed to create improve preset', 500);
	}
};
