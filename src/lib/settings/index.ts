/**
 * Settings Schema Registry
 *
 * Central registry for declarative settings with dependency management,
 * validation, and reactive updates.
 */

// Core types
export type {
	SettingType,
	SettingSource,
	SettingsValues,
	VisibilityCondition,
	SideEffectHandler,
	SettingDefinition,
	SettingsBlock,
	ResolvedSetting,
	ResolutionContext,
	ImpactAnalysis,
	DependencyNode,
	DependencyGraphData,
	SettingsStoreState,
	CascadeLevel,
	RegistryConfig
} from './types';

// Core classes
import {
	SettingsSchemaRegistry,
	SettingNotFoundError,
	BlockNotFoundError
} from './schema-registry';
export {
	SettingsSchemaRegistry,
	SettingNotFoundError,
	BlockNotFoundError
};

import {
	DependencyGraph,
	CircularDependencyError
} from './dependency-graph';
export {
	DependencyGraph,
	CircularDependencyError
};

// Validators
export {
	createTypeSchema,
	stringValidators,
	numberValidators,
	arrayValidators,
	booleanValidators,
	connectionValidators,
	providerValidators,
	modelValidators,
	policyValidators,
	defaultValidators,
	when,
	withDefault,
	optional,
	allOf,
	validators
} from './validators';

// Block definitions
export {
	connectionBlock,
	providersBlock,
	modelsBlock,
	policyBlock,
	defaultsBlock
} from './blocks';

// Utility types for convenience
export type SettingsRegistry = SettingsSchemaRegistry;
export type SettingsDependencyGraph = DependencyGraph;

export {
	SettingsResolver,
	ResolutionError,
	createResolver
} from './resolver';

// Cascade utilities
export {
createResolutionContext,
mergeContexts,
getValueAtLevel,
hasValueAtLevel,
compareLevels,
getHighestPriorityLevel,
createCascadeLevel,
filterDefinedLevels,
getFirstDefinedValue,
formatCascadePath,
buildCascadeLevels,
getAllKeysFromContext,
areContextsEqual,
emptyContext,
runContext,
promptContext
} from './utils/cascade';

// Backward compatibility
export {
	legacyToRegistry,
	registryToLegacy,
	extractBlockSettings,
	mergeBlockSettings,
	isSettingChanged,
	createMigrationReport,
	validateLegacySettings,
	SettingsStorageCompat,
	type LegacySettings
} from './compat';