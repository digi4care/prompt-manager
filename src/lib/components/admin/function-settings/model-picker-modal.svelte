<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import { innerWidth } from 'svelte/reactivity/window';

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

	interface FlatModel extends GroupedModel {
		providerName: string;
		providerId: string;
	}

	interface Props {
		open: boolean;
		title: string;
		groupedModels: ProviderGroup[];
		selectedModelId?: string;
		selectedModelIds?: string[];
		multiSelect?: boolean;
		onSave?: (modelId: string) => void;
		onSaveMultiple?: (modelIds: string[]) => void;
		onClose: () => void;
	}

	let {
		open = $bindable(false),
		title,
		groupedModels,
		selectedModelId = '',
		selectedModelIds = [],
		multiSelect = false,
		onSave,
		onSaveMultiple,
		onClose
	}: Props = $props();

	let searchQuery = $state('');
	let draftModelIds = $state<string[]>([]);
	let showSelectedOnly = $state(false);
	let dialogElement = $state<HTMLDivElement | null>(null);

	let isMobile = $derived((innerWidth.current ?? 0) < 768);

	$effect(() => {
		if (!open) {
			return;
		}

		searchQuery = '';
		draftModelIds = Array.from(new Set(selectedModelIds));
		showSelectedOnly = false;
		dialogElement?.focus();
	});

	let allModels = $derived.by(() => {
		const flat: FlatModel[] = [];
		for (const provider of groupedModels) {
			for (const model of provider.models) {
				flat.push({
					...model,
					providerName: provider.providerName,
					providerId: provider.providerId
				});
			}
		}

		return flat;
	});

	let filteredModels = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		const selectedSet = new Set(draftModelIds);

		let baseList = allModels;

		if (query) {
			baseList = allModels.filter((model) => {
				return (
					model.providerName.toLowerCase().includes(query) ||
					model.name.toLowerCase().includes(query) ||
					model.id.toLowerCase().includes(query)
				);
			});
		}

		if (multiSelect && showSelectedOnly) {
			return baseList.filter((model) => selectedSet.has(`${model.providerId}/${model.id}`));
		}

		return baseList;
	});

	let selectedModels = $derived.by(() => {
		if (!multiSelect) {
			return [] as FlatModel[];
		}

		const selectedSet = new Set(draftModelIds);
		return allModels.filter((model) => selectedSet.has(`${model.providerId}/${model.id}`));
	});

	let selectedCount = $derived(multiSelect ? draftModelIds.length : 0);

	function isSelectedModel(providerModelId: string): boolean {
		return draftModelIds.includes(providerModelId);
	}

	function handleSelectModel(model: FlatModel): void {
		// Store internally with provider prefix for correct matching
		const providerModelId = `${model.providerId}/${model.id}`;

		if (multiSelect) {
			if (draftModelIds.includes(providerModelId)) {
				draftModelIds = draftModelIds.filter((id) => id !== providerModelId);
			} else {
				draftModelIds = [...draftModelIds, providerModelId];
			}
			return;
		}

		// Single-select: Save immediately and close modal (auto-save behavior)
		onSave?.(model.id);
		onClose();
	}

	function handleSelectAllFiltered(): void {
		if (!multiSelect) {
			return;
		}

		const next = new Set(draftModelIds);
		for (const model of filteredModels) {
			next.add(`${model.providerId}/${model.id}`);
		}

		draftModelIds = Array.from(next);
	}

	function handleClearAllSelection(): void {
		if (!multiSelect) {
			return;
		}

		draftModelIds = [];
	}

	function handleSave(): void {
		// Only used for multi-select mode
		if (!multiSelect) return;

		// Extract raw model IDs without provider prefix
		const rawIds = draftModelIds.map((id) => {
			const parts = id.split('/');
			return parts.length > 1 ? parts.slice(1).join('/') : id;
		});
		onSaveMultiple?.(Array.from(new Set(rawIds)));
		onClose();
	}

	function handleClose(): void {
		onClose();
	}

	function handleDialogKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			handleClose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-4"
		class:items-end={isMobile}
		class:p-0={isMobile}
	>
		<button
			type="button"
			class="absolute inset-0 h-full w-full bg-black/40"
			onclick={handleClose}
			aria-label="Close model picker"
		></button>

		<div
			bind:this={dialogElement}
			class="relative z-10 w-full overflow-hidden border bg-background shadow-xl md:max-w-3xl md:rounded-xl"
			class:max-h-[90vh]={isMobile}
			class:max-h-[85vh]={!isMobile}
			class:rounded-t-2xl={isMobile}
			class:rounded-none={isMobile}
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			onkeydown={handleDialogKeydown}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="border-b px-4 py-3">
				<div class="flex items-center justify-between gap-3">
					<div>
						<h3 class="font-semibold text-base">{title}</h3>
						<p class="text-xs text-muted-foreground">
							{multiSelect
								? 'Select one or more models, then save.'
								: 'Select a model and confirm.'}
						</p>
					</div>
					<Button variant="ghost" size="sm" onclick={handleClose}>Close</Button>
				</div>
			</div>

			<div class="space-y-3 p-4">
				<input
					type="text"
					placeholder="Search provider, model, or id..."
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					bind:value={searchQuery}
				/>

				<div class="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
					{#if multiSelect}
						<div class="flex items-center justify-between gap-2">
							<span>{selectedCount} model(s) selected</span>
							<span class="rounded border px-1.5 py-0.5 text-[10px]">
								{selectedCount}/{allModels.length} selected
							</span>
						</div>
					{:else}
						{selectedCount === 1 ? '1 model selected' : 'No model selected'}
					{/if}
				</div>

				{#if multiSelect}
					<div
						class="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs"
					>
						<label class="inline-flex cursor-pointer items-center gap-2">
							<input type="checkbox" bind:checked={showSelectedOnly} />
							<span>Show selected only</span>
						</label>
						<div class="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onclick={handleSelectAllFiltered}
								disabled={filteredModels.length === 0}
							>
								Select all filtered
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={handleClearAllSelection}
								disabled={draftModelIds.length === 0}
							>
								Clear all
							</Button>
							{#if showSelectedOnly}
								<Button variant="ghost" size="sm" onclick={() => (showSelectedOnly = false)}>
									Reset filter
								</Button>
							{/if}
						</div>
					</div>
				{/if}

				<div class="max-h-[50vh] overflow-y-auto rounded-md border p-2">
					<ul class="space-y-2">
						{#if filteredModels.length === 0}
							<div class="rounded-md px-3 py-4 text-sm text-muted-foreground">
								{showSelectedOnly
									? 'No selected models match this search.'
									: 'No models match your search.'}
							</div>
						{/if}

						{#each filteredModels as model}
							<li>
								<button
									type="button"
									class="w-full cursor-pointer rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/50 {isSelectedModel(
										`${model.providerId}/${model.id}`
									)
										? 'border-primary bg-primary/5'
										: 'border-border'}"
									onclick={(e) => {
										e.stopPropagation();
										handleSelectModel(model);
									}}
								>
									<div class="flex items-center justify-between gap-2">
										<div class="flex items-center gap-2">
											<ProviderLogo
												providerId={model.providerId}
												name={model.providerName}
												size="sm"
											/>
											<span class="font-medium">{model.providerName} / {model.name}</span>
										</div>
										{#if isSelectedModel(`${model.providerId}/${model.id}`)}
											<span
												class="rounded border border-primary bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
											>
												Selected
											</span>
										{/if}
									</div>
									<div class="font-mono text-xs text-muted-foreground">{model.id}</div>
									{#if model.variantOptions && model.variantOptions.length > 0}
										<div class="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
											<span>Variants:</span>
											{#each model.variantOptions as variant}
												<span class="rounded border px-1.5 py-0.5">{variant}</span>
											{/each}
										</div>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				</div>

				{#if multiSelect && selectedModels.length > 0}
					<div class="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
						<div class="mb-1 font-medium">Selected models ({selectedModels.length})</div>
						<div class="flex flex-wrap gap-1">
							{#each selectedModels.slice(0, 8) as model}
								<span class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
									<ProviderLogo providerId={model.providerId} name={model.providerName} size="sm" />
									{model.providerName} / {model.name}
								</span>
							{/each}
							{#if selectedModels.length > 8}
								<span class="rounded border px-1.5 py-0.5 text-muted-foreground">
									+{selectedModels.length - 8} more
								</span>
							{/if}
						</div>
					</div>
				{/if}
			</div>

			{#if multiSelect}
				<div
					class="flex justify-end gap-2 border-t px-4 py-3"
					class:sticky={isMobile}
					class:bottom-0={isMobile}
					class:bg-background={isMobile}
				>
					<Button variant="outline" onclick={handleClose}>Cancel</Button>
					<Button onclick={handleSave} disabled={draftModelIds.length === 0}>Save Selection</Button>
				</div>
			{/if}
		</div>
	</div>
{/if}
