<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import ModelPickerModal from './model-picker-modal.svelte';
	import type { FunctionType, SettingField, FunctionSetting } from './types';

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

	interface Props {
		type: FunctionType;
		setting: FunctionSetting;
		error: Record<string, string>;
		groupedModels: ProviderGroup[];
		allGroupedModels: ProviderGroup[];
		prompts: Array<{ id: number; title: string }>;
		onModelChange: (modelId: string) => void;
		onValidate: (field: SettingField, value: unknown, immediate: boolean) => void;
		onReset: () => void;
	}

	let {
		type,
		setting = $bindable(),
		error,
		groupedModels,
		allGroupedModels,
		prompts,
		onModelChange,
		onValidate,
		onReset
	}: Props = $props();

	let hasError = $derived(Object.keys(error).length > 0);
	let isModelModalOpen = $state(false);

	let selectedModel = $derived.by(() => {
		for (const group of allGroupedModels) {
			const model = group.models.find((entry) => entry.id === setting.modelId);
			if (model) {
				return {
					...model,
					providerName: group.providerName,
					providerId: group.providerId
				};
			}
		}

		return null;
	});

	function getVariantOptionsForModel(modelId: string): string[] {
		if (!modelId) {
			return [];
		}

		for (const group of allGroupedModels) {
			const model = group.models.find((entry) => entry.id === modelId);
			if (model?.variantOptions && model.variantOptions.length > 0) {
				return model.variantOptions;
			}
		}

		return [];
	}

	$effect(() => {
		const modelId = setting.modelId;
		const variantOptions = getVariantOptionsForModel(modelId);

		if (variantOptions.length === 0) {
			if (setting.modelVariant !== null && setting.modelVariant !== undefined) {
				setting.modelVariant = null;
				onValidate('modelVariant', { modelId, modelVariant: null }, true);
			}
			return;
		}

		if (!setting.modelVariant || !variantOptions.includes(setting.modelVariant)) {
			setting.modelVariant = variantOptions[0];
			onValidate('modelVariant', { modelId, modelVariant: setting.modelVariant }, true);
		}
	});

	function handleModelSave(modelId: string): void {
		setting.modelId = modelId;
		const variantOptions = getVariantOptionsForModel(modelId);
		if (variantOptions.length > 0) {
			if (!setting.modelVariant || !variantOptions.includes(setting.modelVariant)) {
				setting.modelVariant = variantOptions[0];
			}
		} else {
			setting.modelVariant = null;
		}

		onValidate('modelVariant', { modelId, modelVariant: setting.modelVariant ?? null }, true);
		onModelChange(modelId);
	}

	function handleVariantChange(event: Event): void {
		const target = event.target as HTMLSelectElement;
		setting.modelVariant = target.value || null;
		onValidate(
			'modelVariant',
			{ modelId: setting.modelId, modelVariant: setting.modelVariant ?? null },
			true
		);
	}

	function handleTemperatureChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value)) {
			setting.temperature = value;
			onValidate('temperature', value, false);
		}
	}

	function handleMaxTokensChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseInt(target.value, 10);
		if (!isNaN(value)) {
			setting.maxTokens = value;
			onValidate('maxTokens', value, false);
		}
	}

	function handlePromptChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		setting.promptId = target.value ? parseInt(target.value, 10) : null;
	}

	function handleTemperatureBlur() {
		onValidate('temperature', setting.temperature, true);
	}

	function handleMaxTokensBlur() {
		onValidate('maxTokens', setting.maxTokens, true);
	}

	function handleResetClick() {
		if (confirm(`Reset ${type} to default values?`)) {
			onReset();
		}
	}

	const functionLabels: Record<string, string> = {
		executor: 'Executor',
		judge: 'Judge',
		improve: 'Improve'
	};

	const defaultTemperatures: Record<string, number> = {
		executor: 0.7,
		judge: 0.3,
		improve: 0.7
	};

	const defaultMaxTokens: Record<string, number> = {
		executor: 4096,
		judge: 2048,
		improve: 4096
	};
</script>

