/**
 * Backward Compatibility Layer
 * 
 * Provides utilities for migrating between legacy and new settings formats.
 * This ensures existing code continues to work while transitioning to the
 * Settings Schema Registry.
 */

import type { SettingsValues } from './types';

/**
 * Legacy settings structure (from database)
 */
export interface LegacySettings {
	connection?: {
		mode?: 'local' | 'remote';
		hostname?: string;
		port?: number;
		host?: string;
		apiKey?: string;
		status?: 'disconnected' | 'connecting' | 'connected' | 'error';
	};
	providers?: {
		selected?: string[];
		openai?: { apiKey?: string };
		anthropic?: { apiKey?: string };
		ollama?: { url?: string };
	};
	models?: {
		selected?: string;
		catalog?: Record<string, unknown>;
		favorites?: string[];
	};
	policy?: {
		allowedModels?: string[];
		blockedModels?: string[];
		requireApproval?: boolean;
		maxTokens?: number;
	};
	defaults?: {
		executor?: {
			modelId?: string;
			temperature?: number;
			maxTokens?: number;
		};
		judge?: {
			modelId?: string;
			temperature?: number;
			maxTokens?: number;
		};
		improve?: {
			modelId?: string;
			temperature?: number;
			maxTokens?: number;
		};
	};
	council?: {
		enabled?: boolean;
		members?: string[];
		consensusThreshold?: number;
	};
	review?: {
		requireApproval?: boolean;
		autoReview?: boolean;
	};
}

/**
 * Transform legacy settings to registry format
 */
export function legacyToRegistry(legacy: LegacySettings): SettingsValues {
	const registry: SettingsValues = {};

	// Connection
	if (legacy.connection) {
		registry['connection.mode'] = legacy.connection.mode ?? 'local';
		registry['connection.local.hostname'] = legacy.connection.hostname ?? '127.0.0.1';
		registry['connection.local.port'] = legacy.connection.port ?? 3000;
		registry['connection.remote.host'] = legacy.connection.host ?? '';
		registry['connection.remote.apiKey'] = legacy.connection.apiKey ?? '';
		registry['connection.status'] = legacy.connection.status ?? 'disconnected';
	}

	// Providers
	if (legacy.providers) {
		registry['providers.selected'] = legacy.providers.selected ?? [];
		registry['providers.openai.apiKey'] = legacy.providers.openai?.apiKey ?? '';
		registry['providers.anthropic.apiKey'] = legacy.providers.anthropic?.apiKey ?? '';
		registry['providers.ollama.url'] = legacy.providers.ollama?.url ?? 'http://localhost:11434';
	}

	// Models
	if (legacy.models) {
		registry['models.selected'] = legacy.models.selected ?? '';
		registry['models.catalog'] = legacy.models.catalog ?? {};
		registry['models.favorites'] = legacy.models.favorites ?? [];
	}

	// Policy
	if (legacy.policy) {
		registry['policy.allowedModels'] = legacy.policy.allowedModels ?? [];
		registry['policy.blockedModels'] = legacy.policy.blockedModels ?? [];
		registry['policy.requireApproval'] = legacy.policy.requireApproval ?? false;
		registry['policy.maxTokens'] = legacy.policy.maxTokens ?? 4096;
	}

	// Defaults
	if (legacy.defaults) {
		registry['defaults.executor.modelId'] = legacy.defaults.executor?.modelId ?? '';
		registry['defaults.executor.temperature'] = legacy.defaults.executor?.temperature ?? 0.7;
		registry['defaults.executor.maxTokens'] = legacy.defaults.executor?.maxTokens ?? 4096;
		registry['defaults.judge.modelId'] = legacy.defaults.judge?.modelId ?? '';
		registry['defaults.judge.temperature'] = legacy.defaults.judge?.temperature ?? 0.3;
		registry['defaults.judge.maxTokens'] = legacy.defaults.judge?.maxTokens ?? 4096;
		registry['defaults.improve.modelId'] = legacy.defaults.improve?.modelId ?? '';
		registry['defaults.improve.temperature'] = legacy.defaults.improve?.temperature ?? 0.5;
		registry['defaults.improve.maxTokens'] = legacy.defaults.improve?.maxTokens ?? 4096;
	}

	// Council
	if (legacy.council) {
		registry['council.enabled'] = legacy.council.enabled ?? false;
		registry['council.members'] = legacy.council.members ?? [];
		registry['council.consensusThreshold'] = legacy.council.consensusThreshold ?? 0.7;
	}

	// Review
	if (legacy.review) {
		registry['review.requireApproval'] = legacy.review.requireApproval ?? false;
		registry['review.autoReview'] = legacy.review.autoReview ?? true;
	}

	return registry;
}

