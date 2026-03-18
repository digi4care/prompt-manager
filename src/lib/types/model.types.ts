/**
 * Model Selection Types - SINGLE SOURCE OF TRUTH
 *
 * All model-related interfaces used across the application.
 * Import from '$lib/types/model.types' - DO NOT duplicate these elsewhere.
 */

// ===== CORE MODEL TYPES =====

export interface ModelVariant {
	id: string;
	label?: string;
	isDefault?: boolean;
}

export interface Model {
	id: string;
	name: string;
	provider: string;
	providerId: string;
	logo?: string;
	variants?: ModelVariant[];
	supportsThinking?: boolean;
	/** Model description (for UI display) */
	description?: string;
	/** Context window size in tokens */
	contextWindow?: number;
	/** Whether model supports vision/image input */
	supportsVision?: boolean;
	/** Model status (active, deprecated, etc.) */
	status?: 'active' | 'deprecated' | 'beta' | 'preview';
	/** Rate limit or usage limit */
	limit?: number | string;
}

export interface ProviderGroup {
	providerName: string;
	providerId: string;
	logo?: string;
	models: Model[];
}

// ===== CONFIG TYPES =====

export interface ModelSelectionConfig {
	/** Show variant dropdown when model has variants */
	showVariants: boolean;
	/** Show thinking level selector for models that support it */
	showThinkingLevel: boolean;
	/** Show temperature input */
	showTemperature: boolean;
	/** Show max tokens input */
	showMaxTokens: boolean;
	/** Show prompt link dropdown */
	showPromptLink: boolean;
	/** Enable whitelist filtering */
	enableWhitelist: boolean;
	/** Allow multiple model selection in modal */
	multiSelect: boolean;
	/** Modal title override */
	modalTitle?: string;
}

/**
 * Default configuration - used as base, override per use case
 */
export const DEFAULT_MODEL_SELECTION_CONFIG: ModelSelectionConfig = {
	showVariants: true,
	showThinkingLevel: true,
	showTemperature: true,
	showMaxTokens: true,
	showPromptLink: false,
	enableWhitelist: true,
	multiSelect: false
};

// ===== VALUE TYPES =====

export type ThinkingLevel = 'low' | 'medium' | 'high';

// ===== MODEL SETTINGS (per model selection) =====

export interface ModelSettings {
	temperature?: number;
	maxTokens?: number;
	thinkingLevel?: ThinkingLevel | null;
	modelVariant?: string | null;
	promptLinkId?: number | null;
}

// ===== COMPLETE MODEL SELECTION (model + settings) =====

export interface ModelSelection {
	modelId: string;
	modelName: string;
	providerId: string;
	logo?: string;
	settings: ModelSettings;
}

// ===== MODAL EVENT TYPES =====

export interface ModelSelectEvent {
	model: Model;
	settings: ModelSettings;
}

export interface MultiModelSelectEvent {
	selections: ModelSelection[];
}

// ===== LEGACY COMPAT (for gradual migration) =====

/**
 * @deprecated Use Model instead - this is for backwards compatibility
 */
export interface LegacyModel {
	id: string;
	name: string;
	provider: string;
	logo?: string;
	variants?: ModelVariant[];
	supports_thinking?: boolean;
}

/**
 * Convert legacy model to new format
 */
export function normalizeModel(legacy: LegacyModel, providerId: string): Model {
	const providerStr = typeof legacy.provider === 'string' ? legacy.provider : 'unknown';
	return {
		id: legacy.id,
		name: legacy.name,
		provider: providerStr,
		providerId: providerId || providerStr.toLowerCase(),
		logo: legacy.logo,
		variants: legacy.variants,
		supportsThinking: legacy.supports_thinking ?? false
	};
}

/**
 * Normalize various model data formats to ProviderGroup[]
 * Handles: variantOptions, variants, variant_options, reasoningEffortLevels
 */
export function normalizeToProviderGroups(
	rawModels: Record<string, unknown>[] | undefined
): ProviderGroup[] {
	if (!rawModels || !Array.isArray(rawModels)) return [];

	const providerMap = new Map<string, ProviderGroup>();

	for (const raw of rawModels) {
		const rawProvider = raw.provider;
		const providerStr = typeof rawProvider === 'string' ? rawProvider : 'unknown';
		const provider = String(rawProvider || raw.providerId || 'unknown');
		const providerId = String(
			raw.providerId ||
				(typeof rawProvider === 'string' ? rawProvider.toLowerCase() : provider.toLowerCase())
		);
		const model: Model = {
			id: String(raw.id || raw.modelId || ''),
			name: String(raw.name || raw.modelName || raw.id || ''),
			provider,
			providerId,
			logo: raw.logo ? String(raw.logo) : undefined,
			supportsThinking: Boolean(
				raw.supportsThinking ?? raw.supports_thinking ?? raw.supports_thinking_level
			),
			variants: normalizeVariants(raw),
			// Extended properties
			description: raw.description ? String(raw.description) : undefined,
			contextWindow: raw.context_window
				? Number(raw.context_window)
				: raw.contextWindow
					? Number(raw.contextWindow)
					: undefined,
			supportsVision: Boolean(raw.supports_vision ?? raw.supportsVision),
			status: (raw.status as Model['status']) || undefined,
			limit: raw.limit != null ? String(raw.limit) : undefined
		};

		if (!providerMap.has(providerId)) {
			providerMap.set(providerId, {
				providerName: provider,
				providerId,
				logo: raw.providerLogo ? String(raw.providerLogo) : undefined,
				models: []
			});
		}
		providerMap.get(providerId)!.models.push(model);
	}

	return Array.from(providerMap.values());
}

function normalizeVariants(raw: Record<string, unknown>): ModelVariant[] | undefined {
	const rawVariants = raw.variants;
	if (rawVariants && typeof rawVariants === 'object' && !Array.isArray(rawVariants)) {
		const variantKeys = Object.keys(rawVariants);
		if (variantKeys.length > 0) {
			return variantKeys.map((key) => ({ id: key, label: key }));
		}
	}

	const variants =
		(raw.variants as ModelVariant[] | undefined) ||
		(raw.variantOptions as string[] | undefined) ||
		(raw.variant_options as string[] | undefined) ||
		(raw.reasoningEffortLevels as string[] | undefined);

	if (!variants) return undefined;
	if (typeof variants[0] === 'string') {
		return (variants as string[]).map((v) => ({ id: v, label: v }));
	}
	return variants as ModelVariant[];
}
