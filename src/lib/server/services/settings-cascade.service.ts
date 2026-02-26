import { db } from '../db/client';
import {
	promptFunctionSettings,
	type PromptFunctionSetting,
	type NewPromptFunctionSetting
} from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { getFunctionDefault, type FunctionType } from './function-defaults.service';

// Cascade level type
export type CascadeLevel = 'run' | 'prompt' | 'default';

// Resolved setting with source tracking
export interface ResolvedSetting<T> {
	value: T;
	source: CascadeLevel;
}

// Resolution result for all settings
export interface ResolutionResult {
	modelId: ResolvedSetting<string>;
	modelVariant: ResolvedSetting<string | null>;
	temperature: ResolvedSetting<number>;
	maxTokens: ResolvedSetting<number>;
	promptId: number | null;
}

// Run-level overrides (highest priority)
export interface RunOverrides {
	modelId?: string;
	modelVariant?: string | null;
	temperature?: number;
	maxTokens?: number;
}

// Options for resolution
export interface ResolveOptions {
	functionType: FunctionType;
	promptId?: number;
	runOverrides?: RunOverrides;
}

/**
 * Get prompt-level function settings override
 */
export async function getPromptFunctionSettings(
	promptId: number,
	functionType: FunctionType
): Promise<PromptFunctionSetting | null> {
	const result = await db
		.select()
		.from(promptFunctionSettings)
		.where(
			and(
				eq(promptFunctionSettings.promptId, promptId),
				eq(promptFunctionSettings.functionType, functionType)
			)
		)
		.limit(1);

	return result.length > 0 ? result[0] : null;
}

/**
 * Resolve a single setting through the cascade
 * Priority: run > prompt > default
 */
function resolveSetting<T>(
	runValue: T | undefined,
	promptValue: T | null | undefined,
	defaultValue: T,
	settingName: string
): ResolvedSetting<T> {
	// Run-level override (highest priority)
	if (runValue !== undefined) {
		return {
			value: runValue,
			source: 'run'
		};
	}

	// Prompt-level override
	if (promptValue !== null && promptValue !== undefined) {
		return {
			value: promptValue,
			source: 'prompt'
		};
	}

	// Global default (always guaranteed)
	return {
		value: defaultValue,
		source: 'default'
	};
}

/**
 * Resolve all function settings through the 3-level cascade
 *
 * Cascade precedence:
 * 1. Run overrides (highest) - per-execution parameters
 * 2. Prompt overrides - per-prompt settings stored in DB
 * 3. Global defaults - function_defaults table
 *
 * Always returns a valid result (defaults are guaranteed)
 */
export async function resolveFunctionSettings(options: ResolveOptions): Promise<ResolutionResult> {
	const { functionType, promptId, runOverrides = {} } = options;

	// Get global default (always exists after seeding)
	const globalDefault = await getFunctionDefault(functionType);

	if (!globalDefault) {
		throw new Error(
			`No global default found for function type: ${functionType}. Run seedDefaultFunctionSettings() first.`
		);
	}

	// Get prompt-level override if promptId provided
	let promptSettings: PromptFunctionSetting | null = null;
	if (promptId) {
		promptSettings = await getPromptFunctionSettings(promptId, functionType);
	}

	// Resolve each setting through cascade
	const modelId = resolveSetting(
		runOverrides.modelId,
		promptSettings?.modelOverride,
		globalDefault.modelId,
		'modelId'
	);

	const modelVariant = resolveSetting(
		runOverrides.modelVariant ?? undefined,
		promptSettings?.modelVariantOverride,
		globalDefault.modelVariant,
		'modelVariant'
	);

	const temperature = resolveSetting(
		runOverrides.temperature,
		promptSettings?.temperature,
		globalDefault.temperature,
		'temperature'
	);

	const maxTokens = resolveSetting(
		runOverrides.maxTokens,
		promptSettings?.maxTokens,
		globalDefault.maxTokens,
		'maxTokens'
	);

	// Prompt link comes from either prompt settings or global default
	const effectivePromptId = promptSettings?.promptLinkId ?? globalDefault.promptId;

	return {
		modelId,
		modelVariant,
		temperature,
		maxTokens,
		promptId: effectivePromptId
	};
}

/**
 * Resolve settings for a specific prompt without run overrides
 * Convenience method for preview/validation scenarios
 */
export async function resolvePromptFunctionSettings(
	promptId: number,
	functionType: FunctionType
): Promise<ResolutionResult> {
	return resolveFunctionSettings({
		functionType,
		promptId
	});
}

/**
 * Get the effective model ID only (optimized for model selection)
 */
export async function resolveEffectiveModelId(
	functionType: FunctionType,
	promptId?: number,
	runModelOverride?: string
): Promise<string> {
	const result = await resolveFunctionSettings({
		functionType,
		promptId,
		runOverrides: runModelOverride ? { modelId: runModelOverride } : undefined
	});

	return result.modelId.value;
}

/**
 * Check if a prompt has custom settings for a function type
 */
export async function hasPromptFunctionOverride(
	promptId: number,
	functionType: FunctionType
): Promise<boolean> {
	const settings = await getPromptFunctionSettings(promptId, functionType);
	return settings !== null;
}

/**
 * Get all prompt function settings for a prompt (all function types)
 */
export async function getAllPromptFunctionSettings(
	promptId: number
): Promise<PromptFunctionSetting[]> {
	const result = await db
		.select()
		.from(promptFunctionSettings)
		.where(eq(promptFunctionSettings.promptId, promptId));

	return result;
}

// Update type for prompt function settings
export type UpdatePromptFunctionSetting = Partial<
	Omit<NewPromptFunctionSetting, 'id' | 'promptId' | 'functionType' | 'createdAt' | 'updatedAt'>
>;

/**
 * Upsert prompt function settings (create or update)
 */
export async function upsertPromptFunctionSettings(
	promptId: number,
	functionType: FunctionType,
	data: UpdatePromptFunctionSetting
): Promise<PromptFunctionSetting> {
	// Check if settings already exist
	const existing = await getPromptFunctionSettings(promptId, functionType);

	if (existing) {
		// Update existing
		const updated = await db
			.update(promptFunctionSettings)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(promptFunctionSettings.id, existing.id))
			.returning();

		if (updated.length === 0) {
			throw new Error(`Failed to update prompt function settings for prompt ${promptId}`);
		}

		return updated[0];
	}

	// Create new
	const inserted = await db
		.insert(promptFunctionSettings)
		.values({
			promptId,
			functionType,
			...data
		})
		.returning();

	if (inserted.length === 0) {
		throw new Error(`Failed to create prompt function settings for prompt ${promptId}`);
	}

	return inserted[0];
}

/**
 * Delete prompt function settings (remove override)
 */
export async function deletePromptFunctionSettings(
	promptId: number,
	functionType: FunctionType
): Promise<boolean> {
	const existing = await getPromptFunctionSettings(promptId, functionType);

	if (!existing) {
		return false; // Nothing to delete
	}

	await db.delete(promptFunctionSettings).where(eq(promptFunctionSettings.id, existing.id));

	return true;
}
