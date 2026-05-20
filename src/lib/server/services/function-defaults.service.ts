import { db } from '../db/client';
import { functionDefaults, type FunctionDefault, type NewFunctionDefault } from '../db/schema';
import { eq } from 'drizzle-orm';

// Function type definition
export type FunctionType = 'executor' | 'judge' | 'improve' | 'council';

// Default function settings per type
const DEFAULT_FUNCTION_SETTINGS: Record<
	FunctionType,
	Omit<NewFunctionDefault, 'id' | 'createdAt' | 'updatedAt'>
> = {
	executor: {
		functionType: 'executor',
		modelId: '',
		temperature: 0.7,
		maxTokens: 4096,
		promptId: null
	},
	judge: {
		functionType: 'judge',
		modelId: '',
		temperature: 0.3,
		maxTokens: 2048,
		promptId: null
	},
	improve: {
		functionType: 'improve',
		modelId: '',
		temperature: 0.7,
		maxTokens: 4096,
		promptId: null
	},
	council: {
		functionType: 'council',
		modelId: '',
		temperature: 0.5,
		maxTokens: 8192,
		promptId: null
	}
};

// Update type for partial updates
export type UpdateFunctionDefault = Partial<
	Omit<NewFunctionDefault, 'id' | 'createdAt' | 'updatedAt'>
>;

/**
 * Get all function defaults (all 4 function types)
 */
export async function getFunctionDefaults(): Promise<FunctionDefault[]> {
	const defaults = await db.select().from(functionDefaults);
	return defaults;
}

/**
 * Get a single function default by type
 */
export async function getFunctionDefault(
	functionType: FunctionType
): Promise<FunctionDefault | null> {
	const result = await db
		.select()
		.from(functionDefaults)
		.where(eq(functionDefaults.functionType, functionType))
		.limit(1);

	return result.length > 0 ? result[0] : null;
}

/**
 * Get a single function default by ID
 */
export async function getFunctionDefaultById(id: number): Promise<FunctionDefault | null> {
	const result = await db
		.select()
		.from(functionDefaults)
		.where(eq(functionDefaults.id, id))
		.limit(1);

	return result.length > 0 ? result[0] : null;
}

/**
 * Update a function default by ID
 */
export async function updateFunctionDefault(
	id: number,
	data: UpdateFunctionDefault
): Promise<FunctionDefault> {
	const updated = await db
		.update(functionDefaults)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(functionDefaults.id, id))
		.returning();

	if (updated.length === 0) {
		throw new Error(`Function default with id ${id} not found`);
	}

	return updated[0];
}

/**
 * Update a function default by type
 */
export async function updateFunctionDefaultByType(
	functionType: FunctionType,
	data: UpdateFunctionDefault
): Promise<FunctionDefault> {
	const existing = await getFunctionDefault(functionType);

	if (!existing) {
		throw new Error(`Function default for type ${functionType} not found`);
	}

	return updateFunctionDefault(existing.id, data);
}

/**
 * Seed default function settings if they don't exist
 * Creates all 4 function types with their default values
 */
export async function seedDefaultFunctionSettings(): Promise<void> {
	const existing = await getFunctionDefaults();

	// Check which types are missing
	const existingTypes = new Set(existing.map((d) => d.functionType));
	const missingTypes = (['executor', 'judge', 'improve', 'council'] as FunctionType[]).filter(
		(t) => !existingTypes.has(t)
	);

	// Insert missing defaults in a transaction
	await db.transaction(async (tx) => {
		for (const functionType of missingTypes) {
			const defaultSettings = DEFAULT_FUNCTION_SETTINGS[functionType];
			await tx.insert(functionDefaults).values(defaultSettings);
		}
	});
}

/**
 * Reset a function type to its default values
 */
export async function resetFunctionDefault(functionType: FunctionType): Promise<FunctionDefault> {
	const defaultSettings = DEFAULT_FUNCTION_SETTINGS[functionType];
	return updateFunctionDefaultByType(functionType, {
		modelId: defaultSettings.modelId,
		temperature: defaultSettings.temperature,
		maxTokens: defaultSettings.maxTokens,
		promptId: defaultSettings.promptId
	});
}

/**
 * Check if function defaults are initialized
 */
export async function areFunctionDefaultsInitialized(): Promise<boolean> {
	const defaults = await getFunctionDefaults();
	return defaults.length === 4;
}
