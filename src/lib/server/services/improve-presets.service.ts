import { db } from '../db/client';
import { improvePresets, type ImprovePreset, type NewImprovePreset } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { OpenCodePolicy } from './admin-settings.service';
import { isModelAllowed } from './admin-settings.service';

/**
 * Create a new improve preset
 */
export async function createImprovePreset(
	data: Omit<NewImprovePreset, 'updatedAt' | 'createdAt' | 'updatedBy'> & { updatedBy?: string }
): Promise<ImprovePreset> {
	const { updatedBy = 'admin', ...presetData } = data;

	const inserted = await db
		.insert(improvePresets)
		.values({
			...presetData,
			updatedBy,
			createdAt: new Date(),
			updatedAt: new Date()
		})
		.returning();

	return inserted[0];
}

/**
 * Get all improve presets
 */
export async function getAllImprovePresets(): Promise<ImprovePreset[]> {
	return await db.select().from(improvePresets).orderBy(improvePresets.name);
}

/**
 * Get improve preset by ID
 */
export async function getImprovePreset(id: number): Promise<ImprovePreset | null> {
	const result = await db.select().from(improvePresets).where(eq(improvePresets.id, id)).limit(1);
	return result.length > 0 ? result[0] : null;
}

/**
 * Get improve preset by name
 */
export async function getImprovePresetByName(name: string): Promise<ImprovePreset | null> {
	const result = await db
		.select()
		.from(improvePresets)
		.where(eq(improvePresets.name, name))
		.limit(1);
	return result.length > 0 ? result[0] : null;
}

/**
 * Get default improve preset
 */
export async function getDefaultImprovePreset(): Promise<ImprovePreset | null> {
	const result = await db
		.select()
		.from(improvePresets)
		.where(eq(improvePresets.isDefault, true))
		.limit(1);
	return result.length > 0 ? result[0] : null;
}

/**
 * Update improve preset
 */
export async function updateImprovePreset(
	id: number,
	data: Partial<
		Omit<NewImprovePreset, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'> & {
			updatedBy?: string;
		}
	>
): Promise<ImprovePreset | null> {
	const { updatedBy = 'admin', ...presetData } = data;

	// If setting isDefault to true, first unset all other defaults
	if (presetData.isDefault === true) {
		await db.update(improvePresets).set({ isDefault: false });
	}

	const updated = await db
		.update(improvePresets)
		.set({
			...presetData,
			updatedAt: new Date()
		})
		.where(eq(improvePresets.id, id))
		.returning();

	return updated.length > 0 ? updated[0] : null;
}

/**
 * Delete improve preset
 */
export async function deleteImprovePreset(id: number): Promise<boolean> {
	const result = await db.delete(improvePresets).where(eq(improvePresets.id, id)).returning();
	return result.length > 0;
}

/**
 * Validate preset data against policy
 */
export function validatePresetData(
	data: {
		model?: string | null;
		temperature?: number | null;
		allowedModels?: string | null;
	},
	policy: OpenCodePolicy
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// Validate model if provided
	if (data.model) {
		if (typeof data.model !== 'string' || data.model.trim().length === 0) {
			errors.push('Model cannot be empty');
		} else if (!isModelAllowed(data.model, policy)) {
			errors.push(`Model "${data.model}" is not in the allowed list`);
		}
	}

	// Validate temperature if provided
	if (data.temperature !== null && data.temperature !== undefined) {
		if (typeof data.temperature !== 'number' || !Number.isFinite(data.temperature)) {
			errors.push('Temperature must be a finite number');
		} else if (data.temperature < 0 || data.temperature > 2) {
			errors.push('Temperature must be between 0 and 2');
		}
	}

	// Validate allowedModels if provided
	if (data.allowedModels) {
		try {
			const parsed = JSON.parse(data.allowedModels);
			if (!Array.isArray(parsed)) {
				errors.push('allowedModels must be a JSON array');
			} else {
				// Validate each item is a non-empty string
				for (const item of parsed) {
					if (typeof item !== 'string' || item.trim().length === 0) {
						errors.push('All model IDs in allowedModels must be non-empty strings');
						break;
					}
				}
				// Validate all models in the preset allowlist are in global allowlist
				if (policy.allowedModels.length > 0) {
					const invalidModels = parsed.filter((m: string) => !policy.allowedModels.includes(m));
					if (invalidModels.length > 0) {
						errors.push(
							`Preset allowedModels includes models not in global allowlist: ${invalidModels.join(', ')}`
						);
					}
				}
			}
		} catch (e) {
			errors.push('allowedModels must be valid JSON array');
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Get preset with validated settings merged with policy defaults
 */
export async function getPresetWithDefaults(
	id: number | string,
	policy: OpenCodePolicy
): Promise<(ImprovePreset & { effectiveModel: string; effectiveTemperature: number }) | null> {
	let preset: ImprovePreset | null;

	if (typeof id === 'number') {
		preset = await getImprovePreset(id);
	} else {
		preset = await getImprovePresetByName(id);
	}

	if (!preset) {
		return null;
	}

	// Compute effective model
	let effectiveModel = policy.improveDefaultModel;
	if (preset.model) {
		// If preset has model, check if it's allowed
		let allowedModels = policy.allowedModels;
		if (preset.allowedModels) {
			try {
				const presetAllowedModels = JSON.parse(preset.allowedModels);
				if (Array.isArray(presetAllowedModels) && presetAllowedModels.length > 0) {
					// Use preset's allowedModels if specified
					allowedModels = presetAllowedModels;
				}
			} catch (e) {
				// Invalid JSON, fall back to policy
			}
		}

		// Check if preset's model is in effective allowlist
		if (allowedModels.length === 0 || allowedModels.includes(preset.model)) {
			effectiveModel = preset.model;
		}
	}

	// Compute effective temperature
	let effectiveTemperature = policy.improveTemperature;
	if (preset.temperature !== null && preset.temperature !== undefined) {
		effectiveTemperature = preset.temperature;
	}

	return {
		...preset,
		effectiveModel,
		effectiveTemperature
	};
}
