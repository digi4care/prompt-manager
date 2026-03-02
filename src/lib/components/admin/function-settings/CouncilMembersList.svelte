<script lang="ts">
	/**
	 * CouncilMembersList - Council agent settings with model selection
	 *
	 * REFACTORED: Uses shared ModelPickerModal, shared types, whitelist utility.
	 * Removed ~65 lines of duplicated code.
	 */
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Trash2 } from 'lucide-svelte';
	import ModelPickerModal from '$lib/components/shared/model-selection/model-picker-modal.svelte';
	import type { Model, ModelVariant, ProviderGroup } from '$lib/types/model.types';
	import { normalizeToProviderGroups } from '$lib/types/model.types';

	// Local interface for council agent (business data from parent)
	interface CouncilAgent {
		id: number;
		modelId: string;
		modelName?: string | null;
		modelProvider?: string | null;
		modelLogo?: string | null;
		temperature?: number | null;
		maxTokens?: number | null;
		thinkingLevel?: string | null;
		promptLinkId?: number | null;
		modelVariant?: string | null;
	}

	interface Props {
		agents: CouncilAgent[];
		prompts?: { id: number; title: string }[];
		models?: Record<string, unknown>[]; // Raw models from API
		allowedModels?: string[];
		parentType?: 'function_defaults' | 'prompt_function_settings' | 'review_defaults';
		onModelChange: (agentId: number, model: Model) => void;
		onVariantChange?: (agentId: number, variant: string | null) => void;
		onDelete: (agentId: number) => void;
		onAdd: () => void;
		onPromptChange?: (agentId: number, promptId: number | null) => void;
		onSettingsChange?: (
			agentId: number,
			settings: {
				temperature?: number | null;
				maxTokens?: number | null;
				thinkingLevel?: string | null;
			}
		) => void;
	}

	let {
		agents,
		prompts = [],
		models = [],
		allowedModels = [],
		parentType = 'function_defaults',
		onModelChange,
		onVariantChange,
		onDelete,
		onAdd,
		onPromptChange,
		onSettingsChange
	}: Props = $props();

	// Convert raw models to normalized structure for modal
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

	// Modal state - tracks which agent we're editing
	let activeModal = $state<number | null>(null);

	/**
	 * Find the model object for a given agent
	 */
	function getModelForAgent(agent: CouncilAgent): Model | undefined {
		if (!agent.modelId) return undefined;
		return flatModels.find(
			(m) =>
				m.id === agent.modelId ||
				(agent.modelProvider && m.providerId === agent.modelProvider && m.id === agent.modelId)
		);
	}

	/**
	 * Get available variants for an agent's model
	 */
	function getAvailableVariants(agent: CouncilAgent): ModelVariant[] {
		const model = getModelForAgent(agent);
		return model?.variants ?? [];
	}

	/**
	 * Check if agent's model supports thinking
	 */
	function supportsThinking(agent: CouncilAgent): boolean {
		const model = getModelForAgent(agent);
		return model?.supportsThinking ?? false;
	}

	function openModal(agentId: number) {
		activeModal = agentId;
	}

	function handleModalModelSelect(modelId: string, providerId: string) {
		const model = flatModels.find((m) => m.id === modelId && m.providerId === providerId);
		if (model && activeModal !== null) {
			onModelChange(activeModal, model);
		}
		activeModal = null;
	}

	function getActiveAgentModelId(): string {
		if (activeModal === null) return '';
		const agent = agents.find((a) => a.id === activeModal);
		return agent?.modelId ?? '';
	}
</script>

