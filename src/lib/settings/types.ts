import type { Component } from 'svelte';
import type { ZodType } from 'zod';

/**
 * Core value types supported by the settings system
 */
export type SettingType = 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object';

/**
 * Possible sources for a resolved setting value
 */
export type SettingSource = 'run' | 'prompt' | 'default';

/**
 * Raw values container for settings
 */
export type SettingsValues = Record<string, unknown>;

/**
 * Visibility condition function
 */
export type VisibilityCondition = (values: SettingsValues) => boolean;

/**
 * Side effect handler for setting changes
 */
export type SideEffectHandler = (key: string, value: unknown, values: SettingsValues) => void;

/**
 * Single setting definition with metadata, validation, and relationships
 */
export interface SettingDefinition {
	/** Unique key within the block */
	key: string;

	/** Data type */
	type: SettingType;

	/** Display label */
	label: string;

	/** Optional description for help text */
	description?: string;

	/** Default value when not overridden */
	defaultValue: unknown;

	/**
	 * Visibility condition - when should this setting be shown?
	 * Called with current values to determine visibility
	 */
	visibleWhen?: VisibilityCondition;

	/**
	 * Keys of other settings this setting depends on.
	 * Used for dependency graph construction.
	 */
	requires?: string[];

	/**
	 * Keys of settings affected by changes to this setting.
	 * Used for impact analysis.
	 */
	affects?: string[];

	/**
	 * Zod schema for validation
	 */
	schema: ZodType;

	/**
	 * Category for grouping within a block
	 */
	category?: string;

	/**
	 * Display order within the block
	 */
	order?: number;

	/**
	 * Whether this is an advanced setting (hidden by default)
	 */
	advanced?: boolean;

	/**
	 * Handler called when this setting changes
	 */
	onChange?: SideEffectHandler;

    /**
     * Custom Svelte component for rendering this setting
     * If not provided, a default input is used based on type
     */
    component?: Component;

    /**
     * Features affected by this setting (e.g., 'judge', 'improve', 'executor')
     * Used to show impact badges in the UI
     */
    impactedFeatures?: string[];

    /**
     * Placeholder text for text/number inputs
     */
    placeholder?: string;

    /**
     * Additional props to pass to the input component
     */
    inputProps?: Record<string, unknown>;

    /**
     * Enum options (only for type: 'enum')
     */
    options?: Array<{ value: string; label: string }>;
}

/**
 * A logical grouping of related settings
 */
export interface SettingsBlock {
	/** Unique block identifier */
	id: string;

	/** Display label */
	label: string;

	/** Optional icon component */
	icon?: Component;

	/** Description shown in UI */
	description?: string;

	/** Settings contained in this block */
	settings: SettingDefinition[];

	/**
	 * Visibility condition for the entire block
	 */
	visibleWhen?: VisibilityCondition;

	/**
	 * Display order among blocks
	 */
	order?: number;
}

/**
 * Result of resolving a setting value through the cascade
 */
export interface ResolvedSetting<T = unknown> {
	/** The resolved value */
	value: T;

	/** Where the value came from in the cascade */
	source: SettingSource;

	/** Whether this value was inherited (not from run level) */
	isInherited: boolean;
}

/**
 * Context for resolving setting values
 */
export interface ResolutionContext {
	/** Run-level overrides (highest priority) */
	runOverrides?: SettingsValues;

	/** Prompt ID for prompt-level resolution */
	promptId?: number;

	/** Prompt-level overrides (middle priority) */
	promptOverrides?: SettingsValues;

	/** Default values (lowest priority) */
	defaultValues?: SettingsValues;
}

/**
 * Impact analysis result showing what changes affect
 */
export interface ImpactAnalysis {
	/** Settings directly affected by a change */
	directlyAffected: string[];

	/** Settings transitively affected through dependency chain */
	transitivelyAffected: string[];

	/** Blocks that need revalidation */
	blocksToRevalidate: string[];

	/** Settings whose visibility might change */
	visibilityChanges: string[];
}

/**
 * Node in the dependency graph
 */
export interface DependencyNode {
	/** Setting key */
	key: string;

	/** Direct dependencies (this node requires these) */
	dependencies: Set<string>;

	/** Direct dependents (these require this node) */
	dependents: Set<string>;
}

/**
 * Dependency graph structure
 */
export interface DependencyGraphData {
	/** All nodes in the graph */
	nodes: Map<string, DependencyNode>;

	/** Edges from node -> its dependencies */
	edges: Map<string, Set<string>>;
}

/**
 * Settings store state
 */
export interface SettingsStoreState {
	/** Current values */
	values: SettingsValues;

	/** Validation errors by key */
	errors: Record<string, string>;

	/** Keys that have been touched by user */
	touched: Set<string>;

	/** Whether any values have changed from initial */
	dirty: boolean;
}

/**
 * Cascade level in resolution chain
 */
export interface CascadeLevel {
	/** Source level */
	source: SettingSource;

	/** Value at this level (undefined if not set) */
	value: unknown;
}

/**
 * Configuration for the schema registry
 */
export interface RegistryConfig {
	/** Enable strict mode - throws on unknown settings */
	strict?: boolean;

	/** Enable circular dependency detection */
	checkCycles?: boolean;

	/** Enable automatic side effect execution */
	enableSideEffects?: boolean;
}
