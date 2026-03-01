<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';

	interface Model {
		id: string;
		name: string;
		provider: string;
		logo?: string;
	}

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
		models?: Model[];
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

	let showModal = $state(false);
	let searchQuery = $state('');
	let showSelectedOnly = $state(false);
	let savingPrompt = $state(false);
	let promptSaved = $state(false);

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

	let filteredModels = $derived.by(() => {
		const modelList = models ?? [];
		let result = modelList;

		// Filter by whitelist if available (provider/model format)
		if (allowedModels && allowedModels.length > 0) {
			result = result.filter((m) => isModelInWhitelist(m.id, m.provider, allowedModels));
		}

		if (searchQuery) {
			result = result.filter(
				(m) =>
					m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					m.provider.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}
		if (showSelectedOnly && modelId) {
			result = result.filter((m) => m.id === modelId);
		}
		return result;
	});

	function isModelInWhitelist(modelId: string, providerId: string, whitelist: string[]): boolean {
		// Use provider/model format for exact matching
		const providerModelId = `${providerId}/${modelId}`.toLowerCase();
		const modelIdLower = modelId.toLowerCase();

		for (const allowed of whitelist) {
			const allowedLower = allowed.toLowerCase();
			// Match provider/model format (e.g., "openrouter/glm-4")
			if (allowedLower.includes('/')) {
				if (providerModelId === allowedLower) return true;
				// Prefix match for variants like "openrouter/glm-4-32k"
				if (providerModelId.startsWith(allowedLower)) return true;
			} else {
				// Legacy support: match just model ID for backward compatibility
				if (modelIdLower === allowedLower) return true;
				if (allowedLower.length >= 7 && modelIdLower.startsWith(allowedLower)) return true;
			}
		}
		return false;
	}

	function openModal() {
		showModal = true;
		searchQuery = '';
		showSelectedOnly = false;
	}

	function closeModal() {
		showModal = false;
	}

	function selectModel(model: { id: string; name: string; provider: string; logo?: string }) {
		onselect?.(model);
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

<!-- Model Picker Modal -->
{#if showModal}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
		onclick={closeModal}
		role="dialog"
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
	>
		<div
			class="max-h-[90vh] w-full overflow-auto rounded-t-lg border bg-background sm:max-h-[80vh] sm:max-w-2xl sm:rounded-lg"
			transition:fly={{ y: 50, duration: 200 }}
			role="dialog"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Modal Header -->
			<div class="sticky top-0 z-10 border-b bg-background p-4">
				<div class="flex items-center justify-between">
					<h2 class="text-lg font-semibold">Select Model for {label}</h2>
					<button
						type="button"
						class="rounded-md p-2 hover:bg-accent"
						onclick={closeModal}
						aria-label="Close"
					>
						✕
					</button>
				</div>
				<input
					type="text"
					placeholder="Search models..."
					bind:value={searchQuery}
					class="mt-3 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
				/>
				{#if modelId}
					<label class="mt-2 flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={showSelectedOnly} />
						Show selected only
					</label>
				{/if}
			</div>

			<!-- Model List -->
			<div class="p-4">
				{#if filteredModels.length === 0}
					<p class="py-8 text-center text-muted-foreground">No models found</p>
				{:else}
					{#each filteredModels as model}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-md border p-3 hover:bg-accent {modelId ===
							model.id
								? 'border-primary bg-primary/5'
								: ''}"
							onclick={() => selectModel(model)}
						>
							<ProviderLogo providerId={model.provider} size="lg" />
							<div class="flex-1 text-left">
								<div class="font-medium">{model.name}</div>
								<div class="text-xs text-muted-foreground">{model.provider}</div>
								{#if model.description}
									<div class="mt-1 line-clamp-2 text-xs text-muted-foreground">
										{model.description}
									</div>
								{/if}
								<div class="mt-2 flex flex-wrap gap-2">
									{#if model.context_window}
										<span class="rounded bg-secondary px-2 py-0.5 text-xs">
											Context: {(model.context_window / 1000).toFixed(0)}K
										</span>
									{/if}
									{#if model.supports_vision}
										<span class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
											>Vision</span
										>
									{/if}
									{#if model.status}
										<span class="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
											>{model.status}</span
										>
									{/if}
									{#if model.limit?.context}
										<span class="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
											Limit: {(model.limit.context / 1000).toFixed(0)}K
										</span>
									{/if}
								</div>
							</div>
							{#if modelId === model.id}
								<span class="text-xs text-primary">Selected</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<!-- Modal Footer -->
			<div class="sticky bottom-0 border-t bg-background p-4">
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="rounded-md border px-4 py-2 hover:bg-accent"
						onclick={closeModal}
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
