<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
	import { Label } from '$lib/components/ui/label';
	import Collapsible from './collapsible.svelte';
	import ModelCatalogCard from './model-catalog-card.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import type {
		CatalogResponse,
		ProviderInfo,
		ModelInfo
	} from '$lib/server/services/opencode.service';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	// Search and filter state
	let searchQuery = $state('');
	let showVisionOnly = $state(false);
	let statusFilter = $state<'all' | 'active' | 'inactive'>('all');

	// Calculate min/max context from all models
	let contextRange = $derived.by(() => {
		const providers = getProviders();
		let min = Infinity;
		let max = 0;

		for (const provider of providers) {
			const models = Object.values((provider.models as Record<string, ModelInfo>) || {});
			for (const model of models) {
				const context = model.context_window || model.limit?.context || 0;
				if (context > 0) {
					min = Math.min(min, context);
					max = Math.max(max, context);
				}
			}
		}

		return { min: min === Infinity ? 0 : min, max: max || 1000000 };
	});

	// Dual-handle slider values [min, max] in tokens
	let sliderValue = $state<[number, number]>([0, 1000000]);

	let catalog = $state<CatalogResponse | null>(null);
	let isLoading = $state(true);
	let isRefreshing = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		await loadCatalog();
	});

	async function loadCatalog(refresh = false) {
		try {
			const response = await fetch(`/api/opencode/providers${refresh ? '?refresh=true' : ''}`);
			const result = await response.json();
			catalog = result;
			error = null;
		} catch (err) {
			console.error('Failed to load catalog:', err);
			error = err instanceof Error ? err.message : 'Failed to load catalog';
			toast.error('Failed to load model catalog');
		} finally {
			isLoading = false;
		}
	}

	async function handleRefresh() {
		isRefreshing = true;
		await loadCatalog(true);
		isRefreshing = false;
	}

	function getProviders(): ProviderInfo[] {
		return (catalog?.providers as ProviderInfo[]) || [];
	}

	function getModelsForProvider(provider: ProviderInfo): ModelInfo[] {
		return Object.values((provider.models as Record<string, ModelInfo>) || {}).filter(
			(m) => m.status === 'active'
		);
	}

	function getModelCount(): number {
		return getProviders().reduce(
			(count, provider) => count + getModelsForProvider(provider).length,
			0
		);
	}

	// Filtered providers based on search
	function getFilteredProviders(): ProviderInfo[] {
		const providers = getProviders();
		if (!searchQuery && !showVisionOnly) return providers;

		const query = searchQuery.toLowerCase();

		return providers
			.map((provider) => {
				const models = getModelsForProvider(provider);
				const filteredModels = models.filter((model) => {
					// Vision filter
					if (showVisionOnly && !model.supports_vision) return false;
					// Search filter
					if (query) {
						const name = model.name?.toLowerCase() || '';
						const id = model.id?.toLowerCase() || '';
						const description = model.description?.toLowerCase() || '';
						return (
							name.includes(query) ||
							id.includes(query) ||
							description.includes(query) ||
							provider.name.toLowerCase().includes(query)
						);
					}
					return true;
				});

				// Return provider with filtered models
				if (filteredModels.length === 0) return null;

				return {
					...provider,
					models: Object.fromEntries(filteredModels.map((m) => [m.id, m]))
				} as ProviderInfo;
			})
			.filter((p): p is ProviderInfo => p !== null);
	}

	// Helper to filter models based on current filters
	function filterModels(models: ModelInfo[]): ModelInfo[] {
		const query = searchQuery.toLowerCase();
		return models.filter((model) => {
			// Status filter
			if (statusFilter === 'active' && model.status !== 'active') return false;
			if (statusFilter === 'inactive' && model.status === 'active') return false;
			// Vision filter
			if (showVisionOnly && !model.supports_vision) return false;
			// Context filter using dual slider (sliderValue is [min, max] in tokens)
			const context = model.context_window || model.limit?.context || 0;
			if (context < sliderValue[0] || context > sliderValue[1]) return false;
			// Search filter
			if (query) {
				const name = model.name?.toLowerCase() || '';
				const id = model.id?.toLowerCase() || '';
				const description = model.description?.toLowerCase() || '';
				return name.includes(query) || id.includes(query) || description.includes(query);
			}
			return true;
		});
	}

	// Get filtered models for a specific provider
	function getFilteredModelsForProvider(provider: ProviderInfo): ModelInfo[] {
		const models = Object.values(provider.models || {});
		return filterModels(models);
	}

	// Get filtered model count
	function getFilteredModelCount(): number {
		return getFilteredProviders().reduce((count, provider) => {
			return count + Object.keys(provider.models || {}).length;
		}, 0);
	}
