import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getFunctionDefault,
	updateFunctionDefaultByType,
	type FunctionType
} from '$lib/server/services/function-defaults.service';
import { validateFunctionSettingUpdate } from '$lib/validators/function-settings';
import { authenticateRequest } from '$lib/server/auth.helper';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { getProviderCatalog, type ProviderInfo } from '$lib/server/services/opencode.service';
import {
	validateModelVariantScope,
	type PolicyScope,
	type PolicyData,
	type CatalogData,
	type CatalogModel
} from '$lib/server/validators/model-variant.validator';

// Valid function types
const VALID_FUNCTION_TYPES: FunctionType[] = ['executor', 'judge', 'improve', 'council'];

/**
 * GET /api/admin/function-defaults/[type]
 * Fetch a single function default by type
 */
export const GET: RequestHandler = async (event) => {
	// Require authentication
	authenticateRequest(event);

	const { type } = event.params;

	// Validate function type
	if (!VALID_FUNCTION_TYPES.includes(type as FunctionType)) {
		throw error(
			404,
			JSON.stringify({
				message: `Function type '${type}' not found`,
				errors: { type: 'Invalid function type. Must be one of: executor, judge, improve, council' }
			})
		);
	}

	try {
		const defaultSetting = await getFunctionDefault(type as FunctionType);

		if (!defaultSetting) {
			throw error(
				404,
				JSON.stringify({
					message: `Function default for type '${type}' not found`,
					errors: null
				})
			);
		}

		return json({ data: defaultSetting });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err instanceof Error && err.message.includes('404')) {
			throw err;
		}
		console.error('Failed to fetch function default:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to fetch function default',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};

/**
 * PUT /api/admin/function-defaults/[type]
 * Update a function default by type with validation
 */
export const PUT: RequestHandler = async (event) => {
	// Require authentication
	authenticateRequest(event);

	const { type } = event.params;

	// Validate function type
	if (!VALID_FUNCTION_TYPES.includes(type as FunctionType)) {
		throw error(
			404,
			JSON.stringify({
				message: `Function type '${type}' not found`,
				errors: { type: 'Invalid function type. Must be one of: executor, judge, improve, council' }
			})
		);
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	// Validate the update data
	const validation = validateFunctionSettingUpdate(body as Record<string, unknown>);

	if (!validation.success) {
		throw error(
			400,
			JSON.stringify({
				message: 'Validation failed',
				errors: validation.errors
			})
		);
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
				throw error(
					httpStatus,
					JSON.stringify({
						message: variantValidation.error?.message || 'Model/variant validation failed',
						code: errorCode,
						errors: { modelVariant: variantValidation.error?.message }
					})
				);
			}
		}

		// Log the update for audit purposes
		const authUser = event.locals.auth?.user;
		console.log(
			`[AUDIT] User ${authUser?.id || 'unknown'} (${authUser?.email || 'unknown'}) updating function default: ${type}`,
			updateData
		);

		const updated = await updateFunctionDefaultByType(type as FunctionType, updateData);
		return json({ data: updated });
	} catch (err) {
		// Re-throw SvelteKit HttpError (has status property)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Failed to update function default:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to update function default',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};
