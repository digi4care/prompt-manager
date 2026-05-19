import type { SettingsValues, ResolutionContext, CascadeLevel, SettingSource } from '../types';

/**
 * Cascade utilities for settings resolution
 */

/**
 * Create a resolution context with the given overrides
 */
export function createResolutionContext(
	runOverrides?: SettingsValues,
	promptOverrides?: SettingsValues,
	promptId?: number
): ResolutionContext {
	return {
		runOverrides,
		promptOverrides,
		promptId
	};
}

/**
 * Merge multiple context levels
 *
 * Creates a new context that merges overrides from multiple sources.
 * Later contexts take precedence.
 */
export function mergeContexts(...contexts: ResolutionContext[]): ResolutionContext {
	return contexts.reduce(
		(merged, ctx) => ({
			runOverrides: { ...merged.runOverrides, ...ctx.runOverrides },
			promptOverrides: { ...merged.promptOverrides, ...ctx.promptOverrides },
			promptId: ctx.promptId ?? merged.promptId
		}),
		{} as ResolutionContext
	);
}

/**
 * Get value at specific cascade level
 */
export function getValueAtLevel(
	key: string,
	level: SettingSource,
	context: ResolutionContext,
	defaultValues?: SettingsValues
): unknown | undefined {
	switch (level) {
		case 'run':
			return context.runOverrides?.[key];
		case 'prompt':
			return context.promptOverrides?.[key];
		case 'default':
			return defaultValues?.[key];
		default:
			return undefined;
	}
}

/**
 * Check if value exists at specific level
 */
export function hasValueAtLevel(
	key: string,
	level: SettingSource,
	context: ResolutionContext
): boolean {
	return getValueAtLevel(key, level, context) !== undefined;
}

/**
 * Compare two cascade levels by priority
 *
 * Returns negative if a is higher priority, positive if b is higher priority
 */
export function compareLevels(a: SettingSource, b: SettingSource): number {
	const priorities: Record<SettingSource, number> = {
		run: 3,
		prompt: 2,
		default: 1
	};
	return priorities[b] - priorities[a];
}

/**
 * Get the highest priority level that has a value
 */
export function getHighestPriorityLevel(
	key: string,
	context: ResolutionContext,
	defaultValues?: SettingsValues
): SettingSource | null {
	if (context.runOverrides?.[key] !== undefined) {
		return 'run';
	}
	if (context.promptOverrides?.[key] !== undefined) {
		return 'prompt';
	}
	if (defaultValues?.[key] !== undefined) {
		return 'default';
	}
	return null;
}

/**
 * Create a cascade level object
 */
export function createCascadeLevel(
	source: SettingSource,
	value: unknown
): CascadeLevel {
	return { source, value };
}

/**
 * Filter cascade levels to only those with defined values
 */
export function filterDefinedLevels(levels: CascadeLevel[]): CascadeLevel[] {
	return levels.filter((level) => level.value !== undefined);
}

/**
 * Get the first defined value from a list of cascade levels
 */
export function getFirstDefinedValue(levels: CascadeLevel[]): unknown | undefined {
	for (const level of levels) {
		if (level.value !== undefined) {
			return level.value;
		}
	}
	return undefined;
}

/**
 * Format cascade path for display/debugging
 */
export function formatCascadePath(key: string, levels: CascadeLevel[]): string {
	const parts = levels.map((level) => {
		const valueStr =
			typeof level.value === 'object'
				? JSON.stringify(level.value)
				: String(level.value);
		return `${level.source}=${valueStr}`;
	});
	return `${key}: [${parts.join(' <- ')}]`;
}

/**
 * Build cascade levels from context and defaults
 */
export function buildCascadeLevels(
	key: string,
	context: ResolutionContext,
	defaultValue?: unknown
): CascadeLevel[] {
	const levels: CascadeLevel[] = [];

	if (context.runOverrides?.[key] !== undefined) {
		levels.push(createCascadeLevel('run', context.runOverrides[key]));
	}

	if (context.promptOverrides?.[key] !== undefined) {
		levels.push(createCascadeLevel('prompt', context.promptOverrides[key]));
	}

	if (defaultValue !== undefined) {
		levels.push(createCascadeLevel('default', defaultValue));
	}

	return levels;
}

/**
 * Extract all keys present at any cascade level
 */
export function getAllKeysFromContext(context: ResolutionContext): string[] {
	const keys = new Set<string>();

	if (context.runOverrides) {
		Object.keys(context.runOverrides).forEach((k) => keys.add(k));
	}

	if (context.promptOverrides) {
		Object.keys(context.promptOverrides).forEach((k) => keys.add(k));
	}

	return Array.from(keys);
}

/**
 * Check if contexts are equal (shallow comparison)
 */
export function areContextsEqual(a: ResolutionContext, b: ResolutionContext): boolean {
	return (
		JSON.stringify(a.runOverrides) === JSON.stringify(b.runOverrides) &&
		JSON.stringify(a.promptOverrides) === JSON.stringify(b.promptOverrides) &&
		a.promptId === b.promptId
	);
}

/**
 * Create an empty resolution context
 */
export function emptyContext(): ResolutionContext {
	return {};
}

/**
 * Create a context with only run overrides
 */
export function runContext(overrides: SettingsValues): ResolutionContext {
	return { runOverrides: overrides };
}

/**
 * Create a context with only prompt overrides
 */
export function promptContext(
	overrides: SettingsValues,
	promptId?: number
): ResolutionContext {
	return { promptOverrides: overrides, promptId };
}
