/**
 * Shared types for function settings components
 * Used by FunctionSettingsCard, FunctionSettingsTable, FunctionSettingsCards
 */

export type SettingField = 'modelId' | 'modelVariant' | 'temperature' | 'maxTokens' | 'prompt';

export type PolicyScope = 'executor' | 'judge' | 'improve' | 'council';

export type FunctionType = 'executor' | 'judge' | 'improve' | 'council';

export interface FunctionSetting {
	id?: number;
	functionType: FunctionType | string;
	modelId: string;
	modelVariant?: string | null;
	temperature: number;
	maxTokens: number;
	promptId?: number | null;
}

// Flexible record type to allow partial settings
export type FunctionSettingsRecord = Partial<Record<FunctionType, FunctionSetting>>;

export interface SettingChangeHandler {
	(
		functionType: string,
		field: SettingField,
		scope: PolicyScope,
		value: unknown,
		immediate?: boolean
	): void;
}

export interface FieldConfig {
	key: SettingField;
	label: string;
	type: 'select' | 'number' | 'text';
	min?: number;
	max?: number;
	step?: number;
	placeholder?: string;
}
