import type {
	SettingDefinition,
	SettingsBlock,
	SettingsValues,
	RegistryConfig,
	VisibilityCondition,
	ImpactAnalysis
} from './types';
import { DependencyGraph, CircularDependencyError } from './dependency-graph';

/**
 * Error thrown when a block or setting is not found
 */
export class SettingNotFoundError extends Error {
	constructor(key: string) {
		super(`Setting '${key}' not found in registry`);
		this.name = 'SettingNotFoundError';
	}
}

export class BlockNotFoundError extends Error {
	constructor(id: string) {
		super(`Block '${id}' not found in registry`);
		this.name = 'BlockNotFoundError';
	}
}

/**
 * SettingsSchemaRegistry is the central registry for all settings definitions.
 *
 * Features:
 * - Register settings blocks with their definitions
 * - Build and maintain dependency graph
 * - Calculate visibility based on current values
 * - Provide impact analysis for changes
 */
export class SettingsSchemaRegistry {
	private blocks = new Map<string, SettingsBlock>();
	private settingsByKey = new Map<string, { blockId: string; setting: SettingDefinition }>();
	private dependencyGraph = new DependencyGraph();
	private config: Required<RegistryConfig>;

	constructor(config: RegistryConfig = {}) {
		this.config = {
			strict: config.strict ?? false,
			checkCycles: config.checkCycles ?? true,
			enableSideEffects: config.enableSideEffects ?? true
		};
	}

	/**
	 * Register a settings block
	 * Builds dependency graph automatically
	 */
	registerBlock(block: SettingsBlock): void {
		if (this.blocks.has(block.id)) {
			throw new Error(`Block '${block.id}' is already registered`);
		}

		// Validate setting keys are unique within block
		const blockKeys = new Set<string>();
		for (const setting of block.settings) {
			const fullKey = `${block.id}.${setting.key}`;
			if (blockKeys.has(setting.key)) {
				throw new Error(`Duplicate setting key '${setting.key}' in block '${block.id}'`);
			}
			blockKeys.add(setting.key);

			if (this.settingsByKey.has(fullKey)) {
				throw new Error(`Setting key '${fullKey}' is already registered`);
			}
		}

		this.blocks.set(block.id, block);

		// Index settings by key and build dependency graph
		for (const setting of block.settings) {
			const fullKey = `${block.id}.${setting.key}`;
			this.settingsByKey.set(fullKey, { blockId: block.id, setting });

			// Add dependencies to graph
			if (setting.requires?.length) {
				for (const dep of setting.requires) {
					// Dependencies can be in same block (relative) or other blocks (absolute)
					const depKey = dep.includes('.') ? dep : `${block.id}.${dep}`;
					this.dependencyGraph.addDependency(fullKey, depKey);
				}
			}

			// Add affects relationships (reverse dependencies)
			if (setting.affects?.length) {
				for (const affected of setting.affects) {
					const affectedKey = affected.includes('.') ? affected : `${block.id}.${affected}`;
					this.dependencyGraph.addDependency(affectedKey, fullKey);
				}
			}
		}

		// Check for cycles if enabled
		if (this.config.checkCycles) {
			const cycles = this.dependencyGraph.detectCycles();
			if (cycles.length > 0) {
				throw new CircularDependencyError(cycles);
			}
		}
	}

	/**
	 * Get a block by ID
	 */
	getBlock(id: string): SettingsBlock | undefined {
		return this.blocks.get(id);
	}