<div class="space-y-3">
	{#if agents.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-8"
		>
			<span class="mb-2 text-2xl">👥</span>
			<p class="mb-4 text-sm text-muted-foreground">No council members yet</p>
			<Button variant="outline" onclick={onAdd}>
				<Plus class="mr-2 h-4 w-4" />
				Add Member
			</Button>
		</div>
	{:else}
		<div class="space-y-1.5">
			{#each agents as agent, i}
				<div
					class="group flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-2.5 transition-all hover:border-border sm:flex-row sm:items-center"
				>
					<div class="flex items-center gap-2 sm:min-w-[100px]">
						<span
							class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-100 text-xs font-bold dark:bg-blue-900/30"
						>
							{i + 1}
						</span>
						<span class="hidden text-sm font-medium sm:inline">Agent</span>
					</div>

					<button
						type="button"
						class="flex flex-1 items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/30 focus:ring-2 focus:ring-primary/30 focus:outline-none"
						onclick={() => openModal(agent.id)}
					>
						{#if agent.modelProvider}
							<ProviderLogo providerId={agent.modelProvider} size="sm" />
						{:else}
							<span class="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px]"
								>?</span
							>
						{/if}
						<span class="flex-1 truncate text-sm">
							{#if agent.modelName}
								<span>{agent.modelName}</span>
							{:else}
								<span class="text-muted-foreground">Select model...</span>
							{/if}
						</span>
					</button>

					{#if getAvailableVariants(agent).length > 0}
						{@const availableVariants = getAvailableVariants(agent)}
						<select
							class="h-8 min-w-[90px] rounded-md border border-border/60 bg-background px-2 text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
							value={agent.modelVariant ?? ''}
							onchange={(e) => {
								const val = (e.target as HTMLSelectElement).value;
								onVariantChange?.(agent.id, val || null);
							}}
						>
							<option value="">Default</option>
							{#each availableVariants as variant}
								<option value={variant.id} selected={agent.modelVariant === variant.id}>
									{variant.label || variant.id}
								</option>
							{/each}
						</select>
					{/if}

					{#if prompts.length > 0}
						<select
							class="h-8 rounded-md border border-border/60 bg-background px-2 text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
							value={agent.promptLinkId ?? ''}
							onchange={(e) => {
								const val = (e.target as HTMLSelectElement).value;
								onPromptChange?.(agent.id, val ? Number(val) : null);
							}}
						>
							<option value="">No prompt</option>
							{#each prompts as prompt}
								<option value={prompt.id} selected={agent.promptLinkId === prompt.id}>
									{prompt.title}
								</option>
							{/each}
						</select>
					{/if}

					<!-- Agent-specific settings -->
					<div class="flex items-center gap-1">
						<input
							type="number"
							step="0.1"
							min="0"
							max="2"
							placeholder="Temp"
							value={agent.temperature ?? ''}
							class="h-8 w-14 rounded-md border border-border/60 bg-background px-1.5 text-center text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
							onchange={(e) => {
								const val = (e.target as HTMLInputElement).value;
								onSettingsChange?.(agent.id, {
									temperature: val ? parseFloat(val) : null
								});
							}}
							title="Temperature (0-2)"
						/>
						<input
							type="number"
							step="256"
							min="256"
							max="32000"
							placeholder="Tokens"
							value={agent.maxTokens ?? ''}
							class="h-8 w-16 rounded-md border border-border/60 bg-background px-1.5 text-center text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
							onchange={(e) => {
								const val = (e.target as HTMLInputElement).value;
								onSettingsChange?.(agent.id, {
									maxTokens: val ? parseInt(val) : null
								});
							}}
							title="Max tokens"
						/>
						{#if supportsThinking(agent)}
							<select
								class="h-8 rounded-md border border-border/60 bg-background px-1.5 text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
								value={agent.thinkingLevel ?? ''}
								onchange={(e) => {
									const val = (e.target as HTMLSelectElement).value;
									onSettingsChange?.(agent.id, {
										thinkingLevel: val || null
									});
								}}
								title="Thinking level"
							>
								<option value="">Think</option>
								<option value="low" selected={agent.thinkingLevel === 'low'}>Low</option>
								<option value="medium" selected={agent.thinkingLevel === 'medium'}>Med</option>
								<option value="high" selected={agent.thinkingLevel === 'high'}>High</option>
							</select>
						{/if}
					</div>

					<button
						type="button"
						class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:ring-2 focus:ring-destructive/30 focus:outline-none"
						onclick={() => onDelete(agent.id)}
						aria-label="Remove member"
					>
						<Trash2 class="h-4 w-4" />
					</button>
				</div>
			{/each}
		</div>

		<Button variant="outline" size="sm" onclick={onAdd} class="w-full">
			<Plus class="mr-2 h-4 w-4" />
			Add Member
		</Button>
	{/if}
</div>

<!-- Shared Modal -->
<ModelPickerModal
	open={activeModal !== null}
	title={activeModal !== null
		? `Select Model for Agent ${agents.findIndex((a) => a.id === activeModal) + 1}`
		: 'Select Model'}
	{groupedModels}
	whitelist={allowedModels}
	selectedModelId={getActiveAgentModelId()}
	onSave={handleModalModelSelect}
	onClose={() => (activeModal = null)}
/>
