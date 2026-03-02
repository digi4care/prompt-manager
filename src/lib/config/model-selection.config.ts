/**
 * Model Selection Feature Flags Configuration
 *
 * Predefined configurations for different use cases.
 * Import from '$lib/config/model-selection.config' and merge with your needs.
 */

import type { ModelSelectionConfig } from '$lib/types/model.types';
import { DEFAULT_MODEL_SELECTION_CONFIG } from '$lib/types/model.types';

// ===== PREDEFINED CONFIGURATIONS =====

/**
 * Full-featured model selector with all options
 * Use for: Function defaults, Council members
 */
export const FULL_SELECTOR_CONFIG: ModelSelectionConfig = {
	...DEFAULT_MODEL_SELECTION_CONFIG,
	showVariants: true,
	showThinkingLevel: true,
	showTemperature: true,
	showMaxTokens: true,
	showPromptLink: true,
	enableWhitelist: true,
	multiSelect: false
};

/**
 * Minimal model selector (just model picking)
 * Use for: Simple model overrides
 */
export const MINIMAL_SELECTOR_CONFIG: ModelSelectionConfig = {
	...DEFAULT_MODEL_SELECTION_CONFIG,
	showVariants: false,
	showThinkingLevel: false,
	showTemperature: false,
	showMaxTokens: false,
	showPromptLink: false,
	enableWhitelist: true,
	multiSelect: false
};

/**
 * Model whitelist editor (multi-select, no settings)
 * Use for: Policy editor allowed models, Improve presets allowed models
 */
export const WHITELIST_EDITOR_CONFIG: ModelSelectionConfig = {
	...DEFAULT_MODEL_SELECTION_CONFIG,
	showVariants: true,
	showThinkingLevel: false,
	showTemperature: false,
	showMaxTokens: false,
	showPromptLink: false,
	enableWhitelist: false, // We're editing the whitelist itself
	multiSelect: true,
	modalTitle: 'Select Allowed Models'
};

/**
 * Policy matrix model selector
 * Use for: Policy editor model selection with scope toggles
 */
export const POLICY_SELECTOR_CONFIG: ModelSelectionConfig = {
	...DEFAULT_MODEL_SELECTION_CONFIG,
	showVariants: true,
	showThinkingLevel: false,
	showTemperature: false,
	showMaxTokens: false,
	showPromptLink: false,
	enableWhitelist: false,
	multiSelect: true,
	modalTitle: 'Select Models for Policy'
};

/**
 * Council member selector
 * Use for: Council members with all settings
 */
export const COUNCIL_MEMBER_CONFIG: ModelSelectionConfig = {
	...DEFAULT_MODEL_SELECTION_CONFIG,
	showVariants: true,
	showThinkingLevel: true,
	showTemperature: true,
	showMaxTokens: true,
	showPromptLink: true,
	enableWhitelist: true,
	multiSelect: false,
	modalTitle: 'Select Council Member Model'
};

/**
 * Executor/Judge/Improve selector
 * Use for: Function defaults per type
 */
export const FUNCTION_DEFAULTS_CONFIG: ModelSelectionConfig = {
	...DEFAULT_MODEL_SELECTION_CONFIG,
	showVariants: true,
	showThinkingLevel: true,
	showTemperature: true,
	showMaxTokens: true,
	showPromptLink: true,
	enableWhitelist: true,
	multiSelect: false
};

// ===== CONFIG BUILDER =====

/**
 * Create a custom config by merging with defaults
 */
export function createModelSelectionConfig(
	overrides: Partial<ModelSelectionConfig>
): ModelSelectionConfig {
	return {
		...DEFAULT_MODEL_SELECTION_CONFIG,
		...overrides
	};
}

/**
 * Merge a base config with overrides
 */
export function mergeModelSelectionConfig(
	base: ModelSelectionConfig,
	overrides: Partial<ModelSelectionConfig>
): ModelSelectionConfig {
	return {
		...base,
		...overrides
	};
}

// ===== CONFIG BY USE CASE =====

export type ModelSelectionUseCase =
	| 'full'
	| 'minimal'
	| 'whitelist-editor'
	| 'policy-selector'
	| 'council-member'
	| 'function-defaults';

/**
 * Get config by use case name
 */
export function getModelSelectionConfig(useCase: ModelSelectionUseCase): ModelSelectionConfig {
	switch (useCase) {
		case 'full':
			return FULL_SELECTOR_CONFIG;
		case 'minimal':
			return MINIMAL_SELECTOR_CONFIG;
		case 'whitelist-editor':
			return WHITELIST_EDITOR_CONFIG;
		case 'policy-selector':
			return POLICY_SELECTOR_CONFIG;
		case 'council-member':
			return COUNCIL_MEMBER_CONFIG;
		case 'function-defaults':
			return FUNCTION_DEFAULTS_CONFIG;
		default:
			return DEFAULT_MODEL_SELECTION_CONFIG;
	}
}