/**
 * Transform registry settings back to legacy format
 */
export function registryToLegacy(registry: SettingsValues): LegacySettings {
	const legacy: LegacySettings = {};

	// Connection
	if (
		registry['connection.mode'] !== undefined ||
		registry['connection.local.hostname'] !== undefined
	) {
		legacy.connection = {
			mode: registry['connection.mode'] as 'local' | 'remote' | undefined,
			hostname: registry['connection.local.hostname'] as string | undefined,
			port: registry['connection.local.port'] as number | undefined,
			host: registry['connection.remote.host'] as string | undefined,
			apiKey: registry['connection.remote.apiKey'] as string | undefined,
			status: registry['connection.status'] as
				| 'disconnected'
				| 'connecting'
				| 'connected'
				| 'error'
				| undefined
		};
	}

	// Providers
	if (
		registry['providers.selected'] !== undefined ||
		registry['providers.openai.apiKey'] !== undefined
	) {
		legacy.providers = {
			selected: registry['providers.selected'] as string[] | undefined,
			openai: { apiKey: registry['providers.openai.apiKey'] as string | undefined },
			anthropic: { apiKey: registry['providers.anthropic.apiKey'] as string | undefined },
			ollama: { url: registry['providers.ollama.url'] as string | undefined }
		};
	}

	// Models
	if (registry['models.selected'] !== undefined) {
		legacy.models = {
			selected: registry['models.selected'] as string | undefined,
			catalog: registry['models.catalog'] as Record<string, unknown> | undefined,
			favorites: registry['models.favorites'] as string[] | undefined
		};
	}

	// Policy
	if (registry['policy.allowedModels'] !== undefined) {
		legacy.policy = {
			allowedModels: registry['policy.allowedModels'] as string[] | undefined,
			blockedModels: registry['policy.blockedModels'] as string[] | undefined,
			requireApproval: registry['policy.requireApproval'] as boolean | undefined,
			maxTokens: registry['policy.maxTokens'] as number | undefined
		};
	}

	// Defaults
	if (
		registry['defaults.executor.modelId'] !== undefined ||
		registry['defaults.judge.modelId'] !== undefined
	) {
		legacy.defaults = {
			executor: {
				modelId: registry['defaults.executor.modelId'] as string | undefined,
				temperature: registry['defaults.executor.temperature'] as number | undefined
			},
			judge: {
				modelId: registry['defaults.judge.modelId'] as string | undefined,
				temperature: registry['defaults.judge.temperature'] as number | undefined
			},
			improve: {
				modelId: registry['defaults.improve.modelId'] as string | undefined,
				temperature: registry['defaults.improve.temperature'] as number | undefined
			}
		};
	}

	// Council
	if (registry['council.enabled'] !== undefined) {
		legacy.council = {
			enabled: registry['council.enabled'] as boolean | undefined,
			members: registry['council.members'] as string[] | undefined,
			consensusThreshold: registry['council.consensusThreshold'] as number | undefined
		};
	}

	// Review
	if (registry['review.requireApproval'] !== undefined) {
		legacy.review = {
			requireApproval: registry['review.requireApproval'] as boolean | undefined,
			autoReview: registry['review.autoReview'] as boolean | undefined
		};
	}

	return legacy;
}

/**
 * Extract a subset of settings for a specific block
 */
export function extractBlockSettings(
	registry: SettingsValues,
	blockId: string
): Record<string, unknown> {
	const prefix = `${blockId}.`;
	const blockSettings: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(registry)) {
		if (key.startsWith(prefix)) {
			const shortKey = key.slice(prefix.length);
			blockSettings[shortKey] = value;
		}
	}

	return blockSettings;
}