</script>

<div class={className}>
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold">Model Catalog</h3>
			<p class="text-sm text-muted-foreground">Read-only view of available providers and models</p>
		</div>
		<Button
			variant="outline"
			size="sm"
			onclick={handleRefresh}
			disabled={isRefreshing || isLoading}
		>
			{isRefreshing ? 'Refreshing...' : 'Refresh'}
		</Button>
	</div>

	<!-- Search and Filter -->
	<div class="mt-4 space-y-3">
		<div class="flex flex-wrap gap-3">
			<Input
				type="search"
				placeholder="Search models..."
				bind:value={searchQuery}
				class="max-w-xs"
			/>

			<select
				bind:value={statusFilter}
				class="rounded-md border border-input bg-background px-3 py-2 text-sm"
			>
				<option value="all">All Status</option>
				<option value="active">Active</option>
				<option value="inactive">Inactive</option>
			</select>

			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={showVisionOnly} class="rounded border-input" />
				Vision
			</label>
		</div>

		<!-- Context Range Filter with Slider -->
		<div class="flex flex-wrap items-center gap-4 text-sm">
			<span class="min-w-[60px] text-muted-foreground">Context:</span>
			<div class="flex w-full items-center gap-4">
				<div class="flex-1">
					<Slider
						bind:value={sliderValue}
						min={0}
						max={contextRange.max}
						step={10000}
						class="w-full"
					/>
				</div>
				<div class="text-sm whitespace-nowrap text-muted-foreground">
					{Math.round(sliderValue[0] / 1000)}K - {Math.round(sliderValue[1] / 1000)}K
				</div>
				<button
					class="text-xs text-muted-foreground hover:text-foreground"
					onclick={() => {
						sliderValue = [0, contextRange.max];
					}}
				>
					Reset
				</button>
			</div>
		</div>
	</div>
	{#if isLoading}
		<div class="flex items-center gap-2 text-muted-foreground">
			<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
			<span>Loading catalog...</span>
		</div>
	{:else if error}
		<div class="text-sm text-destructive">
			<p>Failed to load catalog: {error}</p>
		</div>
	{:else if catalog}
		<div class="space-y-4">
			<div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
				<span><strong>{getFilteredProviders().length}</strong> providers</span>
				<span>•</span>
				<span><strong>{getFilteredModelCount()}</strong> models</span>
				<span>•</span>
				{#if catalog.cachedAt}
					<span>Cached: {new Date(catalog.cachedAt).toLocaleTimeString()}</span>
				{/if}
			</div>

			{#each getFilteredProviders() as provider}
				<Collapsible title="{provider.name} ({Object.keys(provider.models || {}).length} models)">
					<div class="space-y-4">
						<div class="flex flex-wrap items-center gap-2">
							{#if provider.source}
								<Badge variant="outline" class="text-xs">
									{provider.source}
								</Badge>
							{/if}
							{#if provider.env && provider.env.length > 0}
								<Badge variant="secondary" class="text-xs">
									{provider.env.length} env vars
								</Badge>
							{/if}
						</div>

						<div class="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
							{#each getFilteredModelsForProvider(provider) as model}
								<ModelCatalogCard
									id={model.id}
									name={model.name}
									provider={provider.id}
									description={model.description}
									meta={model}
								/>
							{/each}
						</div>
					</div>
				</Collapsible>
			{/each}
		</div>
	{/if}
</div>
