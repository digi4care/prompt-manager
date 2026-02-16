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
		return catalog?.providers || [];
	}

	function getModelsForProvider(provider: ProviderInfo): ModelInfo[] {
		return Object.values(provider.models || {}).filter((m) => m.status === 'active');
	}

	function getModelCount(): number {
		return getProviders().reduce(
			(count, provider) => count + getModelsForProvider(provider).length,
			0
		);
	}
</script>

<Card class={className}>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="text-lg">Model Catalog</CardTitle>
				<CardDescription>Read-only view of available providers and models</CardDescription>
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
	</CardHeader>
	<CardContent>
		{#if isLoading}
			<div class="flex items-center gap-2 text-muted-foreground">
				<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
				<span>Loading catalog...</span>
			</div>
		{:else if error}
			<div class="text-sm text-red-600 dark:text-red-400">
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
					<Collapsible title="{provider.name} ({Object.keys(provider.models).length} models)">
						<div class="space-y-2">
							<div class="mb-2 text-xs text-muted-foreground">
								<div>Source: {provider.source}</div>
								{#if provider.env && provider.env.length > 0}
									<div>Env vars: {provider.env.join(', ')}</div>
								{/if}
							</div>

							<div class="space-y-1">
								{#each getModelsForProvider(provider) as model}
									<div class="flex items-start gap-2 rounded bg-muted/30 p-2 text-xs">
										<div class="flex-1">
											<div class="font-medium">{model.name}</div>
											<div class="font-mono text-[10px] text-muted-foreground">
												{model.id}
											</div>
										</div>
										{#if model.limit}
											<div class="text-right text-[10px] text-muted-foreground">
												<div>Context: {model.limit.context.toLocaleString()}</div>
												<div>Output: {model.limit.output.toLocaleString()}</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</Collapsible>
				{/each}
			</div>
		{/if}
	</CardContent>
</Card>
