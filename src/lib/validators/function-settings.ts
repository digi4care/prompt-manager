import { z } from 'zod';
import type { FunctionType } from '$lib/server/services/function-defaults.service';

// Function type schema
export const functionTypeSchema = z.enum(['executor', 'judge', 'improve', 'council']);

// Main function setting schema
export const functionSettingSchema = z.object({
	functionType: functionTypeSchema,
	modelId: z.string().min(1, 'Model is required'),
	modelProvider: z.string().optional(),
	temperature: z.number().min(0, 'Temperature must be >= 0').max(2, 'Temperature must be <= 2'),
	maxTokens: z
		.number()
		.int('Max tokens must be an integer')
		.min(1, 'Max tokens must be >= 1')
		.max(1000000, 'Max tokens must be <= 1000000'),
	promptId: z.number().int().positive().nullable().optional()
});

// Partial schema for updates
export const functionSettingUpdateSchema = functionSettingSchema.partial();

// Type for validated data
export type FunctionSettingData = z.infer<typeof functionSettingSchema>;

// Type for update data
export type FunctionSettingUpdateData = z.infer<typeof functionSettingUpdateSchema>;

// Validation result type
export interface ValidationResult<T> {
	success: boolean;
	errors: Record<string, string>;
	data: T | null;
}

/**
 * Validate complete function setting data
 */
export function validateFunctionSetting(
	data: Partial<FunctionSettingData>
): ValidationResult<FunctionSettingData> {
	const result = functionSettingSchema.safeParse(data);

	if (result.success) {
		return {
			success: true,
			errors: {},
			data: result.data
		};
	}

	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const path = issue.path.join('.');
		if (!errors[path]) {
			errors[path] = issue.message;
		}
	}

	return {
		success: false,
		errors,
		data: null
	};
}

/**
 * Validate partial function setting data for updates
 */
export function validateFunctionSettingUpdate(
	data: Partial<FunctionSettingUpdateData>
): ValidationResult<FunctionSettingUpdateData> {
	const result = functionSettingUpdateSchema.safeParse(data);

	if (result.success) {
		return {
			success: true,
			errors: {},
			data: result.data
		};
	}

	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const path = issue.path.join('.');
		if (!errors[path]) {
			errors[path] = issue.message;
		}
	}

	return {
		success: false,
		errors,
		data: null
	};
}

/**
 * Validate a single field for real-time feedback
 */
export function validateFunctionField(
	field: keyof FunctionSettingData,
	value: unknown
): string | null {
	// Create a partial object with just this field
	const testData: Record<string, unknown> = {};
	testData[field] = value;

	// Use partial schema for single field validation
	const result = functionSettingSchema.partial().safeParse(testData);

	if (result.success) {
		return null;
	}

	// Find errors for this specific field
	const issues = result.error.issues.filter((issue) => issue.path[0] === field);
	return issues.length > 0 ? issues[0].message : null;
}

/**
 * Validate function type value
 */
export function validateFunctionType(value: unknown): string | null {
	const result = functionTypeSchema.safeParse(value);
	return result.success ? null : 'Invalid function type';
}

/**
 * Validate model ID format
 * Expected format: 'providerID/modelID' (e.g., 'anthropic/claude-3-5-sonnet-20241022')
 */
export function validateModelId(modelId: string): string | null {
	if (!modelId || modelId.trim().length === 0) {
		return 'Model ID is required';
	}

	// Check basic format: should contain at least one '/' for provider/model
	if (!modelId.includes('/')) {
		return 'Model ID should be in format: provider/model';
	}

	const parts = modelId.split('/');
	if (parts.length < 2 || parts[0].length === 0 || parts[1].length === 0) {
		return 'Model ID should be in format: provider/model';
	}

	return null;
}

/**
 * Validate temperature value
 */
export function validateTemperature(temperature: number): string | null {
	if (typeof temperature !== 'number' || isNaN(temperature)) {
		return 'Temperature must be a number';
	}
	if (temperature < 0) {
		return 'Temperature must be >= 0';
	}
	if (temperature > 2) {
		return 'Temperature must be <= 2';
	}
	return null;
}

/**
 * Validate max tokens value
 */
export function validateMaxTokens(maxTokens: number): string | null {
	if (typeof maxTokens !== 'number' || isNaN(maxTokens)) {
		return 'Max tokens must be a number';
	}
	if (!Number.isInteger(maxTokens)) {
		return 'Max tokens must be an integer';
	}
	if (maxTokens < 1) {
		return 'Max tokens must be >= 1';
	}
	if (maxTokens > 1000000) {
		return 'Max tokens must be <= 1000000';
	}
	return null;
}
