import type {
	SettingsSchemaRegistry,
	SettingDefinition,
	SettingsBlock,
	SettingsValues,
	ResolutionContext,
	ResolvedSetting,
	ImpactAnalysis
} from '$lib/settings';
import { SettingsResolver } from '$lib/settings';

/**
 * Reactive settings store state interface
 */
export interface SettingsStoreState {
	/** Current values */
	values: SettingsValues;

	/** Validation errors by key */
	errors: Record<string, string | undefined>;

	/** Keys that have been touched by user */
	touched: Set<string>;

	/** Whether any values have changed from initial */
	dirty: boolean;

	/** Whether currently saving */
	saving: boolean;

	/** Save error if any */
	saveError?: string;
}

/**
 * Settings store configuration
 */
export interface SettingsStoreConfig {
	/** Registry instance */
	registry: SettingsSchemaRegistry;

	/** Initial values */
	initialValues?: SettingsValues;

	/** Resolution context for cascade */
	resolutionContext?: ResolutionContext;

	/** Validation debounce in ms */
	validationDebounce?: number;

	/** Save handler */
	onSave?: (values: SettingsValues) => Promise<void>;

	/** Auto-save on change */
	autoSave?: boolean;
}

/**
 * Create a reactive settings store using Svelte 5 runes
 *
 * Features:
 * - Reactive state management with $state
 * - Derived visibility based on current values
 * - Real-time validation
 * - Change tracking (dirty state)
 * - Impact analysis for changes
 */
