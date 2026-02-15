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
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';
	import type { HealthCheckResult } from '$lib/server/services/opencode.service';

	interface Props {
		class?: string;
		isConnected?: boolean;
	}

	let { class: className = '', isConnected = $bindable(false) }: Props = $props();

	let health = $state<HealthCheckResult | null>(null);
	let isLoading = $state(true);
	let isRefreshing = $state(false);

	onMount(async () => {
		await loadHealth();
	});

	async function loadHealth() {
		try {
			const response = await fetch('/api/admin/health');
			const result = await response.json();
			health = result.data;
			isConnected = health?.healthy ?? false;
		} catch (err) {
			console.error('Failed to load health status:', err);
			toast.error('Failed to load connection status');
			health = {
				healthy: false,
				diagnostics: {
					baseUrl: 'unknown',
					timestamp: new Date().toISOString(),
					error: err instanceof Error ? err.message : 'Unknown error'
				}
			};
			isConnected = false;
		} finally {
			isLoading = false;
		}
	}

	async function handleRefresh() {
		isRefreshing = true;
		await loadHealth();
		isRefreshing = false;
	}

	function getStatusColor(): string {
		if (isLoading) return 'text-muted-foreground';
		return health?.healthy
			? 'text-green-600 dark:text-green-400'
			: 'text-red-600 dark:text-red-400';
	}

	function getStatusText(): string {
		if (isLoading) return 'Checking...';
		return health?.healthy ? 'Connected' : 'Disconnected';
	}
</script>

<Card class={className}>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="text-lg">Connection Status</CardTitle>
				<CardDescription>OpenCode service health</CardDescription>
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
				<span>Checking connection...</span>
			</div>
		{:else if health}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium">Status:</span>
					<span class={cn('text-sm font-semibold', getStatusColor())}>{getStatusText()}</span>
				</div>

				{#if health.diagnostics}
					<div class="mt-3 space-y-1 border-t pt-3">
						<div class="flex justify-between text-xs text-muted-foreground">
							<span>Base URL:</span>
							<span class="font-mono">{health.diagnostics.baseUrl}</span>
						</div>
						<div class="flex justify-between text-xs text-muted-foreground">
							<span>Last Check:</span>
							<span>
								{new Date(health.diagnostics.timestamp).toLocaleString()}
							</span>
						</div>
						{#if health.version}
							<div class="flex justify-between text-xs text-muted-foreground">
								<span>Version:</span>
								<span class="font-mono">{health.version}</span>
							</div>
						{/if}
						{#if health.diagnostics.error}
							<div class="mt-2 text-xs text-red-600 dark:text-red-400">
								<span class="font-medium">Error:</span>
								<span class="ml-1 font-mono">
									{health.diagnostics.error}
								</span>
							</div>
						{/if}
					</div>

					{#if !health.healthy && !health.connected}
						<div
							class="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
						>
							<p class="text-sm font-medium text-amber-800 dark:text-amber-200">
								OpenCode server is niet bereikbaar
							</p>
							<p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
								De OpenCode headless server draait waarschijnlijk niet. Start de server:
							</p>
							<code
								class="mt-2 block rounded bg-amber-100 p-2 font-mono text-xs text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
							>
								opencode serve
							</code>
							<p class="mt-2 text-xs text-amber-600 dark:text-amber-400">
								Geen API key nodig - OpenCode is een lokale server op {health.diagnostics.baseUrl}
							</p>
						</div>
					{:else if !health.healthy && health.connected}
						<div
							class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30"
						>
							<p class="text-sm font-medium text-red-800 dark:text-red-200">
								Server bereikbaar maar niet healthy
							</p>
							<p class="mt-1 text-xs text-red-700 dark:text-red-300">
								De server reageert maar er is een probleem. Check de logs.
							</p>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</CardContent>
</Card>