<div class={cn(hasError && 'border-destructive/40 bg-destructive/5')}>
	<div class="mb-3 flex items-start justify-between gap-3">
		<div>
			<div class="flex items-center gap-2">
				<span class="font-medium capitalize">{functionLabels[type]}</span>
				<span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">Default</span>
			</div>
			<p class="mt-1 text-xs text-muted-foreground">
				{#if type === 'executor'}
					Runs prompt content
				{:else if type === 'judge'}
					Evaluates output quality
				{:else}
					Enhances prompt quality
				{/if}
			</p>
		</div>
		<Button variant="ghost" size="sm" onclick={handleResetClick}>Reset</Button>
	</div>

	<div class="grid gap-4 xl:grid-cols-2">
		<div class="space-y-3 rounded-md border bg-background/60 p-3">
			<div class="rounded-md border bg-background px-3 py-2">
				<dl class="space-y-1">
					<dt class="text-[11px] tracking-wide text-muted-foreground uppercase">Selected model</dt>
					<dd class="flex min-w-0 items-center gap-2 text-sm">
						{#if selectedModel}
							<img
								src="https://models.dev/logos/{selectedModel.providerId}.svg"
								alt="{selectedModel.providerId} logo"
								class="h-4 w-4 shrink-0"
								onerror={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
							/>
							<span class="break-words">{selectedModel.providerName} / {selectedModel.name}</span>
						{:else}
							<span class="text-muted-foreground">No model selected</span>
						{/if}
					</dd>
					{#if selectedModel}
						<dd class="font-mono text-[11px] text-muted-foreground">{selectedModel.id}</dd>
					{/if}
				</dl>
			</div>

			{#if selectedModel?.variantOptions && selectedModel.variantOptions.length > 0}
				<div>
					<label
						for={`function-${type}-variant`}
						class="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
						>Variant</label
					>
					<select
						id={`function-${type}-variant`}
						class={cn(
							'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
							error.modelVariant && 'border-destructive'
						)}
						value={setting.modelVariant || selectedModel.variantOptions[0]}
						onchange={handleVariantChange}
					>
						{#each selectedModel.variantOptions as variant}
							<option value={variant}>{variant}</option>
						{/each}
					</select>
				</div>
			{/if}

			<Button
				variant="outline"
				size="sm"
				class="w-full sm:w-auto"
				onclick={() => (isModelModalOpen = true)}
			>
				{selectedModel ? 'Change model' : 'Choose model'}
			</Button>

			{#if error.modelId}
				<div class="text-xs text-destructive">{error.modelId}</div>
			{/if}
			{#if error.modelVariant}
				<div class="text-xs text-destructive">{error.modelVariant}</div>
			{/if}
		</div>

		<div class="space-y-3 rounded-md border bg-background/60 p-3">
			<div class="grid gap-3 md:grid-cols-2">
				<div>
					<label
						for={`function-${type}-temperature`}
						class="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
						>Temperature</label
					>
					<input
						id={`function-${type}-temperature`}
						type="number"
						min="0"
						max="2"
						step="0.1"
						class={cn(
							'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
							error.temperature && 'border-destructive'
						)}
						value={setting.temperature}
						onchange={handleTemperatureChange}
						onblur={handleTemperatureBlur}
					/>
					<div class="mt-1 text-[10px] text-muted-foreground">
						default: {defaultTemperatures[type]}
					</div>
					{#if error.temperature}
						<div class="mt-1 text-xs text-destructive">{error.temperature}</div>
					{/if}
				</div>

				<div>
					<label
						for={`function-${type}-max-tokens`}
						class="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
						>Max tokens</label
					>
					<input
						id={`function-${type}-max-tokens`}
						type="number"
						min="1"
						max="1000000"
						step="1"
						class={cn(
							'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
							error.maxTokens && 'border-destructive'
						)}
						value={setting.maxTokens}
						onchange={handleMaxTokensChange}
						onblur={handleMaxTokensBlur}
					/>
					<div class="mt-1 text-[10px] text-muted-foreground">
						default: {defaultMaxTokens[type].toLocaleString()}
					</div>
					{#if error.maxTokens}
						<div class="mt-1 text-xs text-destructive">{error.maxTokens}</div>
					{/if}
				</div>
			</div>

			<div>
				<label
					for={`function-${type}-prompt`}
					class="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
					>Prompt</label
				>
				<select
					id={`function-${type}-prompt`}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					value={setting.promptId || ''}
					onchange={handlePromptChange}
				>
					<option value="">None</option>
					{#each prompts as prompt}
						<option value={prompt.id}>{prompt.title}</option>
					{/each}
				</select>
				<div class="mt-1 text-[10px] text-muted-foreground">Optional template</div>
			</div>
		</div>
	</div>
</div>

<ModelPickerModal
	bind:open={isModelModalOpen}
	title={`Select ${functionLabels[type]} model`}
	{groupedModels}
	selectedModelId={setting.modelId}
	onSave={handleModelSave}
	onClose={() => (isModelModalOpen = false)}
/>