/**
 * Merge block settings back into registry
 */
export function mergeBlockSettings(
	registry: SettingsValues,
	blockId: string,
	blockSettings: Record<string, unknown>
): SettingsValues {
	const merged = { ...registry };

	for (const [key, value] of Object.entries(blockSettings)) {
		merged[`${blockId}.${key}`] = value;
	}

	return merged;
}

/**
 * Check if a setting value has changed from default
 */
export function isSettingChanged(
	key: string,
	value: unknown,
	defaultValue: unknown
): boolean {
	return JSON.stringify(value) !== JSON.stringify(defaultValue);
}

/**
 * Create a migration report showing what would change
 */
export function createMigrationReport(
	legacy: LegacySettings,
	registry: SettingsValues
): {
	added: string[];
	removed: string[];
	changed: Array<{ key: string; from: unknown; to: unknown }>;
	unchanged: string[];
} {
	const legacyFlat = legacyToRegistry(legacy);

	const allKeys = new Set([...Object.keys(legacyFlat), ...Object.keys(registry)]);

	const added: string[] = [];
	const removed: string[] = [];
	const changed: Array<{ key: string; from: unknown; to: unknown }> = [];
	const unchanged: string[] = [];

	for (const key of allKeys) {
		const inLegacy = key in legacyFlat;
		const inRegistry = key in registry;

		if (!inLegacy && inRegistry) {
			added.push(key);
		} else if (inLegacy && !inRegistry) {
			removed.push(key);
		} else if (inLegacy && inRegistry) {
			const from = legacyFlat[key];
			const to = registry[key];
			if (JSON.stringify(from) !== JSON.stringify(to)) {
				changed.push({ key, from, to });
			} else {
				unchanged.push(key);
			}
		}
	}

	return { added, removed, changed, unchanged };
}

/**
 * Validate legacy settings against registry schema
 */
export function validateLegacySettings(
	legacy: LegacySettings,
	validate: (key: string, value: unknown) => { valid: boolean; error?: string }
): Record<string, string> {
	const registry = legacyToRegistry(legacy);
	const errors: Record<string, string> = {};

	for (const [key, value] of Object.entries(registry)) {
		const result = validate(key, value);
		if (!result.valid && result.error) {
			errors[key] = result.error;
		}
	}

	return errors;
}

/**
 * Compatibility wrapper for settings storage
 * 
 * Provides a unified interface for both legacy and new storage formats
 */
export class SettingsStorageCompat {
	private registryDefaults: SettingsValues;

	constructor(getDefaults: () => SettingsValues) {
		this.registryDefaults = getDefaults();
	}

	/**
	 * Load settings - automatically detects format and converts if needed
	 */
	load(stored: unknown): SettingsValues {
		if (stored === null || stored === undefined) {
			return { ...this.registryDefaults };
		}

		// Check if it's already in registry format (flat keys with dots)
		if (
			typeof stored === 'object' &&
			stored !== null &&
			Object.keys(stored).some((k) => k.includes('.'))
		) {
			return { ...this.registryDefaults, ...(stored as SettingsValues) };
		}

		// Assume legacy format and convert
		const registry = legacyToRegistry(stored as LegacySettings);
		return { ...this.registryDefaults, ...registry };
	}

	/**
	 * Save settings - stores in registry format
	 */
	save(registry: SettingsValues): SettingsValues {
		// Return only non-default values to minimize storage
		const toSave: SettingsValues = {};

		for (const [key, value] of Object.entries(registry)) {
			const defaultValue = this.registryDefaults[key];
			if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
				toSave[key] = value;
			}
		}

		return toSave;
	}

	/**
	 * Check if stored data needs migration
	 */
	needsMigration(stored: unknown): boolean {
		if (stored === null || stored === undefined) {
			return false;
		}

		// If it has dot-notation keys, it's already in registry format
		if (
			typeof stored === 'object' &&
			stored !== null &&
			Object.keys(stored).some((k) => k.includes('.'))
		) {
			return false;
		}

		// Otherwise it needs migration
		return true;
	}
}
