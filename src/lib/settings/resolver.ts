import type {
	SettingDefinition,
	SettingsValues,
	ResolutionContext,
	ResolvedSetting,
	CascadeLevel,
	SettingSource
} from './types';
import { SettingsSchemaRegistry } from './schema-registry';

/**
 * Error thrown when resolution fails
 */
export class ResolutionError extends Error {
	constructor(
		message: string,
		public key: string,
		public context?: ResolutionContext
	) {
		super(message);
		this.name = 'ResolutionError';
	}
}

/**
 * SettingsResolver handles the 3-level cascade resolution:
 * 1. Run-level overrides (highest priority)
 * 2. Prompt-level overrides (middle priority)
 * 3. Default values (lowest priority)
 *
 * Also provides source tracking to know where values come from.
 */
export class SettingsResolver {
	constructor(private registry: SettingsSchemaRegistry) {}

	/**
	 * Resolve a single setting value through the cascade
	 *
	 * Priority order:
	 * 1. runOverrides (if provided and valid)
	 * 2. promptOverrides (if provided and valid)
	 * 3. Default value from setting definition
	 *
	 * @param key - Full setting key (block.setting)
	 * @param context - Resolution context with overrides
	 * @returns Resolved setting with value and source information
	 */
	async resolve<T = unknown>(
		key: string,
		context: ResolutionContext = {}
	): Promise<ResolvedSetting<T>> {
		const setting = this.registry.getSetting(key);
		if (!setting) {
			throw new ResolutionError(`Setting '${key}' not found`, key, context);
		}

		const path = this.getCascadePath(key, context);

		// Find first valid value in cascade order
		for (const level of path) {
			if (level.value !== undefined) {
				// Validate the value before accepting
				const validation = this.registry.validateSetting(key, level.value);
				if (validation.valid) {
					return {
						value: level.value as T,
						source: level.source,
						isInherited: level.source !== 'run'
					};
				}
				// Invalid value - log and continue to next level
				console.warn(
					`Invalid value for '${key}' from ${level.source}: ${validation.error}`
				);
			}
		}

		// Fall back to default value (always valid by definition)
		return {
			value: setting.defaultValue as T,
			source: 'default',
			isInherited: true
		};
	}

	/**
	 * Resolve multiple settings at once
	 */
	async resolveAll(
		keys: string[],
		context: ResolutionContext = {}
	): Promise<Map<string, ResolvedSetting<unknown>>> {
		const results = new Map<string, ResolvedSetting<unknown>>();

		// Resolve in topological order to handle dependencies
		const order = this.registry.getUpdateOrder();
		const sortedKeys = keys.sort(
			(a, b) => order.indexOf(a) - order.indexOf(b)
		);

		for (const key of sortedKeys) {
			const resolved = await this.resolve(key, context);
			results.set(key, resolved);
		}

		return results;
	}

	/**
	 * Resolve all visible settings for given values
	 */
	async resolveVisible(
		values: SettingsValues,
		context: ResolutionContext = {}
	): Promise<Map<string, ResolvedSetting<unknown>>> {
		const allSettings = this.registry.getAllSettings();
		const visibleKeys = allSettings
			.filter(({ key }) => this.registry.isSettingVisible(key, values))
			.map(({ key }) => key);

		return this.resolveAll(visibleKeys, context);
	}

	/**
	 * Get the cascade path for a setting
	 *
	 * Returns array of cascade levels in priority order (highest to lowest)
	 */
	getCascadePath(key: string, context: ResolutionContext): CascadeLevel[] {
		const levels: CascadeLevel[] = [];

		// Level 1: Run overrides (highest priority)
		if (context.runOverrides && key in context.runOverrides) {
			levels.push({
				source: 'run',
				value: context.runOverrides[key]
			});
		}

		// Level 2: Prompt overrides
		if (context.promptOverrides && key in context.promptOverrides) {
			levels.push({
				source: 'prompt',
				value: context.promptOverrides[key]
			});
		}

		// Level 3: Default (lowest priority)
		// This is always present as fallback
		const setting = this.registry.getSetting(key);
		if (setting) {
			levels.push({
				source: 'default',
				value: setting.defaultValue
			});
		}

		return levels;
	}