	/**
	 * Get all registered blocks
	 */
	getAllBlocks(): SettingsBlock[] {
		return Array.from(this.blocks.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	}

	/**
	 * Get all visible blocks for given values
	 */
	getVisibleBlocks(values: SettingsValues): SettingsBlock[] {
		return this.getAllBlocks().filter(block => {
			if (!block.visibleWhen) return true;
			return block.visibleWhen(values);
		});
	}

	/**
	 * Get a setting definition by key
	 */
	getSetting(key: string): SettingDefinition | undefined {
		return this.settingsByKey.get(key)?.setting;
	}

	/**
	 * Get setting with block info
	 */
	getSettingWithBlock(key: string): { blockId: string; setting: SettingDefinition } | undefined {
		return this.settingsByKey.get(key);
	}

	/**
	 * Get all settings (flattened)
	 */
	getAllSettings(): Array<{ key: string; blockId: string; setting: SettingDefinition }> {
		return Array.from(this.settingsByKey.entries()).map(([key, value]) => ({
			key,
			blockId: value.blockId,
			setting: value.setting
		}));
	}

	/**
	 * Get settings for a specific block
	 */
	getBlockSettings(blockId: string): SettingDefinition[] {
		const block = this.blocks.get(blockId);
		return block?.settings ?? [];
	}

	/**
	 * Get visible settings within a block
	 */
	getVisibleSettings(blockId: string, values: SettingsValues): SettingDefinition[] {
		const block = this.blocks.get(blockId);
		if (!block) return [];

		return block.settings.filter(setting => {
			if (!setting.visibleWhen) return true;
			return setting.visibleWhen(values);
		});
	}

	/**
	 * Check if a setting is visible
	 */
	isSettingVisible(key: string, values: SettingsValues): boolean {
		const settingData = this.settingsByKey.get(key);
		if (!settingData) {
			if (this.config.strict) {
				throw new SettingNotFoundError(key);
			}
			return false;
		}

		if (!settingData.setting.visibleWhen) return true;
		return settingData.setting.visibleWhen(values);
	}

	/**
	 * Validate a setting value against its schema
	 */
	validateSetting(key: string, value: unknown): { valid: boolean; error?: string } {
		const setting = this.settingsByKey.get(key)?.setting;
		if (!setting) {
			if (this.config.strict) {
				throw new SettingNotFoundError(key);
			}
			return { valid: false, error: `Setting '${key}' not found` };
		}

		const result = setting.schema.safeParse(value);
		if (result.success) {
			return { valid: true };
		} else {
		return { valid: false, error: result.error?.message ?? 'Validation failed' };
		}
	}

	/**
	 * Validate all provided values
	 */
	validateAll(values: SettingsValues): Record<string, string | undefined> {
		const errors: Record<string, string | undefined> = {};

		for (const [key, value] of Object.entries(values)) {
			const result = this.validateSetting(key, value);
			if (!result.valid) {
				errors[key] = result.error;
			}
		}

		return errors;
	}
	/**
	 * Validate all visible settings for given values context
	 */
	validateVisible(values: SettingsValues): Record<string, string | undefined> {
		const errors: Record<string, string | undefined> = {};

		for (const [key, value] of Object.entries(values)) {
			if (!this.isSettingVisible(key, values)) continue;
			const result = this.validateSetting(key, value);
			if (!result.valid) {
				errors[key] = result.error;
			}
		}

		return errors;
	}

	/**
	 * Get the dependency graph
	 */
	getDependencyGraph(): DependencyGraph {
		return this.dependencyGraph;
	}

	/**
	 * Get impact analysis for a setting change
	 */
	getImpactAnalysis(key: string): ImpactAnalysis {
		if (!this.settingsByKey.has(key) && this.config.strict) {
			throw new SettingNotFoundError(key);
		}

		const graphAnalysis = this.dependencyGraph.getImpactAnalysis(key);

		// Find blocks that need revalidation based on affected settings
		const affectedBlocks = new Set<string>();
		for (const affectedKey of [
			...graphAnalysis.directlyAffected,
			...graphAnalysis.transitivelyAffected
		]) {
			const blockId = this.settingsByKey.get(affectedKey)?.blockId;
			if (blockId) {
				affectedBlocks.add(blockId);
			}
		}

		// Check for visibility changes in the setting itself
		const visibilityChanges: string[] = [];
		const settingData = this.settingsByKey.get(key);
		if (settingData?.setting.affects) {
			for (const affected of settingData.setting.affects) {
				const affectedKey = affected.includes('.')
					? affected
					: `${settingData.blockId}.${affected}`;
				visibilityChanges.push(affectedKey);
			}
		}

		return {
			...graphAnalysis,
			blocksToRevalidate: Array.from(affectedBlocks),
			visibilityChanges: [...new Set([...graphAnalysis.visibilityChanges, ...visibilityChanges])]
		};
	}

	/**
	 * Get default values for all settings
	 */
	getDefaultValues(): SettingsValues {
		const defaults: SettingsValues = {};
		for (const [key, { setting }] of this.settingsByKey) {
			defaults[key] = setting.defaultValue;
		}
		return defaults;
	}

	/**
	 * Get topological order for settings updates
	 */
	getUpdateOrder(): string[] {
		return this.dependencyGraph.topologicalSort();
	}

	/**
	 * Check if registry has cycles
	 */
	hasCycles(): boolean {
		return this.dependencyGraph.hasCycles();
	}

	/**
	 * Detect cycles in the dependency graph
	 */
	detectCycles(): string[][] {
		return this.dependencyGraph.detectCycles();
	}

	/**
	 * Unregister a block
	 */
	unregisterBlock(id: string): void {
		const block = this.blocks.get(id);
		if (!block) return;

		// Remove all settings for this block
		for (const setting of block.settings) {
			const fullKey = `${id}.${setting.key}`;
			this.settingsByKey.delete(fullKey);
			this.dependencyGraph.removeNode(fullKey);
		}

		this.blocks.delete(id);
	}

	/**
	 * Get registry statistics
	 */
	getStats(): {
		blocks: number;
		settings: number;
		dependencies: { nodes: number; edges: number };
	} {
		return {
			blocks: this.blocks.size,
			settings: this.settingsByKey.size,
			dependencies: this.dependencyGraph.getStats()
		};
	}

	/**
	 * Check if a key exists
	 */
	hasSetting(key: string): boolean {
		return this.settingsByKey.has(key);
	}

	/**
	 * Check if a block exists
	 */
	hasBlock(id: string): boolean {
		return this.blocks.has(id);
	}

	/**
	 * Create a visibility condition builder helper
	 */
	createVisibilityCondition(builders: {
		[key: string]: (values: SettingsValues) => boolean;
	}): VisibilityCondition {
		return (values) => {
			for (const [key, condition] of Object.entries(builders)) {
				if (!condition(values)) {
					return false;
				}
			}
			return true;
		};
	}

	/**
	 * Clear all blocks and settings
	 */
	clear(): void {
		this.blocks.clear();
		this.settingsByKey.clear();
		this.dependencyGraph.clear();
	}
}
