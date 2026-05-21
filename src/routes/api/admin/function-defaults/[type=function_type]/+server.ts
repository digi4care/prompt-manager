import type { RequestHandler } from './$types';
import {
	getFunctionDefault,
	updateFunctionDefaultByType,
	type FunctionType
} from '$lib/server/services/function-defaults.service';
import { validateFunctionSettingUpdate } from '$lib/validators/function-settings';
import { requireAdmin } from '$lib/server/auth.helper';
import { parseJsonBody } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { getProviderCatalog, type ProviderInfo } from '$lib/server/services/opencode.service';
import {
	validateModelVariantScope,
	type PolicyScope,
	type PolicyData,
	type CatalogData
} from '$lib/server/validators/model-variant.validator';


/**
 * GET /api/admin/function-defaults/[type]
 * Fetch a single function default by type
 */
export const GET: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const type = event.params.type as FunctionType;

	try {
		const defaultSetting = await getFunctionDefault(type);

		if (!defaultSetting) {
			apiFail(`Function default for type '${type}' not found`, 404);
		}

		return apiSuccess(defaultSetting);
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Failed to fetch function default:', err);
		apiFail('Failed to fetch function default', 500);
	}
};

/**
 * PUT /api/admin/function-defaults/[type]
 * Update a function default by type with validation
 */
export const PUT: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const type = event.params.type as FunctionType;
	const body = await parseJsonBody(event);

	// Validate the update data
	const validation = validateFunctionSettingUpdate(body as Record<string, unknown>);

	if (!validation.success) {
		apiFail('Validation failed', 400, validation.errors);
	}

	try {
		// Combine modelId with modelProvider if both are provided
		let updateData = validation.data || {};
		if (updateData.modelProvider && updateData.modelId) {
			// Store modelId in format: provider/modelId
			updateData = {
				...updateData,
				modelId: `${updateData.modelProvider}/${updateData.modelId}`
			};
		}

		// Validate model+variant against policy and catalog (SPEC-14 AIC-008)
		if (updateData.modelId) {
			// Fetch policy and catalog for validation
			const [policy, catalog] = await Promise.all([getOpenCodePolicy(), getProviderCatalog()]);

			// Map function type to policy scope
			const scope: PolicyScope = type as PolicyScope;

			// Build policy data for validator
			const policyData: PolicyData = {
				allowedModels: policy.allowedModels || [],
				allowedVariants: policy.allowedVariants || {}
			};

			// Build catalog data for validator (cast from unknown[])
			const rawProviders = (catalog.providers || []) as ProviderInfo[];
			const providers: CatalogData['providers'] = rawProviders.map((p) => ({
				id: p.id,
				name: p.name,
				connected: true, // Assume connected if in catalog
				models: Object.entries(p.models || {}).map(([id, m]) => ({
					id,
					name: m.name,
					providerId: p.id,
					status: m.status,
					contextWindow: m.context_window,
					maxOutputTokens: m.limit?.output,
					variants: [] // Variants will be populated from policy.allowedVariants
				}))
			}));

			const catalogData: CatalogData = {
				providers,
				connectedProviderIds: rawProviders.map((p) => p.id)
			};

			// Validate model+variant combination
			const variantValidation = validateModelVariantScope({
				modelId: updateData.modelId,
				modelVariant: updateData.modelVariant,
				scope,
				policy: policyData,
				catalog: catalogData,
				requireConnected: true
			});

			if (!variantValidation.valid) {
				const errorCode = variantValidation.error?.code || 'MODEL_NOT_FOUND';
				const httpStatus = errorCode === 'VARIANT_REQUIRED' ? 400 : 422;
				apiFail(
					variantValidation.error?.message || 'Model/variant validation failed',
					httpStatus,
					{ code: errorCode, modelVariant: variantValidation.error?.message }
				);
			}
		}

		// Log the update for audit purposes
		console.log(
			`[AUDIT] User ${user.userId} (${user.email}) updating function default: ${type}`,
			updateData
		);

		const updated = await updateFunctionDefaultByType(type as FunctionType, updateData);
		return apiSuccess(updated);
	} catch (err) {
		// Re-throw SvelteKit HttpError (has status property)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to update function default:', err);
		apiFail('Failed to update function default', 500);
	}
};
