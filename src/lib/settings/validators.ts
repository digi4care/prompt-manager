import { z } from 'zod';
import type { SettingType } from './types';

/**
 * Common validators for settings values
 */

/**
 * Create a schema based on setting type
 */
export function createTypeSchema(type: SettingType, options?: { enumValues?: string[] }) {
	switch (type) {
		case 'string':
			return z.string();
		case 'number':
			return z.number();
		case 'boolean':
			return z.boolean();
		case 'enum':
			if (!options?.enumValues?.length) {
				throw new Error('Enum type requires enumValues option');
			}
			return z.enum(options.enumValues as [string, ...string[]]);
		case 'array':
			return z.array(z.unknown());
		case 'object':
			return z.object({}).passthrough();
		default:
			throw new Error(`Unknown setting type: ${type}`);
	}
}

/**
 * String validators
 */
export const stringValidators = {
	/** Non-empty string */
	required: z.string().min(1, 'This field is required'),

	/** Optional string (can be empty) */
	optional: z.string().optional(),

	/** URL string */
	url: z.string().url('Must be a valid URL'),

	/** Hostname or IP address */
	hostname: z
		.string()
		.regex(
			/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$|^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
			'Must be a valid hostname or IP address'
		),

	/** Port number as string */
	port: z
		.string()
		.regex(/^[0-9]+$/, 'Must be a valid port number')
		.refine((val) => {
			const num = parseInt(val, 10);
			return num >= 1 && num <= 65535;
		}, 'Port must be between 1 and 65535'),

	/** API key (non-empty with minimum length) */
	apiKey: z.string().min(8, 'API key must be at least 8 characters'),

	/** Model ID format */
	modelId: z.string().min(1, 'Model ID is required')
};

/**
 * Number validators
 */
export const numberValidators = {
	/** Any number */
	any: z.number(),

	/** Temperature (0-2 range) */
	temperature: z
		.number()
		.min(0, 'Temperature must be at least 0')
		.max(2, 'Temperature must be at most 2'),

	/** Port number */
	port: z.number().int().min(1).max(65535),

	/** Positive integer */
	positiveInt: z.number().int().positive(),

	/** Non-negative integer */
	nonNegativeInt: z.number().int().nonnegative(),

	/** Percentage (0-100) */
	percentage: z.number().min(0).max(100),

	/** Probability (0-1) */
	probability: z.number().min(0).max(1)
};

/**
 * Array validators
 */
export const arrayValidators = {
	/** Non-empty array */
	nonEmpty: z.array(z.unknown()).min(1, 'At least one item is required'),

	/** String array */
	strings: z.array(z.string()),

	/** Number array */
	numbers: z.array(z.number()),

	/** Unique items (for string arrays) */
	uniqueStrings: z.array(z.string()).refine((items) => new Set(items).size === items.length, {
		message: 'All items must be unique'
	})
};

/**
 * Boolean validators
 */
export const booleanValidators = {
	/** Any boolean */
	any: z.boolean(),

	/** True only */
	true: z.literal(true),

	/** False only */
	false: z.literal(false)
};

/**
 * Connection validators
 */
export const connectionValidators = {
	/** Connection mode */
	mode: z.enum(['local', 'remote']),

	/** Connection status */
	status: z.enum(['disconnected', 'connecting', 'connected', 'error']),

	/** Local hostname */
	localHostname: stringValidators.hostname,

	/** Remote host URL */
	remoteHost: stringValidators.url
};

/**
 * Provider validators
 */
export const providerValidators = {
	/** Provider ID */
	providerId: z.string().min(1),

	/** Selected providers array */
	selectedProviders: z.array(z.string()).min(1, 'At least one provider must be selected')
};

/**
 * Model validators
 */
export const modelValidators = {
	/** Model ID */
	modelId: z.string().min(1, 'Model ID is required'),

	/** Selected model */
	selectedModel: z.string().min(1, 'Model selection is required'),

	/** Model catalog */
	catalog: z.record(z.unknown())
};

/**
 * Policy validators
 */
export const policyValidators = {
	/** Allowed models list */
	allowedModels: z.array(z.string()),

	/** Blocked models list */
	blockedModels: z.array(z.string())
};

/**
 * Default configuration validators
 */
export const defaultValidators = {
	/** Default model configuration */
	modelConfig: z.object({
		modelId: z.string().min(1),
		temperature: numberValidators.temperature.default(0.7),
		maxTokens: numberValidators.nonNegativeInt.optional()
	}),

	/** Executor defaults */
	executorDefaults: z.object({
		modelId: z.string(),
		temperature: numberValidators.temperature.default(0.7)
	}),

	/** Judge defaults */
	judgeDefaults: z.object({
		modelId: z.string(),
		temperature: numberValidators.temperature.default(0.3)
	})
};

/**
 * Create a conditional validator
 */
export function when<T>(
	condition: (value: T) => boolean,
	schema: z.ZodType<T>,
	message = 'Validation failed'
): z.ZodType<T> {
	return schema.refine(condition, { message });
}

/**
 * Create a nullable schema with default
 */
export function withDefault<T>(schema: z.ZodType<T>, defaultValue: T): z.ZodDefault<z.ZodType<T>> {
	return schema.default(defaultValue);
}

/**
 * Create an optional schema
 */
export function optional<T>(schema: z.ZodType<T>): z.ZodOptional<z.ZodType<T>> {
	return schema.optional();
}

/**
 * Combine multiple validators with AND logic
 */
export function allOf<T>(...schemas: z.ZodType<T>[]): z.ZodType<T> {
	return z.intersection(schemas[0], schemas[1]) as z.ZodType<T>;
}

/**
 * Export all validators as a collection
 */
export const validators = {
	string: stringValidators,
	number: numberValidators,
	array: arrayValidators,
	boolean: booleanValidators,
	connection: connectionValidators,
	provider: providerValidators,
	model: modelValidators,
	policy: policyValidators,
	default: defaultValidators
};

export default validators;
