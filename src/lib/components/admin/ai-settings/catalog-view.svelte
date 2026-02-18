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
			<div class="flex items-center gap-4 text-sm text-muted-foreground">
				<span><strong>{getProviders().length}</strong> providers</span>
				<span>•</span>
				<span><strong>{getModelCount()}</strong> active models</span>
				<span>•</span>
				{#if catalog.cachedAt}
					<span>Cached: {new Date(catalog.cachedAt).toLocaleTimeString()}</span>
				{/if}
			</div>

			{#each getProviders() as provider}
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
							{#each getModelsForProvider(provider) as model}
								<ModelCatalogCard {model} provider={provider.id} />
							{/each}
						</div>
					</div>
				</Collapsible>
			{/each}
		</div>
	{/if}
</div>
