import { db } from '../db/client';
import { adminSettings, type AdminSetting, type NewAdminSetting } from '../db/schema';
import { eq } from 'drizzle-orm';
import { JUDGE_MODEL, JUDGE_TEMPERATURE, IMPROVEMENT_TEMPERATURE } from '../constants';

// Default settings
const DEFAULT_SETTINGS = {
	// Model configurations (Claude Code Mux routing categories)
	judge_model: JUDGE_MODEL,
	improvement_model: JUDGE_MODEL, // Same as judge by default
	default_model: JUDGE_MODEL,
	think_model: JUDGE_MODEL,
	websearch_model: JUDGE_MODEL,
	background_model: JUDGE_MODEL,

	// Temperature settings
	judge_temperature: JUDGE_TEMPERATURE.toString(),
	improvement_temperature: IMPROVEMENT_TEMPERATURE.toString(),

	// Reasoning settings
	store_thinking: 'true',
	show_thinking: 'true',
	max_thinking_length: '10000',

	// Provider priority (comma-separated)
	provider_priority: 'anthropic,openrouter,minimax',

	// Display settings
	date_format: 'M j, Y', // Default: Jan 1, 2025
	purposes: 'development,writing,analysis,creative,general', // Purpose categories for prompts
	llm_providers: 'anthropic,openai,openrouter,minimax,deepseek,gemini', // LLM providers for prompts

	// OpenCode Policy Settings (new keys with opencode_ prefix)
	opencode_allowed_models: JSON.stringify([]), // Empty allowlist means all models from catalog are allowed
	opencode_improve_default_model: JUDGE_MODEL, // Default model for Improve workflow
	opencode_judge_default_model: JUDGE_MODEL, // Default model for Judge workflow
	opencode_improve_temperature: IMPROVEMENT_TEMPERATURE.toString(), // Temperature for Improve workflow
	opencode_judge_temperature: JUDGE_TEMPERATURE.toString() // Temperature for Judge workflow
};

export interface SettingUpdate {
	key: string;
	value: string;
	updatedBy?: string;
}

export interface SettingsByCategory {
	models: Record<string, string>;
	temperature: Record<string, string>;
	reasoning: Record<string, string>;
	providers: Record<string, string>;
	display: Record<string, string>;
}

/**
 * Get all settings grouped by category
 */
export async function getAllSettings(): Promise<SettingsByCategory> {
	const settings = await db.select().from(adminSettings);

	// If no settings exist, initialize with defaults
	if (settings.length === 0) {
		await initializeDefaultSettings();
		return getCategorizedSettings(
			Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
				id: 0,
				category: getCategoryForKey(key),
				key,
				value,
				updatedAt: new Date(),
				updatedBy: 'system'
			}))
		);
	}

	return getCategorizedSettings(settings);
}

/**
 * Get a single setting by key
 */
export async function getSetting(key: string): Promise<string | null> {
	const setting = await db.select().from(adminSettings).where(eq(adminSettings.key, key)).limit(1);

	if (setting.length === 0) {
		// Return default if exists
		return DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS] || null;
	}

	return setting[0].value;
}

/**
 * Update a setting
 */
export async function updateSetting(data: SettingUpdate, tx?: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]): Promise<AdminSetting> {
	const { key, value, updatedBy = 'admin' } = data;
	const executor = tx || db;

	// Check if setting exists
	const existing = await executor.select().from(adminSettings).where(eq(adminSettings.key, key)).limit(1);

	if (existing.length > 0) {
		// Update existing
		const updated = await executor
			.update(adminSettings)
			.set({
				value,
				updatedAt: new Date(),
				updatedBy
			})
			.where(eq(adminSettings.key, key))
			.returning();

		return updated[0];
	} else {
		// Insert new
		const category = getCategoryForKey(key);
		const inserted = await executor
			.insert(adminSettings)
			.values({
				category,
				key,
				value,
				updatedBy
			})
			.returning();

		return inserted[0];
	}

}
/**
 * Update multiple settings at once
 */
export async function updateMultipleSettings(updates: SettingUpdate[]): Promise<AdminSetting[]> {
	return await db.transaction(async (tx) => {
		const results: AdminSetting[] = [];

		for (const update of updates) {
			const result = await updateSetting(update, tx);
			results.push(result);
		}

		return results;
	});
}

/**
 * Reset all settings to defaults
 */
export async function resetToDefaults(): Promise<void> {
	await db.transaction(async (tx) => {
		// Delete all existing settings
		await tx.delete(adminSettings);

		// Insert defaults
		await initializeDefaultSettings(tx);
	});
}

/**
 * Reset a specific setting to default
 */
export async function resetSetting(key: string): Promise<AdminSetting | null> {
	const defaultValue = DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS];

	if (!defaultValue) {
		return null;
	}

	return await updateSetting({
		key,
		value: defaultValue,
		updatedBy: 'system'
	});
}

/**
 * Initialize default settings in database
 */
async function initializeDefaultSettings(
	tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db
): Promise<void> {
	const settingsToInsert: NewAdminSetting[] = Object.entries(DEFAULT_SETTINGS).map(
		([key, value]) => ({
			category: getCategoryForKey(key),
			key,
			value,
			updatedBy: 'system'
		})
	);

	await tx.insert(adminSettings).values(settingsToInsert);
}

/**
 * Determine category for a setting key
 */
function getCategoryForKey(key: string): string {
	if (key.includes('model')) {
		return 'models';
	}
	if (key.includes('temperature')) {
		return 'temperature';
	}
	if (key.includes('thinking') || key.includes('store_') || key.includes('show_')) {
		return 'reasoning';
	}
	if (key.includes('provider')) {
		return 'providers';
	}
	if (key.includes('date') || key.includes('format')) {
		return 'display';
	}
	return 'other';
}