	/**
	 * Get the source of a value without full resolution
	 */
	peekSource(key: string, context: ResolutionContext): SettingSource | null {
		if (context.runOverrides?.[key] !== undefined) {
			return 'run';
		}
		if (context.promptOverrides?.[key] !== undefined) {
			return 'prompt';
		}
		if (this.registry.hasSetting(key)) {
			return 'default';
		}
		return null;
	}

	/**
	 * Check if a setting is overridden at any level
	 */
	isOverridden(key: string, context: ResolutionContext): boolean {
		return (
			context.runOverrides?.[key] !== undefined ||
			context.promptOverrides?.[key] !== undefined
		);
	}

	/**
	 * Check if a setting is inherited (not from run level)
	 */
	isInherited(key: string, context: ResolutionContext): boolean {
		return context.runOverrides?.[key] === undefined;
	}

	/**
	 * Get effective value for a setting (quick sync version)
	 *
	 * Note: This doesn't validate. Use resolve() for validation.
	 */
	getEffectiveValue<T = unknown>(key: string, context: ResolutionContext): T | undefined {
		const path = this.getCascadePath(key, context);
		return path[0]?.value as T | undefined;
	}

	/**
	 * Create a merged values object from context
	 *
	 * Merges all override levels with proper precedence
	 */
	mergeValues(context: ResolutionContext): SettingsValues {
		const merged: SettingsValues = {};

		// Start with defaults
		const defaults = this.registry.getDefaultValues();
		Object.assign(merged, defaults);

		// Override with prompt values
		if (context.promptOverrides) {
			Object.assign(merged, context.promptOverrides);
		}

		// Override with run values (highest priority)
		if (context.runOverrides) {
			Object.assign(merged, context.runOverrides);
		}

		return merged;
	}

	/**
	 * Resolve with dependency consideration
	 *
	 * Ensures dependencies are resolved before dependents
	 */
	async resolveWithDependencies(
		key: string,
		context: ResolutionContext = {}
	): Promise<ResolvedSetting<unknown>> {
		const graph = this.registry.getDependencyGraph();
		const dependencies = graph.getDependencies(key);

		// Resolve all dependencies first
		for (const depKey of dependencies) {
			await this.resolve(depKey, context);
		}

		// Now resolve the target setting
		return this.resolve(key, context);
	}

	/**
	 * Batch resolve with dependency ordering
	 */
	async resolveBatch(
		keys: string[],
		context: ResolutionContext = {}
	): Promise<Map<string, ResolvedSetting<unknown>>> {
		// Get topological order
		const allKeys = new Set(keys);
		const graph = this.registry.getDependencyGraph();

		// Add dependencies to the set
		for (const key of keys) {
			const deps = graph.getAllDependencies(key);
			for (const dep of deps) {
				allKeys.add(dep);
			}
		}

		// Sort by topological order
		const order = this.registry.getUpdateOrder();
		const sortedKeys = Array.from(allKeys).sort(
			(a, b) => order.indexOf(a) - order.indexOf(b)
		);

		// Resolve in order
		const results = new Map<string, ResolvedSetting<unknown>>();
		for (const key of sortedKeys) {
			const resolved = await this.resolve(key, context);
			results.set(key, resolved);
		}

		// Return only requested keys
		const filtered = new Map<string, ResolvedSetting<unknown>>();
		for (const key of keys) {
			const result = results.get(key);
			if (result) {
				filtered.set(key, result);
			}
		}

		return filtered;
	}
}

/**
 * Factory function to create a resolver
 */
export function createResolver(registry: SettingsSchemaRegistry): SettingsResolver {
	return new SettingsResolver(registry);
}
