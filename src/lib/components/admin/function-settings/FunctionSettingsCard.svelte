<script lang="ts">
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';

	interface Props {
		type: 'executor' | 'judge' | 'improve' | 'council';
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
		models?: { id: string; name: string; provider: string; logo?: string }[];
	}

	let {
		type,
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
		models = []
	}: Props = $props();

	let showModal = $state(false);
	let searchQuery = $state('');
	let showSelectedOnly = $state(false);

	let filteredModels = $derived(() => {
		let result = models;
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

	function openModal() {
		showModal = true;
		searchQuery = '';
		showSelectedOnly = false;
	}

	function closeModal() {
		showModal = false;
	}
</script>

<div class="rounded-lg border bg-card shadow-sm">
	<div class="border-b p-4">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="font-medium capitalize">{label}</h3>
				<p class="text-sm text-muted-foreground">{description}</p>
			</div>
			<span class="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">Default</span>
		</div>
	</div>

	<div class="space-y-4 p-4">
		<!-- Model Selection -->
		<div class="rounded-lg border bg-background/50 p-3">
			<label class="mb-2 block text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Selected Model
			</label>
			{#if modelId}
				<button
					type="button"
					class="flex w-full items-center gap-3 rounded-md border bg-background p-3 hover:bg-accent"
					onclick={openModal}
				>
					{#if modelLogo}
						<img
							src={modelLogo}
							alt="{modelProvider} logo"
							class="h-8 w-8 rounded-full bg-white p-1 dark:bg-gray-800"
						/>
					{/if}
					<div class="flex-1 text-left">
						<div class="font-medium">{modelName}</div>
						<div class="text-xs text-muted-foreground">{modelProvider}</div>
					</div>
					<span class="text-xs text-muted-foreground">Change</span>
				</button>
			{:else}
				<button
					type="button"
					class="flex w-full items-center justify-center gap-2 rounded-md border border-dashed p-4 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					onclick={openModal}
				>
					<span>Choose a model</span>
				</button>
			{/if}
		</div>

		<!-- Temperature & Max Tokens -->
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label
					for="{type}-temperature"
					class="mb-2 block text-xs font-medium tracking-wide text-muted-foreground uppercase"
				>
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
					class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
				/>
				<p class="mt-1 text-xs text-muted-foreground">Controls randomness (0-2)</p>
			</div>
			<div>
				<label
					for="{type}-max-tokens"
					class="mb-2 block text-xs font-medium tracking-wide text-muted-foreground uppercase"
				>
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
					class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
				/>
				<p class="mt-1 text-xs text-muted-foreground">Maximum output length</p>
			</div>
		</div>

		<!-- Prompt Template -->
		{#if prompts.length > 0}
			<div>
				<label
					for="{type}-prompt"
					class="mb-2 block text-xs font-medium tracking-wide text-muted-foreground uppercase"
				>
					Prompt Template
				</label>
				<select
					id="{type}-prompt"
					name="{type}-prompt"
					class="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
				>
					<option value="">None</option>
					{#each prompts as prompt}
						<option value={prompt.id} selected={promptTemplate === prompt.id}>
							{prompt.title}
						</option>
					{/each}
				</select>
				<p class="mt-1 text-xs text-muted-foreground">Optional template to prepend</p>
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
				{#if filteredModels().length === 0}
					<p class="py-8 text-center text-muted-foreground">No models found</p>
				{:else}
					{#each filteredModels() as model}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-md border p-3 hover:bg-accent {modelId ===
							model.id
								? 'border-primary bg-primary/5'
								: ''}"
							name="{type}-model"
							value={model.id}
							onclick={closeModal}
						>
							{#if model.logo}
								<img
									src={model.logo}
									alt="{model.provider} logo"
									class="h-8 w-8 rounded-full bg-white p-1 dark:bg-gray-800"
								/>
							{:else}
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold"
								>
									{model.provider.slice(0, 2)}
								</div>
							{/if}
							<div class="flex-1 text-left">
								<div class="font-medium">{model.name}</div>
								<div class="text-xs text-muted-foreground">{model.provider}</div>
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
