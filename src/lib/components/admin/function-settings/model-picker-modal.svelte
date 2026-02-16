<script lang="ts">
	import { Button } from '$lib/components/ui/button';

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
	let draftModelId = $state('');
	let draftModelIds = $state<string[]>([]);
	let showSelectedOnly = $state(false);
	let dialogElement = $state<HTMLDivElement | null>(null);

	$effect(() => {
		if (!open) {
			return;
		}

		searchQuery = '';
		draftModelId = selectedModelId;
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
			return baseList.filter((model) => selectedSet.has(model.id));
		}

		return baseList;
	});

	let selectedModel = $derived(
		multiSelect ? null : allModels.find((model) => model.id === draftModelId) || null
	);

	let selectedModels = $derived.by(() => {
		if (!multiSelect) {
			return [] as FlatModel[];
		}

		const selectedSet = new Set(draftModelIds);
		return allModels.filter((model) => selectedSet.has(model.id));
	});

	let selectedCount = $derived(
		multiSelect ? draftModelIds.length : draftModelId.length > 0 ? 1 : 0
	);

	function isSelectedModel(modelId: string): boolean {
		return multiSelect ? draftModelIds.includes(modelId) : draftModelId === modelId;
	}

	function handleSelectModel(modelId: string): void {
		if (multiSelect) {
			if (draftModelIds.includes(modelId)) {
				draftModelIds = draftModelIds.filter((id) => id !== modelId);
			} else {
				draftModelIds = [...draftModelIds, modelId];
			}
			return;
		}

		draftModelId = modelId;
	}

	function handleSelectAllFiltered(): void {
		if (!multiSelect) {
			return;
		}

		const next = new Set(draftModelIds);
		for (const model of filteredModels) {
			next.add(model.id);
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
		if (multiSelect) {
			onSaveMultiple?.(Array.from(new Set(draftModelIds)));
			onClose();
			return;
		}

		if (!draftModelId) {
			return;
		}

		onSave?.(draftModelId);
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
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 h-full w-full bg-black/40"
			onclick={handleClose}
			aria-label="Close model picker"
		></button>

		<div
			bind:this={dialogElement}
			class="relative z-10 max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl border bg-background shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			onkeydown={handleDialogKeydown}
		>
			<div class="border-b px-4 py-3">
				<div class="flex items-center justify-between gap-3">
					<div>
						<h3 class="text-base font-semibold">{title}</h3>
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
										model.id
									)
										? 'border-primary bg-primary/5'
										: 'border-border'}"
									onclick={() => handleSelectModel(model.id)}
								>
									<div class="flex items-center justify-between gap-2">
										<div class="font-medium">{model.providerName} / {model.name}</div>
										{#if isSelectedModel(model.id)}
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
								<span class="rounded border px-1.5 py-0.5">
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
				{:else if selectedModel}
					<div class="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
						<div class="font-medium">
							Selected: {selectedModel.providerName} / {selectedModel.name}
						</div>
						<div class="font-mono text-muted-foreground">{selectedModel.id}</div>
					</div>
				{/if}
			</div>

			<div class="flex justify-end gap-2 border-t px-4 py-3">
				<Button variant="outline" onclick={handleClose}>Cancel</Button>
				<Button onclick={handleSave} disabled={multiSelect ? false : !draftModelId}
					>Save Selection</Button
				>
			</div>
		</div>
	</div>
{/if}
