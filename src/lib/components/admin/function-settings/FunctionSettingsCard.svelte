<script lang="ts">
	/**
	 * FunctionSettingsCard - Card-style function settings with model selection
	 *
	 * REFACTORED: Uses shared ModelPickerModal, shared types, whitelist utility.
	 * Removed ~110 lines of duplicated code.
	 */
	import { fly } from 'svelte/transition';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import ModelPickerModal from '$lib/components/shared/model-selection/model-picker-modal.svelte';
	import type { Model, ProviderGroup } from '$lib/types/model.types';
	import { normalizeToProviderGroups } from '$lib/types/model.types';

	// Local interface for props - keeps business logic separate
	interface Props {
		type: 'executor' | 'judge' | 'improve' | 'council';
		id?: number;
		label: string;
		description: string;
		modelId?: string | null;
		modelName?: string | null;
		modelProvider?: string | null;
		modelLogo?: string | null;
		temperature?: number;
		maxTokens?: number;
		promptTemplate?: string | null;
		prompts?: { id: string; title: string }[];
		models?: Record<string, unknown>[]; // Raw models from API
		allowedModels?: string[];
		onselect?: (model: Model) => void;
		onDelete?: () => void;
		promptLinkId?: number | null;
		onPromptChange?: (promptId: number | null) => void;
	}

	let {
		type,
		id,
		label,
		description,
		modelId = null,
		modelName = null,
		modelProvider = null,
		modelLogo = null,
		temperature = 0.7,
		maxTokens = 4096,
		promptTemplate = null,
		prompts = [],
		models = [],
		allowedModels = [],
		onselect,
		onDelete,
		promptLinkId = null,
		onPromptChange
	}: Props = $props();

	// Modal state
	let showModal = $state(false);
	let savingPrompt = $state(false);
	let promptSaved = $state(false);

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

	// Autosave prompt when selection changes
	async function savePrompt(promptId: number | null) {
		if (!id || type !== 'council') return;

		savingPrompt = true;
		try {
			await fetch(`/api/admin/council-agents/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ promptLinkId: promptId })
			});
			promptSaved = true;
			setTimeout(() => (promptSaved = false), 2000);
		} catch (e) {
			console.error('Failed to save prompt:', e);
		} finally {
			savingPrompt = false;
		}
	}

	function openModal() {
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function handleModelSelect(modelId: string, providerId: string) {
		const model = flatModels.find((m) => m.id === modelId && m.providerId === providerId);
		if (model) {
			onselect?.(model);
		}
		closeModal();
	}
</script>

<!-- Card: improved visual hierarchy with better shadows and borders -->
<div class="rounded-xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
	<!-- Header: clear visual separation -->
	<div class="border-b border-border/60 bg-muted/20 px-5 py-4">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="text-lg font-semibold capitalize">{label}</h3>
				<p class="mt-0.5 text-sm text-muted-foreground">{description}</p>
			</div>
			<span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
				>Default</span
			>
		</div>
	</div>

	<!-- Content: better spacing and hierarchy -->
	<div class="space-y-6 px-5 py-5">
		<!-- Model Selection: improved styling with focus states -->
		<div class="rounded-lg border border-border/50 bg-background/50 p-4">
			<label class="mb-3 block text-sm font-medium text-foreground"> Selected Model </label>
			{#if modelId}
				<button
					type="button"
					class="flex w-full items-center gap-4 rounded-lg border border-border bg-background p-4 transition-all hover:border-primary/30 hover:bg-accent/50 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:outline-none"
					onclick={openModal}
				>
					{#if modelProvider}
						<ProviderLogo providerId={modelProvider} size="lg" />
					{/if}
					<div class="flex-1 text-left">
						<div class="font-medium">{modelName}</div>
						<div class="text-sm text-muted-foreground">{modelProvider}</div>
					</div>
					<span
						class="rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
						>Change</span
					>
				</button>
			{:else}
				<button
					type="button"
					class="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 p-4 text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent/50 hover:text-foreground focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:outline-none"
					onclick={openModal}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg
					>
					<span class="font-medium">Choose a model</span>
				</button>
			{/if}
		</div>

		<!-- Temperature & Max Tokens: improved inputs with focus states -->
		<div class="grid gap-5 sm:grid-cols-2">
			<div>
				<label for="{type}-temperature" class="mb-2 block text-sm font-medium text-foreground">
					Temperature
				</label>
				<input
					type="number"
					id="{type}-temperature"
					name="{type}-temperature"
					value={temperature}
					min="0"
					max="2"
					step="0.1"
					class="flex h-11 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				/>
				<p class="mt-2 text-xs text-muted-foreground">Controls randomness (0-2)</p>
			</div>
			<div>
				<label for="{type}-max-tokens" class="mb-2 block text-sm font-medium text-foreground">
					Max Tokens
				</label>
				<input
					type="number"
					id="{type}-max-tokens"
					name="{type}-max-tokens"
					value={maxTokens}
					min="1"
					max="1000000"
					step="1"
					class="flex h-11 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				/>
				<p class="mt-2 text-xs text-muted-foreground">Maximum output length</p>
			</div>
		</div>

		<!-- Prompt Template: improved select with focus states -->
		{#if prompts.length > 0}
			<div>
				<label for="{type}-prompt" class="mb-2 block text-sm font-medium text-foreground">
					Prompt Template
				</label>
				{#if prompts && prompts.length > 0}
					<select
						id="{type}-prompt"
						name="{type}-prompt"
						class="flex h-11 w-full rounded-lg border border-border bg-background px-4 py-2 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						onchange={(e: Event) => {
							const target = e.target as HTMLSelectElement;
							const newValue = target.value ? Number(target.value) : null;
							promptLinkId = newValue;
							savePrompt(newValue);
						}}
					>
						<option value="">None</option>
						{#each prompts as prompt}
							<option value={prompt.id} selected={(promptTemplate ?? promptLinkId) === prompt.id}>
								{prompt.title}
							</option>
						{/each}
					</select>
					<p class="mt-1 text-xs text-muted-foreground">Optional template to prepend</p>
					{#if promptSaved}
						<p class="mt-1 text-xs text-green-600">Saved!</p>
					{/if}
				{:else}
					<a
						href="/prompts"
						class="flex h-10 w-full items-center justify-center rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="mr-2 h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M5 12h14" />
							<path d="M12 5v14" />
						</svg>
						Create Prompt
					</a>
					<p class="mt-1 text-xs text-muted-foreground">
						No prompts available. Create one to link.
					</p>
				{/if}
			</div>
		{/if}

		<!-- Delete Button (for council members): improved with focus states -->
		{#if onDelete}
			<div class="mt-6 border-t border-border/60 pt-5">
				<button
					type="button"
					class="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-destructive transition-all hover:bg-destructive/10 focus:ring-2 focus:ring-destructive/50 focus:ring-offset-2 focus:outline-none"
					onclick={() => onDelete()}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
							d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
						/><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg
					>
					Remove Member
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Shared Model Picker Modal -->
<ModelPickerModal
	open={showModal}
	title="Select Model for {label}"
	{groupedModels}
	whitelist={allowedModels}
	selectedModelId={modelId ?? ''}
	onSave={handleModelSelect}
	onClose={closeModal}
/>