/**
 * Group settings by category
 */
function getCategorizedSettings(settings: AdminSetting[]): SettingsByCategory {
	const result: SettingsByCategory = {
		models: {},
		temperature: {},
		reasoning: {},
		providers: {},
		display: {}
	};

	for (const setting of settings) {
		const category = setting.category as keyof SettingsByCategory;
		if (category in result) {
			result[category][setting.key] = setting.value;
		}
	}

	return result;
}

/**
 * Validate setting value based on key
 */
export function validateSettingValue(
	key: string,
	value: string
): { valid: boolean; error?: string } {
	// Temperature validation
	if (key.includes('temperature')) {
		const temp = parseFloat(value);
		if (isNaN(temp) || temp < 0 || temp > 1) {
			return { valid: false, error: 'Temperature must be between 0 and 1' };
		}
	}

	// Max thinking length validation
	if (key === 'max_thinking_length') {
		const length = parseInt(value, 10);
		if (isNaN(length) || length < 0) {
			return { valid: false, error: 'Max thinking length must be a positive number' };
		}
	}

	// Boolean validation
	if (key === 'store_thinking' || key === 'show_thinking') {
		if (value !== 'true' && value !== 'false') {
			return { valid: false, error: 'Value must be "true" or "false"' };
		}
	}

	// Model name validation
	if (key.includes('model')) {
		if (!value || value.trim().length === 0) {
			return { valid: false, error: 'Model name cannot be empty' };
		}
	}

	// OpenCode allowed models validation (must be valid JSON array)
	if (key === 'opencode_allowed_models') {
		try {
			const parsed = JSON.parse(value);
			if (!Array.isArray(parsed)) {
				return { valid: false, error: 'opencode_allowed_models must be a JSON array' };
			}
			// Validate each item is a non-empty string
			for (const item of parsed) {
				if (typeof item !== 'string' || item.trim().length === 0) {
					return {
						valid: false,
						error: 'All model IDs in opencode_allowed_models must be non-empty strings'
					};
				}
			}
		} catch (e) {
			return { valid: false, error: 'opencode_allowed_models must be valid JSON array' };
		}
	}

	return { valid: true };
}

/**
 * OpenCode Policy Interface
 * Simple: allowed models + allowed variants per model
 */
export interface OpenCodePolicy {
	allowedModels: string[];
	improveDefaultModel: string;
	judgeDefaultModel: string;
	improveTemperature: number;
	judgeTemperature: number;
	// Variant whitelist: model -> allowed variants
	allowedVariants?: Record<string, string[]>;
}

/**
 * Get OpenCode policy with backward compatibility fallback
 * Reads OpenCode keys first, falls back to legacy keys if not set
 */
export async function getOpenCodePolicy(): Promise<OpenCodePolicy> {
	// Try OpenCode keys first
	const opencodeAllowedModels = await getSetting('opencode_allowed_models');
	const opencodeImproveModel = await getSetting('opencode_improve_default_model');
	const opencodeJudgeModel = await getSetting('opencode_judge_default_model');
	const opencodeImproveTemp = await getSetting('opencode_improve_temperature');
	const opencodeJudgeTemp = await getSetting('opencode_judge_temperature');

	// Variant-aware policy keys (SPEC-14)
	const opencodeScopeMatrix = await getSetting('opencode_allowed_models_matrix');
	const opencodeAllowedVariants = await getSetting('opencode_allowed_model_variants');

	// Fallback to legacy keys if OpenCode keys are not set or have default values
	const allowedModels = opencodeAllowedModels ? JSON.parse(opencodeAllowedModels) : [];

	const improveDefaultModel =
		opencodeImproveModel || (await getSetting('improvement_model')) || JUDGE_MODEL;
	const judgeDefaultModel = opencodeJudgeModel || (await getSetting('judge_model')) || JUDGE_MODEL;
	const improveTemperature = opencodeImproveTemp
		? parseFloat(opencodeImproveTemp)
		: parseFloat(
				(await getSetting('improvement_temperature')) || IMPROVEMENT_TEMPERATURE.toString()
			);
	const judgeTemperature = opencodeJudgeTemp
		? parseFloat(opencodeJudgeTemp)
		: parseFloat((await getSetting('judge_temperature')) || JUDGE_TEMPERATURE.toString());

	// Parse variant-aware policy keys
	let scopeMatrix: Record<string, Record<string, boolean>> | undefined;
	let allowedVariants: Record<string, string[]> | undefined;

	try {
		if (opencodeScopeMatrix) {
			scopeMatrix = JSON.parse(opencodeScopeMatrix);
		}
	} catch (e) {
		console.error('Failed to parse opencode_allowed_models_matrix:', e);
	}

	try {
		if (opencodeAllowedVariants) {
			allowedVariants = JSON.parse(opencodeAllowedVariants);
		}
	} catch (e) {
		console.error('Failed to parse opencode_allowed_model_variants:', e);
	}

	return {
		allowedModels,
		improveDefaultModel,
		judgeDefaultModel,
		improveTemperature,
		judgeTemperature,
		allowedVariants
	};
}

/**
 * Validate model ID against policy
 * @param modelId - The model ID to validate
 * @param policy - The OpenCode policy to validate against
 * @returns true if model is allowed, false otherwise
 */
export function isModelAllowed(modelId: string, policy: OpenCodePolicy): boolean {
	// If no allowlist is defined, all models are allowed
	if (policy.allowedModels.length === 0) {
		return true;
	}
	// Check if model is in the allowlist
	return policy.allowedModels.includes(modelId);
}
