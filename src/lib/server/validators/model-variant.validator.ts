/**
 * Central validator for model + variant + scope constraints
 * Implements SPEC-14 variant-aware validation rules
 */

export type PolicyScope = 'executor' | 'judge' | 'improve' | 'council';
export type FunctionType = 'executor' | 'judge' | 'improve' | 'council';

/**
 * Policy data structure for validation
 * Simple: allowedModels + allowedVariants per model
 */
export interface PolicyData {
	allowedModels: string[];
	allowedVariants?: Record<string, string[]>;
}

export interface CatalogModel {
	id: string;
	name: string;
	providerId: string;
	status?: string;
	contextWindow?: number;
	maxOutputTokens?: number;
	capabilities?: {
		vision?: boolean;
		tools?: boolean;
		jsonMode?: boolean;
		streaming?: boolean;
		reasoning?: boolean;
	};
	variants?: Array<{ id: string; label?: string; isDefault?: boolean }>;
}

export interface CatalogProvider {
	id: string;
	name: string;
	connected: boolean;
	models: CatalogModel[];
}

/**
 * Catalog data for validation
 */
export interface CatalogData {
	providers: CatalogProvider[];
	connectedProviderIds?: string[];
}

export interface ValidationResult {
	valid: boolean;
	error?: ValidationErrorData;
	resolved?: {
		providerId: string;
		modelId: string;
		variantId?: string;
		availableVariants: string[];
	};
}

/**
 * Parse canonical model ID (provider/model)
 */
export function parseModelId(modelId: string): { providerId: string; modelId: string } | null {
	const parts = modelId.split('/');
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		return null;
	}
	return { providerId: parts[0], modelId: parts[1] };
}

/**
 * Format canonical model ID
 */
export function formatModelId(providerId: string, modelId: string): string {
	return `${providerId}/${modelId}`;
}

/**
 * Check if model is allowed by policy
 * Simple check: model must be in allowedModels (or allowlist is empty = allow all)
 */
export function isModelAllowedForScope(canonicalModelId: string, policy: PolicyData): boolean {
	// If no allowlist or empty, allow all models
	if (!policy.allowedModels || policy.allowedModels.length === 0) {
		return true;
	}

	// Check if model is in allowlist (exact or prefix match)
	return policy.allowedModels.some((allowed) => {
		return canonicalModelId === allowed || canonicalModelId.startsWith(allowed + '/');
	});
}

/**
 * Check if variant is allowed by policy for a given scope
 */
export function isVariantAllowedForScope(
	canonicalModelId: string,
	variantId: string,
	policy: PolicyData
): boolean {
	// If no variant restrictions defined, all variants are allowed
	if (!policy.allowedVariants) {
		return true;
	}

	const allowedVariants = policy.allowedVariants[canonicalModelId];

	// If no variant restrictions for this model, all variants are allowed
	if (!allowedVariants || allowedVariants.length === 0) {
		return true;
	}

	return allowedVariants.includes(variantId);
}

/**
 * Find model in catalog
 */
export function findModelInCatalog(
	canonicalModelId: string,
	catalog: CatalogData
): { provider: CatalogData['providers'][0]; model: CatalogModel } | null {
	const parsed = parseModelId(canonicalModelId);
	if (!parsed) return null;

	const provider = catalog.providers.find((p) => p.id === parsed.providerId);
	if (!provider) return null;

	const model = provider.models.find((m) => m.id === parsed.modelId || m.id === canonicalModelId);
	if (!model) return null;

	return { provider, model };
}

/**
 * Get available variants for a model
 */
export function getModelVariants(model: CatalogModel): string[] {
	if (!model.variants || model.variants.length === 0) {
		return [];
	}
	return model.variants.map((v) => v.id);
}

/**
 * Validate model + variant + scope combination
 * This is the main entry point for all variant-aware validation
 */
