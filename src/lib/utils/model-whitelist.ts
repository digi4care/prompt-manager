/**
 * Model Whitelist Utility - SINGLE SOURCE OF TRUTH
 *
 * Whitelist filtering logic for model selection.
 * Import from '$lib/utils/model-whitelist' - DO NOT duplicate this elsewhere.
 */

import type { Model, ProviderGroup } from '$lib/types/model.types';

/**
 * Check if a model is in the whitelist
 *
 * Supports multiple whitelist formats:
 * - Full ID: "openai/gpt-4o"
 * - Partial ID: "gpt-4o" (matches any provider)
 * - Prefix match: "openai/gpt-4" (matches gpt-4, gpt-4o, gpt-4-turbo, etc.)
 *
 * Case-insensitive matching.
 */
export function isModelInWhitelist(
	modelId: string,
	providerId: string,
	whitelist: string[] | undefined | null
): boolean {
	// No whitelist = everything allowed
	if (!whitelist || whitelist.length === 0) return true;

	const fullId = `${providerId}/${modelId}`.toLowerCase();
	const modelIdLower = modelId.toLowerCase();

	return whitelist.some((allowed) => {
		const allowedLower = allowed.toLowerCase();

		// Full ID format: "provider/model"
		if (allowedLower.includes('/')) {
			// Exact match: "openai/gpt-4o"
			if (fullId === allowedLower) return true;
			// Prefix match: "openai/gpt-4" matches "openai/gpt-4o"
			if (fullId.startsWith(allowedLower)) return true;
			// Allow trailing slash prefix: "openai/gpt-4/"
			if (fullId.startsWith(allowedLower + '/')) return true;
			return false;
		}

		// Model ID only: "gpt-4o" (any provider)
		if (modelIdLower === allowedLower) return true;
		// Prefix match: "gpt-4" matches "gpt-4o"
		if (modelIdLower.startsWith(allowedLower)) return true;

		return false;
	});
}

/**
 * Filter provider groups to only include whitelisted models
 * Removes empty groups after filtering.
 */
export function filterProviderGroupsByWhitelist(
	groups: ProviderGroup[],
	whitelist: string[] | undefined | null
): ProviderGroup[] {
	if (!whitelist || whitelist.length === 0) return groups;

	return groups
		.map((group) => ({
			...group,
			models: group.models.filter((model) =>
				isModelInWhitelist(model.id, group.providerId, whitelist)
			)
		}))
		.filter((group) => group.models.length > 0);
}

/**
 * Filter a flat model array by whitelist
 */
export function filterModelsByWhitelist(
	models: Model[],
	whitelist: string[] | undefined | null
): Model[] {
	if (!whitelist || whitelist.length === 0) return models;

	return models.filter((model) => isModelInWhitelist(model.id, model.providerId, whitelist));
}

/**
 * Get list of allowed model IDs from a whitelist (for display/debugging)
 * Returns normalized format: "provider/modelId"
 */
export function getNormalizedWhitelistIds(whitelist: string[]): string[] {
	return whitelist.map((id) => id.toLowerCase());
}

/**
 * Check if whitelist is active (non-empty)
 */
export function isWhitelistActive(whitelist: string[] | undefined | null): boolean {
	return Boolean(whitelist && whitelist.length > 0);
}
