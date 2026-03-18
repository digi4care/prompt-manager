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
export {
	SettingsSchemaRegistry,
	SettingNotFoundError,
	BlockNotFoundError
} from './schema-registry';

export {
	DependencyGraph,
	CircularDependencyError
} from './dependency-graph';

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
