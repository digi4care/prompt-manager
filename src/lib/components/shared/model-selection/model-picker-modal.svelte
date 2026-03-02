<script lang="ts">
	/**
	 * ModelPickerModal - REUSABLE model selection modal
	 *
	 * SINGLE SOURCE OF TRUTH for model selection UI.
	 * Uses shared types, whitelist filtering, and feature flags.
	 *
	 * DO NOT duplicate this component. Import from:
	 *   '$lib/components/shared/model-selection/model-picker-modal.svelte'
	 */

	import { Button } from '$lib/components/ui/button';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import { innerWidth } from 'svelte/reactivity/window';
	import type { ProviderGroup, Model, ModelSelectionConfig } from '$lib/types/model.types';
	import { DEFAULT_MODEL_SELECTION_CONFIG } from '$lib/types/model.types';
	import { filterProviderGroupsByWhitelist, isWhitelistActive } from '$lib/utils/model-whitelist';

	// ===== PROPS =====
	interface Props {
		/** Whether modal is open */
		open: boolean;
		/** Modal title */
		title?: string;
		/** Provider groups with models (raw from API) */
		groupedModels: ProviderGroup[];
		/** Currently selected model ID (single-select) */
		selectedModelId?: string;
		/** Currently selected model IDs (multi-select) */
		selectedModelIds?: string[];
		/** Whitelist of allowed models (e.g., from policy) */
		whitelist?: string[];
		/** Feature flags for what to show/enable */
		config?: ModelSelectionConfig;
		/** Callback when model selected (single-select) */
		onSave?: (modelId: string, providerId: string) => void;
		/** Callback when models selected (multi-select) */
		onSaveMultiple?: (modelIds: string[]) => void;
		/** Callback when modal closed */
		onClose: () => void;
	}

	let {
		open = $bindable(false),
		title = 'Select Model',
		groupedModels,
		selectedModelId = '',
		selectedModelIds = [],
		whitelist,
		config = DEFAULT_MODEL_SELECTION_CONFIG,
		onSave,
		onSaveMultiple,
		onClose
	}: Props = $props();

	// ===== STATE =====
	let searchQuery = $state('');
	let draftModelIds = $state<string[]>([]);
	let showSelectedOnly = $state(false);
	let dialogElement = $state<HTMLDivElement | null>(null);

	let isMobile = $derived((innerWidth.current ?? 0) < 768);
	let hasWhitelist = $derived(isWhitelistActive(whitelist));

	// Apply whitelist filtering
	let filteredGroups = $derived(
		config.enableWhitelist && hasWhitelist
			? filterProviderGroupsByWhitelist(groupedModels, whitelist)
			: groupedModels
	);

	// Normalize selectedModelIds to include provider prefix on modal open
	$effect(() => {
		if (!open) return;

		searchQuery = '';
		const normalizedIds = new Set<string>();

		// Also include selectedModelId for single-select mode
		if (selectedModelId) {
			const prefixed = findPrefixedId(selectedModelId);
			if (prefixed) normalizedIds.add(prefixed);
		}

		for (const rawId of selectedModelIds) {
			if (rawId.includes('/')) {
				normalizedIds.add(rawId);
				continue;
			}
			const prefixed = findPrefixedId(rawId);
			if (prefixed) normalizedIds.add(prefixed);
		}

		draftModelIds = Array.from(normalizedIds);
		showSelectedOnly = false;
		dialogElement?.focus();
	});

	// Find provider prefix for a raw model ID
	function findPrefixedId(rawId: string): string | null {
		for (const provider of filteredGroups) {
			if (provider.models.some((m) => m.id === rawId)) {
				return `${provider.providerId}/${rawId}`;
			}
		}
		return null;
	}

	// Flatten models for display
	interface FlatModel extends Model {
		providerName: string;
		providerId: string;
	}

	let allModels = $derived.by(() => {
		const flat: FlatModel[] = [];
		for (const provider of filteredGroups) {
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

		if (config.multiSelect && showSelectedOnly) {
			return baseList.filter((model) => selectedSet.has(`${model.providerId}/${model.id}`));
		}

		return baseList;
	});

	let selectedModels = $derived.by(() => {
		if (!config.multiSelect) return [] as FlatModel[];

		const selectedSet = new Set(draftModelIds);
		return allModels.filter((model) => selectedSet.has(`${model.providerId}/${model.id}`));
	});

	let selectedCount = $derived(config.multiSelect ? draftModelIds.length : 0);

	// ===== HANDLERS =====

	function isSelectedModel(providerModelId: string): boolean {
		return draftModelIds.includes(providerModelId);
	}

	function handleSelectModel(model: FlatModel): void {
		const providerModelId = `${model.providerId}/${model.id}`;

		if (config.multiSelect) {
			if (draftModelIds.includes(providerModelId)) {
				draftModelIds = draftModelIds.filter((id) => id !== providerModelId);
			} else {
				draftModelIds = [...draftModelIds, providerModelId];
			}
			return;
		}

		// Single-select: Save immediately and close
		onSave?.(model.id, model.providerId);
		onClose();
	}

	function handleSelectAllFiltered(): void {
		if (!config.multiSelect) return;

		const next = new Set(draftModelIds);
		for (const model of filteredModels) {
			next.add(`${model.providerId}/${model.id}`);
		}
		draftModelIds = Array.from(next);
	}

	function handleClearAllSelection(): void {
		if (!config.multiSelect) return;
		draftModelIds = [];
	}

	function handleSave(): void {
		if (!config.multiSelect) return;

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
			<!-- Header -->
			<div class="border-b px-4 py-3">
				<div class="flex items-center justify-between gap-3">
					<div>
						<h3 class="font-semibold text-base">{title}</h3>
						<p class="text-xs text-muted-foreground">
							{config.multiSelect
								? 'Select one or more models, then save.'
								: 'Select a model and confirm.'}
						</p>
					</div>
					<Button variant="ghost" size="sm" onclick={handleClose}>Close</Button>
				</div>
			</div>

			<!-- Body -->
			<div class="space-y-3 p-4">
				<!-- Search -->
				<input
					type="text"
					placeholder="Search provider, model, or id..."
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					bind:value={searchQuery}
				/>

				<!-- Status bar -->
				<div class="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
					<div class="flex items-center justify-between gap-2">
						<span>
							{#if hasWhitelist && config.enableWhitelist}
								<span class="text-amber-600 dark:text-amber-400"
									>🔒 {allModels.length} whitelisted models</span
								>
							{:else}
								{allModels.length} models available
							{/if}
						</span>
						{#if config.multiSelect}
							<span class="rounded border px-1.5 py-0.5 text-[10px]">
								{selectedCount}/{allModels.length} selected
							</span>
						{/if}
					</div>
				</div>

				<!-- Multi-select controls -->
				{#if config.multiSelect}
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
								Select all
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onclick={handleClearAllSelection}
								disabled={draftModelIds.length === 0}
							>
								Clear
							</Button>
						</div>
					</div>
				{/if}

				<!-- Model list -->
				<div class="max-h-[50vh] overflow-y-auto rounded-md border p-2">
					<ul class="space-y-2">
						{#if filteredModels.length === 0}
							<div class="rounded-md px-3 py-4 text-sm text-muted-foreground">
								{showSelectedOnly
									? 'No selected models match this search.'
									: hasWhitelist && config.enableWhitelist
										? 'No whitelisted models match your search.'
										: 'No models match your search.'}
							</div>
						{/if}

						{#each filteredModels as model (model.id)}
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

									<!-- Variants -->
									{#if config.showVariants && model.variants && model.variants.length > 0}
										<div class="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
											<span>Variants:</span>
											{#each model.variants as variant}
												<span class="rounded border px-1.5 py-0.5"
													>{variant.label || variant.id}</span
												>
											{/each}
										</div>
									{/if}

									<!-- Thinking support indicator -->
									{#if config.showThinkingLevel && model.supportsThinking}
										<div class="mt-1 text-[10px] text-blue-600 dark:text-blue-400">
											🧠 Supports thinking
										</div>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				</div>

				<!-- Selected models preview (multi-select) -->
				{#if config.multiSelect && selectedModels.length > 0}
					<div class="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
						<div class="mb-1 font-medium">Selected ({selectedModels.length})</div>
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

			<!-- Footer (multi-select only) -->
			{#if config.multiSelect}
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
