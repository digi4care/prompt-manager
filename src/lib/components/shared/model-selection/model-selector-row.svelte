<script lang="ts">
	/**
	 * ModelSelectorRow - Complete model selection with settings
	 *
	 * A row that combines:
	 * - Model selection button (opens ModelPickerModal)
	 * - Variant dropdown (if model has variants)
	 * - Temperature input
	 * - Max tokens input
	 * - Thinking level dropdown (if model supports thinking)
	 * - Prompt link selector (optional)
	 *
	 * Uses shared config to enable/disable features.
	 * SINGLE SOURCE OF TRUTH - do not duplicate.
	 */

	import { Button } from '$lib/components/ui/button';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import ModelPickerModal from './model-picker-modal.svelte';
	import type {
		ProviderGroup,
		ModelSelectionConfig,
		ModelSettings,
		ThinkingLevel,
		ModelVariant
	} from '$lib/types/model.types';
	import { DEFAULT_MODEL_SELECTION_CONFIG } from '$lib/types/model.types';
	import {
		getModelSelectionConfig,
		type ModelSelectionUseCase
	} from '$lib/config/model-selection.config';

	// ===== PROPS =====
	interface Props {
		/** Label for this selector row */
		label: string;
		/** Description shown below label */
		description?: string;
		/** Provider groups with models */
		groupedModels: ProviderGroup[];
		/** Whitelist of allowed models */
		whitelist?: string[];
		/** Currently selected model ID */
		modelId?: string | null;
		/** Currently selected model name (for display) */
		modelName?: string | null;
		/** Currently selected provider ID */
		providerId?: string | null;
		/** Model logo URL */
		logo?: string | null;
		/** Current variant */
		modelVariant?: string | null;
		/** Available variants for current model */
		variants?: ModelVariant[];
		/** Current temperature */
		temperature?: number;
		/** Current max tokens */
		maxTokens?: number;
		/** Current thinking level */
		thinkingLevel?: ThinkingLevel | null;
		/** Whether model supports thinking */
		supportsThinking?: boolean;
		/** Current prompt link ID */
		promptLinkId?: number | null;
		/** Available prompts for linking */
		prompts?: { id: number; title: string }[];
		/** Config preset name or custom config */
		config?: ModelSelectionUseCase | ModelSelectionConfig;
		/** Callback when model selected */
		onModelSelect?: (model: {
			id: string;
			name: string;
			providerId: string;
			logo?: string;
			supportsThinking?: boolean;
			variants?: ModelVariant[];
		}) => void;
		/** Callback when variant changed */
		onVariantChange?: (variant: string | null) => void;
		/** Callback when settings changed */
		onSettingsChange?: (settings: Partial<ModelSettings>) => void;
		/** Callback when prompt changed */
		onPromptChange?: (promptId: number | null) => void;
		/** Show delete button */
		showDelete?: boolean;
		/** Callback when delete clicked */
		onDelete?: () => void;
	}

	let {
		label,
		description,
		groupedModels,
		whitelist,
		modelId = null,
		modelName = null,
		providerId = null,
		logo = null,
		modelVariant = null,
		variants = [],
		temperature = 0.7,
		maxTokens = 4096,
		thinkingLevel = null,
		supportsThinking = false,
		promptLinkId = null,
		prompts = [],
		config: configProp = 'full',
		onModelSelect,
		onVariantChange,
		onSettingsChange,
		onPromptChange,
		showDelete = false,
		onDelete
	}: Props = $props();

	// Normalize config
	let config = $derived(
		typeof configProp === 'string' ? getModelSelectionConfig(configProp) : configProp
	);

	// Modal state
	let isModalOpen = $state(false);

	// Local state for immediate feedback (debounced to parent)
	let localTemperature = $state(temperature);
	let localMaxTokens = $state(maxTokens);
	let localThinkingLevel = $state(thinkingLevel);

	// Sync local state with props
	$effect(() => {
		localTemperature = temperature;
	});
	$effect(() => {
		localMaxTokens = maxTokens;
	});
	$effect(() => {
		localThinkingLevel = thinkingLevel;
	});

	// Check if we have a model selected
	let hasModel = $derived(Boolean(modelId));

	// Check if variant selector should show
	let showVariantSelector = $derived(
		config.showVariants && hasModel && variants && variants.length > 0
	);

	// Check if thinking selector should show
	let showThinkingSelector = $derived(config.showThinkingLevel && hasModel && supportsThinking);

	// Handle model selection from modal
	function handleModelSelect(modelId: string, providerId: string) {
		// Find model details
		let selectedModel:
			| {
					id: string;
					name: string;
					providerId: string;
					logo?: string;
					supportsThinking?: boolean;
					variants?: ModelVariant[];
			  }
			| undefined;

		for (const group of groupedModels) {
			const model = group.models.find((m) => m.id === modelId);
			if (model) {
				selectedModel = {
					id: model.id,
					name: model.name,
					providerId: group.providerId,
					logo: model.logo,
					supportsThinking: model.supportsThinking,
					variants: model.variants
				};
				break;
			}
		}

		if (selectedModel) {
			onModelSelect?.(selectedModel);
		}
	}

	// Handle settings changes with debounce
	let settingsTimeout: ReturnType<typeof setTimeout>;
	function handleTemperatureChange(value: number) {
		localTemperature = value;
		clearTimeout(settingsTimeout);
		settingsTimeout = setTimeout(() => {
			onSettingsChange?.({ temperature: value });
		}, 300);
	}

	function handleMaxTokensChange(value: number) {
		localMaxTokens = value;
		clearTimeout(settingsTimeout);
		settingsTimeout = setTimeout(() => {
			onSettingsChange?.({ maxTokens: value });
		}, 300);
	}

	function handleThinkingLevelChange(value: ThinkingLevel | null) {
		localThinkingLevel = value;
		onSettingsChange?.({ thinkingLevel: value });
	}

	function handleVariantChange(value: string) {
		onVariantChange?.(value || null);
	}

	function handlePromptChange(value: string) {
		const id = value ? parseInt(value, 10) : null;
		onPromptChange?.(id);
	}