export function validateModelVariantScope(params: {
	modelId: string;
	modelVariant?: string | null;
	scope: PolicyScope;
	policy: PolicyData;
	catalog: CatalogData;
	requireConnected?: boolean;
}): ValidationResult {
	const { modelId, modelVariant, scope, policy, catalog, requireConnected = true } = params;

	// 1. Find model in catalog
	const found = findModelInCatalog(modelId, catalog);
	if (!found) {
		return {
			valid: false,
			error: {
				code: 'MODEL_NOT_FOUND',
				message: `Model "${modelId}" not found in catalog`
			}
		};
	}

	const { provider, model } = found;
	const availableVariants = getModelVariants(model);

	// 2. Check provider connection (if required)
	if (requireConnected && !provider.connected) {
		return {
			valid: false,
			error: {
				code: 'PROVIDER_NOT_CONNECTED',
				message: `Provider "${provider.id}" is not connected`
			}
		};
	}

	// 3. Check model allowed by policy
	if (!isModelAllowedForScope(modelId, policy)) {
		return {
			valid: false,
			error: {
				code: 'MODEL_NOT_ALLOWED',
				message: `Model "${modelId}" is not in the allowed list`
			}
		};
	}

	// 4. Determine required variants for this scope
	const policyAllowedVariants = policy.allowedVariants?.[modelId] || availableVariants;
	const effectiveVariants = availableVariants.filter((v) => policyAllowedVariants.includes(v));

	// 5. If model has multiple allowed variants, variant is required
	if (effectiveVariants.length > 1 && !modelVariant) {
		return {
			valid: false,
			error: {
				code: 'VARIANT_REQUIRED',
				message: `Model "${modelId}" has multiple variants. Please select one: ${effectiveVariants.join(', ')}`
			},
			resolved: {
				providerId: provider.id,
				modelId: model.id,
				availableVariants: effectiveVariants
			}
		};
	}

	// 6. If variant provided, validate it
	if (modelVariant) {
		// Check variant exists in catalog
		if (!availableVariants.includes(modelVariant)) {
			return {
				valid: false,
				error: {
					code: 'VARIANT_NOT_AVAILABLE',
					message: `Variant "${modelVariant}" is not available for model "${modelId}"`
				}
			};
		}

		// Check variant allowed by policy
		if (!isVariantAllowedForScope(modelId, modelVariant, policy)) {
			return {
				valid: false,
				error: {
					code: 'VARIANT_NOT_ALLOWED',
					message: `Variant "${modelVariant}" is not allowed for model "${modelId}"`
				}
			};
		}
	}

	// 7. Resolve effective variant
	const resolvedVariant =
		modelVariant || (effectiveVariants.length === 1 ? effectiveVariants[0] : undefined);

	return {
		valid: true,
		resolved: {
			providerId: provider.id,
			modelId: model.id,
			variantId: resolvedVariant,
			availableVariants: effectiveVariants
		}
	};
}

/**
 * Validation error codes (SPEC-14 AIC-010)
 */
export type ValidationErrorCode =
	| 'MODEL_NOT_FOUND'
	| 'PROVIDER_NOT_CONNECTED'
	| 'MODEL_NOT_ALLOWED'
	| 'VARIANT_REQUIRED'
	| 'VARIANT_NOT_ALLOWED'
	| 'VARIANT_NOT_AVAILABLE';

/**
 * Validation error details
 */
export interface ValidationErrorData {
	code: ValidationErrorCode;
	message: string;
}

/**
 * Validation error class for model/variant validation
 */
export class ModelVariantValidationError extends Error {
	constructor(
		public readonly code: ValidationErrorCode,
		message: string,
		public readonly details?: ValidationResult['resolved']
	) {
		super(message);
		this.name = 'ModelVariantValidationError';
	}

	toJSON() {
		return {
			name: this.name,
			code: this.code,
			message: this.message,
			details: this.details
		};
	}
}

/**
 * Validate and throw on error (convenience wrapper)
 */
export function validateModelVariantScopeOrThrow(params: {
	modelId: string;
	modelVariant?: string | null;
	scope: PolicyScope;
	policy: PolicyData;
	catalog: CatalogData;
	requireConnected?: boolean;
}): ValidationResult['resolved'] {
	const result = validateModelVariantScope(params);
	if (!result.valid) {
		const errorData = result.error;
		if (!errorData) {
			throw new ModelVariantValidationError(
				'MODEL_NOT_FOUND',
				'Validation failed without error details'
			);
		}
		throw new ModelVariantValidationError(errorData.code, errorData.message, result.resolved);
	}
	if (!result.resolved) {
		throw new ModelVariantValidationError('MODEL_NOT_FOUND', 'Unexpected validation state');
	}
	return result.resolved;
}
