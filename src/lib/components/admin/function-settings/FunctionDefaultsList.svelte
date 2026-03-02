<script lang="ts">
	/**
	 * FunctionDefaultsList - Function default settings with model selection
	 *
	 * REFACTORED: Uses shared ModelPickerModal, shared types, whitelist utility.
	 * Removed ~70 lines of duplicated code.
	 */
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import { Button } from '$lib/components/ui/button';
	import ModelPickerModal from '$lib/components/shared/model-selection/model-picker-modal.svelte';
	import type { Model, ModelVariant, ProviderGroup, ThinkingLevel } from '$lib/types/model.types';
	import { normalizeToProviderGroups } from '$lib/types/model.types';
	import { filterModelsByWhitelist } from '$lib/utils/model-whitelist';

	// Local interface for function config (business data from parent)
	interface FunctionConfig {
		modelId: string;
		modelName: string;
		modelProvider?: string | null;
		modelLogo?: string | null;
		temperature: number;
		maxTokens: number;
		thinkingLevel?: string | null;
		promptTemplate?: string | null;
		promptLinkId?: number | null;
		modelVariant?: string | null;
	}

	interface Props {
		executor?: FunctionConfig | null;
		judge?: FunctionConfig | null;
		improve?: FunctionConfig | null;
		prompts?: { id: number; title: string }[];
		models?: Record<string, unknown>[]; // Raw models from API
		allowedModels?: string[];
		onModelSelect: (type: 'executor' | 'judge' | 'improve', model: Model) => void;
		onVariantChange?: (type: 'executor' | 'judge' | 'improve', variant: string | null) => void;
		onPromptChange?: (type: 'executor' | 'judge' | 'improve', promptId: number | null) => void;
		onSettingsChange?: (
			type: 'executor' | 'judge' | 'improve',
			settings: {
				temperature?: number | null;
				maxTokens?: number | null;
				thinkingLevel?: string | null;
			}
		) => void;
		onSave?: () => void;
		isSaving?: boolean;
		isDirty?: boolean;
	}

	let {
		executor,
		judge,
		improve = null,
		prompts = [],
		models = [],
		allowedModels = [],
		onModelSelect,
		onVariantChange,
		onPromptChange,
		onSettingsChange,
		onSave,
		isSaving = false,
		isDirty = false
	}: Props = $props();

	// Convert raw models to normalized structure
	let groupedModels = $derived(normalizeToProviderGroups(models));

	// Flatten to single list for lookups
	let flatModels = $derived.by(() => {
		const flat: Model[] = [];
		for (const group of groupedModels) {
			for (const model of group.models) {
				flat.push({ ...model, providerId: group.providerId });
			}
		}
		return flat;
	});

	let activeModal = $state<'executor' | 'judge' | 'improve' | null>(null);

	const roleConfig = {
		executor: { label: 'Executor', desc: 'Runs prompt content', icon: '▶', color: 'emerald' },
		judge: { label: 'Judge', desc: 'Evaluates responses', icon: '⚖', color: 'violet' },
		improve: { label: 'Improve', desc: 'Improves prompts', icon: '✨', color: 'amber' }
	} as const;

	function getConfig(type: 'executor' | 'judge' | 'improve'): FunctionConfig | undefined {
		if (type === 'executor') return executor ?? undefined;
		if (type === 'judge') return judge ?? undefined;
		return improve ?? executor ?? undefined;
	}

	/**
	 * Find the model object for a given function config
	 */
	function getModelForConfig(config: FunctionConfig | undefined): Model | undefined {
		if (!config?.modelId) return undefined;
		return flatModels.find(
			(m) =>
				m.id === config.modelId ||
				(config.modelProvider && m.providerId === config.modelProvider && m.id === config.modelId)
		);
	}

	/**
	 * Get available variants for a config's model
	 */
	function getAvailableVariants(config: FunctionConfig | undefined): ModelVariant[] {
		const model = getModelForConfig(config);
		return model?.variants ?? [];
	}

	/**
	 * Check if model supports thinking
	 */
	function supportsThinking(config: FunctionConfig | undefined): boolean {
		const model = getModelForConfig(config);
		return model?.supportsThinking ?? false;
	}

	function openModal(type: 'executor' | 'judge' | 'improve') {
		activeModal = type;
	}

	function handleModalModelSelect(modelId: string, providerId: string) {
		const model = flatModels.find((m) => m.id === modelId && m.providerId === providerId);
		if (model && activeModal) {
			onModelSelect(activeModal, model);
		}
		activeModal = null;
	}
</script>

