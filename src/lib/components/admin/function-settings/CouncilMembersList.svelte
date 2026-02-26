<script lang="ts">
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Trash2, GripVertical } from 'lucide-svelte';

	interface ModelVariant {
		id: string;
		label?: string;
		isDefault?: boolean;
	}

	interface Model {
		id: string;
		name: string;
		provider: string;
		logo?: string;
		variants?: ModelVariant[];
	}

	interface CouncilAgent {
		id: number;
		modelId: string;
		modelName?: string | null;
		modelProvider?: string | null;
		modelLogo?: string | null;
		temperature?: number;
		maxTokens?: number;
		promptLinkId?: number | null;
		modelVariant?: string | null;
	}

	interface Props {
		agents: CouncilAgent[];
		prompts?: { id: number; title: string }[];
		models?: Model[];
		allowedModels?: string[];
		onModelChange: (agentId: number, model: Model) => void;
		onVariantChange?: (agentId: number, variant: string | null) => void;
		onDelete: (agentId: number) => void;
		onAdd: () => void;
		onPromptChange?: (agentId: number, promptId: number | null) => void;
	}

	let {
		agents,
		prompts = [],
		models = [],
		allowedModels = [],
		onModelChange,
		onVariantChange,
		onDelete,
		onAdd,
		onPromptChange
	}: Props = $props();

	let activeModal = $state<number | null>(null);
	let searchQuery = $state('');

	function isModelAllowed(modelId: string, providerId: string): boolean {
		if (!allowedModels?.length) return true;
		const fullId = `${providerId}/${modelId}`.toLowerCase();
		return allowedModels.some((a) => {
			const aLower = a.toLowerCase();
			if (aLower.includes('/')) return fullId === aLower || fullId.startsWith(aLower);
			return modelId.toLowerCase() === aLower || modelId.toLowerCase().startsWith(aLower);
		});
	}

	let filteredModels = $derived.by(() => {
		let result = models.filter((m) => isModelAllowed(m.id, m.provider));
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(m) => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
			);
		}
		return result;
	});

	function openModal(agentId: number) {
		activeModal = agentId;
		searchQuery = '';
	}

	function selectModel(model: Model) {
		if (activeModal !== null) {
			onModelChange(activeModal, model);
			activeModal = null;
		}
	}

	/**
	 * Find the model object for a given agent
	 */
	function getModelForAgent(agent: CouncilAgent): Model | undefined {
		if (!agent.modelId) return undefined;
		return models.find(
			(m) =>
				m.id === agent.modelId ||
				(agent.modelProvider && `${agent.modelProvider}/${m.id}` === agent.modelId)
		);
	}

	/**
	 * Get available variants for an agent's model
	 */
	function getAvailableVariants(agent: CouncilAgent): ModelVariant[] {
		const model = getModelForAgent(agent);
		return model?.variants ?? [];
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

{#if activeModal !== null}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (activeModal = null)}
		onkeydown={(e) => e.key === 'Escape' && (activeModal = null)}
		role="button"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="border-b p-4">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold">
						Select Model for Agent {agents.findIndex((a) => a.id === activeModal) + 1}
					</h3>
					<button
						type="button"
						class="rounded p-1 hover:bg-muted"
						onclick={() => (activeModal = null)}
					>
						✕
					</button>
				</div>
				<input
					type="text"
					placeholder="Search models..."
					bind:value={searchQuery}
					class="mt-3 h-9 w-full rounded-md border bg-background px-3 text-sm"
				/>
			</div>

			<div class="max-h-[50vh] overflow-y-auto p-2">
				{#if filteredModels.length === 0}
					<p class="py-8 text-center text-sm text-muted-foreground">No models found</p>
				{:else}
					{#each filteredModels as model}
						{@const currentAgent = agents.find((a) => a.id === activeModal)}
						{@const isSelected = currentAgent?.modelId === model.id}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-accent {isSelected
								? 'bg-primary/10 ring-1 ring-primary/30'
								: ''}"
							onclick={() => selectModel(model)}
						>
							<ProviderLogo providerId={model.provider} size="sm" />
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm font-medium">{model.name}</div>
								<div class="text-xs text-muted-foreground">{model.provider}</div>
							</div>
							{#if isSelected}
								<span class="text-xs font-medium text-primary">Selected</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