</script>

<div class="rounded-lg border bg-card p-4">
	<!-- Header -->
	<div class="mb-3 flex items-start justify-between">
		<div>
			<h4 class="text-sm font-medium">{label}</h4>
			{#if description}
				<p class="text-xs text-muted-foreground">{description}</p>
			{/if}
		</div>
		{#if showDelete}
			<Button variant="ghost" size="sm" class="text-destructive" onclick={onDelete}>Remove</Button>
		{/if}
	</div>

	<!-- Model selector button -->
	<div class="mb-3">
		<button
			type="button"
			class="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/50"
			onclick={() => (isModalOpen = true)}
		>
			{#if hasModel}
				<div class="flex items-center gap-2">
					{#if logo}
						<img src={logo} alt={providerId || ''} class="h-5 w-5 rounded" />
					{:else if providerId}
						<ProviderLogo {providerId} name={providerId} size="sm" />
					{/if}
					<span class="text-sm font-medium">{modelName || modelId}</span>
				</div>
			{:else}
				<span class="text-sm text-muted-foreground">Select a model...</span>
			{/if}
			<span class="text-xs text-muted-foreground">Change</span>
		</button>
	</div>

	<!-- Settings grid -->
	{#if hasModel}
		<div class="grid gap-3 sm:grid-cols-2">
			<!-- Variant selector -->
			{#if showVariantSelector}
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground">Variant</label>
					<select
						class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						value={modelVariant || ''}
						onchange={(e) => handleVariantChange(e.currentTarget.value)}
					>
						<option value="">Default</option>
						{#each variants as variant}
							<option value={variant.id}>{variant.label || variant.id}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Thinking level selector -->
			{#if showThinkingSelector}
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground">Thinking Level</label>
					<select
						class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						value={localThinkingLevel || ''}
						onchange={(e) =>
							handleThinkingLevelChange((e.currentTarget.value as ThinkingLevel) || null)}
					>
						<option value="">Disabled</option>
						<option value="low">Low</option>
						<option value="medium">Medium</option>
						<option value="high">High</option>
					</select>
				</div>
			{/if}

			<!-- Temperature -->
			{#if config.showTemperature}
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground"
						>Temperature ({localTemperature})</label
					>
					<input
						type="range"
						min="0"
						max="2"
						step="0.1"
						class="w-full"
						value={localTemperature}
						oninput={(e) => handleTemperatureChange(parseFloat(e.currentTarget.value))}
					/>
				</div>
			{/if}

			<!-- Max tokens -->
			{#if config.showMaxTokens}
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground">Max Tokens</label>
					<input
						type="number"
						min="1"
						max="128000"
						step="256"
						class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						value={localMaxTokens}
						oninput={(e) => handleMaxTokensChange(parseInt(e.currentTarget.value, 10) || 4096)}
					/>
				</div>
			{/if}

			<!-- Prompt link -->
			{#if config.showPromptLink && prompts.length > 0}
				<div class="sm:col-span-2">
					<label class="mb-1 block text-xs font-medium text-muted-foreground">Linked Prompt</label>
					<select
						class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						value={promptLinkId || ''}
						onchange={(e) => handlePromptChange(e.currentTarget.value)}
					>
						<option value="">None</option>
						{#each prompts as prompt}
							<option value={prompt.id}>{prompt.title}</option>
						{/each}
					</select>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal -->
<ModelPickerModal
	bind:open={isModalOpen}
	title="Select {label} Model"
	{groupedModels}
	{whitelist}
	{config}
	selectedModelId={modelId || ''}
	onSave={handleModelSelect}
	onClose={() => (isModalOpen = false)}
/>