<div class="space-y-2">
	{#each ['executor', 'judge', 'improve'] as type_}
		{@const type = type_ as 'executor' | 'judge' | 'improve'}
		{@const config = getConfig(type)}
		{@const role = roleConfig[type]}
		{#if config && (type !== 'improve' || improve)}
			<div
				class="group flex flex-col gap-3 rounded-lg border border-border/50 bg-card p-3 transition-all hover:border-border sm:flex-row sm:items-center sm:gap-4"
			>
				<div class="flex items-center gap-3 sm:min-w-[140px]">
					<span
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-{role.color}-100 text-base dark:bg-{role.color}-900/30"
					>
						{role.icon}
					</span>
					<div class="min-w-0">
						<div class="text-sm font-medium">{role.label}</div>
						<div class="truncate text-xs text-muted-foreground">{role.desc}</div>
					</div>
				</div>

				<div class="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/30 focus:ring-2 focus:ring-primary/30 focus:outline-none"
						onclick={() => openModal(type)}
					>
						{#if config.modelProvider}
							<ProviderLogo providerId={config.modelProvider} size="sm" />
						{:else}
							<span class="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs"
								>?</span
							>
						{/if}
						<span class="flex-1 truncate text-sm">
							{#if config.modelName}
								<span class="font-medium">{config.modelName}</span>
							{:else}
								<span class="text-muted-foreground">Select model...</span>
							{/if}
						</span>
						<span class="shrink-0 text-xs text-muted-foreground">Change</span>
					</button>

					{#if getAvailableVariants(config).length > 0}
						{@const availableVariants = getAvailableVariants(config)}
						<select
							class="h-9 min-w-[100px] rounded-md border border-border/60 bg-background px-2 text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
							value={config.modelVariant ?? ''}
							onchange={(e) => {
								const val = (e.target as HTMLSelectElement).value;
								onVariantChange?.(type, val || null);
							}}
						>
							<option value="">Default</option>
							{#each availableVariants as variant}
								<option value={variant.id} selected={config.modelVariant === variant.id}>
									{variant.label || variant.id}
								</option>
							{/each}
						</select>
					{/if}

					<!-- Temperature -->
					<input
						type="number"
						step="0.1"
						min="0"
						max="2"
						placeholder="Temp"
						value={config.temperature ?? ''}
						class="h-9 w-16 rounded-md border border-border/60 bg-background px-2 text-center text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
						onchange={(e) => {
							const val = (e.target as HTMLInputElement).value;
							onSettingsChange?.(type, { temperature: val ? parseFloat(val) : null });
						}}
						title="Temperature (0-2)"
					/>

					<!-- Max Tokens -->
					<input
						type="number"
						step="256"
						min="256"
						max="128000"
						placeholder="Tokens"
						value={config.maxTokens ?? ''}
						class="h-9 w-20 rounded-md border border-border/60 bg-background px-2 text-center text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
						onchange={(e) => {
							const val = (e.target as HTMLInputElement).value;
							onSettingsChange?.(type, { maxTokens: val ? parseInt(val) : null });
						}}
						title="Max tokens"
					/>

					<!-- Thinking Level (only show if model supports it) -->
					{#if supportsThinking(config)}
						<select
							class="h-9 rounded-md border border-border/60 bg-background px-2 text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
							value={config.thinkingLevel ?? ''}
							onchange={(e) => {
								const val = (e.target as HTMLSelectElement).value;
								onSettingsChange?.(type, { thinkingLevel: val || null });
							}}
							title="Thinking level"
						>
							<option value="">Think</option>
							<option value="low" selected={config.thinkingLevel === 'low'}>Low</option>
							<option value="medium" selected={config.thinkingLevel === 'medium'}>Med</option>
							<option value="high" selected={config.thinkingLevel === 'high'}>High</option>
						</select>
					{/if}

					{#if prompts.length > 0}
						<select
							class="h-9 min-w-[140px] rounded-md border border-border/60 bg-background px-2 text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
							value={config.promptLinkId ?? ''}
							onchange={(e) => {
								const val = (e.target as HTMLSelectElement).value;
								onPromptChange?.(type, val ? Number(val) : null);
							}}
						>
							<option value="">No prompt</option>
							{#each prompts as prompt}
								<option value={prompt.id} selected={config.promptLinkId === prompt.id}>
									{prompt.title}
								</option>
							{/each}
						</select>
					{/if}
				</div>
			</div>
		{/if}
	{/each}

	{#if isDirty && onSave}
		<div class="flex justify-end pt-2">
			<Button onclick={onSave} disabled={isSaving}>
				{isSaving ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	{/if}
</div>

<!-- Shared Modal -->
<ModelPickerModal
	open={activeModal !== null}
	title={activeModal ? `Select Model for ${roleConfig[activeModal].label}` : 'Select Model'}
	{groupedModels}
	whitelist={allowedModels}
	selectedModelId={getConfig(activeModal ?? 'executor')?.modelId ?? ''}
	onSave={handleModalModelSelect}
	onClose={() => (activeModal = null)}
/>
