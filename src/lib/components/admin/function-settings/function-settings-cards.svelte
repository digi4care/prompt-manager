<script lang="ts">
	import ModelPickerRow from './model-picker-row.svelte';
	import type { Snippet } from 'svelte';
	import type { FunctionType, PolicyScope, SettingField, FunctionSetting } from './types';

	interface GroupedModel {
		id: string;
		name: string;
		variantOptions?: string[];
	}

	interface ProviderGroup {
		providerName: string;
		providerId: string;
		models: GroupedModel[];
	}

	interface PromptOption {
		id: number;
		title: string;
	}

	interface Props {
		rowTypes: readonly FunctionType[];
		settings: Record<string, FunctionSetting>;
		errors: Record<string, Record<string, string>>;
		displayGroupedModelsByScope: Record<string, ProviderGroup[]>;
		allGroupedModelsWithVariantPolicy: ProviderGroup[];
		prompts: PromptOption[];
		validateField: (
			functionType: string,
			field: SettingField,
			scope: PolicyScope,
			value: unknown,
			immediate?: boolean
		) => void;
		handleReset: (functionType: FunctionType) => Promise<void>;
	}

	let {
		rowTypes,
		settings,
		errors,
		displayGroupedModelsByScope,
		allGroupedModelsWithVariantPolicy,
		prompts,
		validateField,
		handleReset
	}: Props = $props();
</script>

<div class="space-y-4">
	{#each rowTypes as type}
		<div class="rounded-lg border bg-card p-4 shadow-sm">
			<ModelPickerRow
				{type}
				bind:setting={settings[type]}
				error={errors[type] || {}}
				groupedModels={displayGroupedModelsByScope[type]}
				allGroupedModels={allGroupedModelsWithVariantPolicy}
				{prompts}
				onModelChange={(modelId) => validateField(type, 'modelId', 'shared', modelId, true)}
				onValidate={(field, value, immediate) =>
					validateField(type, field, 'shared', value, immediate)}
				onReset={() => handleReset(type)}
			/>
		</div>
	{/each}
</div>