export function createSettingsStore(config: SettingsStoreConfig) {
	const { registry, resolutionContext, onSave, autoSave = false } = config;
	const resolver = new SettingsResolver(registry);


	// Get default values from registry
	const defaultValues = registry.getDefaultValues();
	const initial = { ...defaultValues, ...config.initialValues };

	// Core state using Svelte 5 runes
	let values = $state<SettingsValues>(initial);
	let errors = $state<Record<string, string | undefined>>({});
	let touched = $state<Set<string>>(new Set());
	let initialValues = $state(JSON.stringify(initial));

	let saving = $state(false);
	let saveError = $state<string | undefined>(undefined);

	// Derived state
	let dirty = $derived(JSON.stringify(values) !== initialValues);
	let hasErrors = $derived(Object.values(errors).some(Boolean));
	let changedSettings = $derived(
		Object.entries(values)
			.filter(([key, value]) => {
				const initial = JSON.parse(initialValues);
				return JSON.stringify(value) !== JSON.stringify(initial[key]);
			})
			.map(([key]) => key)
	);

	// Visible blocks based on current values
	let visibleBlocks = $derived(registry.getVisibleBlocks(values));

	// Visible settings per block
	function getVisibleSettings(blockId: string): SettingDefinition[] {
		return registry.getVisibleSettings(blockId, values);
	}

	// Check if a block is visible
	function isBlockVisible(blockId: string): boolean {
		return visibleBlocks.some((b) => b.id === blockId);
	}

	// Check if a setting is visible
	function isSettingVisible(key: string): boolean {
		return registry.isSettingVisible(key, values);
	}

	// Validate a single setting
	function validateSetting(key: string): boolean {
		const result = registry.validateSetting(key, values[key]);
		errors = { ...errors, [key]: result.valid ? undefined : result.error };
		return result.valid;
	}

	// Validate all visible settings
	function validateAll(): boolean {
		const visibleKeys = registry
			.getAllSettings()
			.filter(({ key }) => registry.isSettingVisible(key, values))
			.map(({ key }) => key);
		const allErrors: Record<string, string | undefined> = {};
		for (const key of visibleKeys) {
			const result = registry.validateSetting(key, values[key]);
			if (!result.valid) {
				allErrors[key] = result.error;
			}
		}
		errors = allErrors;
		return !Object.values(allErrors).some(Boolean);
	}

	// Validate only touched fields
	function validateTouched(): boolean {
		// If no fields touched, validation passes
		if (touched.size === 0) return true;
		const newErrors: Record<string, string | undefined> = { ...errors };
		for (const key of touched) {
			const result = registry.validateSetting(key, values[key]);
			if (!result.valid) {
				newErrors[key] = result.error;
			} else {
				delete newErrors[key];
			}
		}
		errors = newErrors;
		return !Object.values(errors).some(Boolean);
	}

	// Set a value and validate
	async function setValue(key: string, value: unknown): Promise<void> {
		values = { ...values, [key]: value };
		touched = new Set([...touched, key]);

		// Validate immediately
		validateSetting(key);

		// Get impact and revalidate affected settings
		const impact = registry.getImpactAnalysis(key);
		for (const affectedKey of impact.directlyAffected) {
			if (touched.has(affectedKey)) {
				validateSetting(affectedKey);
			}
		}

		// Auto-save if enabled
		if (autoSave && onSave && !hasErrors) {
			await save();
		}
	}

	// Set multiple values at once
	function setValues(newValues: SettingsValues): void {
		values = { ...values, ...newValues };
		Object.keys(newValues).forEach((key) => touched.add(key));
		validateAll();
	}

	// Touch a field (mark as interacted with)
	function touch(key: string): void {
		touched = new Set([...touched, key]);
	}

	// Touch all fields
	function touchAll(): void {
		const allKeys = registry.getAllSettings().map((s) => s.key);
		touched = new Set(allKeys);
	}

	// Reset to initial values
	function reset(): void {
		values = JSON.parse(initialValues);
		errors = {};
		touched = new Set();
		saveError = undefined;
	}

	// Get impact analysis for a setting
	function getImpactAnalysis(key: string): ImpactAnalysis {
		return registry.getImpactAnalysis(key);
	}

	// Resolve a value through cascade
	async function resolveValue<T>(key: string): Promise<ResolvedSetting<T>> {
		return resolver.resolve<T>(key, resolutionContext);
	}

	// Save values
	async function save(): Promise<boolean> {
		if (!onSave) return false;
		if (hasErrors) return false;

		saving = true;
		saveError = undefined;

		try {
			await onSave(values);
			initialValues = JSON.stringify(values);
			return true;
		} catch (err) {
			saveError = err instanceof Error ? err.message : 'Save failed';
			return false;
		} finally {
			saving = false;
		}
	}

	// Get default value for a setting
	function getDefaultValue(key: string): unknown {
		const setting = registry.getSetting(key);
		return setting?.defaultValue;
	}

	// Reset a single field to default
	function resetField(key: string): void {
		const defaultValue = getDefaultValue(key);
		if (defaultValue !== undefined) {
			setValue(key, defaultValue);
		}
	}

	// Check if field is changed
	function isFieldChanged(key: string): boolean {
		return changedSettings.includes(key);
	}

	// Check if field has error
	function hasFieldError(key: string): boolean {
		return !!errors[key];
	}

	// Get field error
	function getFieldError(key: string): string | undefined {
		return errors[key];
	}

	// Get field value
	function getFieldValue(key: string): unknown {
		return values[key];
	}

	// Get all errors as array
	function getAllErrors(): Array<{ key: string; message: string }> {
		return Object.entries(errors)
			.filter(([, error]) => error)
			.map(([key, message]) => ({ key, message: message! }));
	}

	return {
		// State (readable)
		get values() {
			return values;
		},
		get errors() {
			return errors;
		},
		get touched() {
			return touched;
		},
		get dirty() {
			return dirty;
		},
		get saving() {
			return saving;
		},
		get saveError() {
			return saveError;
		},
		get hasErrors() {
			return hasErrors;
		},
		get changedSettings() {
			return changedSettings;
		},
		get visibleBlocks() {
			return visibleBlocks;
		},

		// Methods
		setValue,
		setValues,
		validateSetting,
		validateAll,
		validateTouched,
		touch,
		touchAll,
		reset,
		save,
		resetField,
		getImpactAnalysis,
		resolveValue,
		getDefaultValue,
		isFieldChanged,
		isFieldVisible: isSettingVisible,
		hasFieldError,
		getFieldError,
		getFieldValue,
		getAllErrors,
		getVisibleSettings,
		isBlockVisible
	};
}

/**
 * Type for the settings store
 */
export type SettingsStore = ReturnType<typeof createSettingsStore>;
