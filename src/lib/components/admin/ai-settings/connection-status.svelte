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
	import { Badge } from '$lib/components/ui/badge';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';
	import type { HealthCheckResult } from '$lib/server/services/opencode.service';
	import { CheckCircle2, XCircle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-svelte';

	interface Props {
		class?: string;
		isConnected?: boolean;
	}

	let { class: className = '', isConnected = $bindable(false) }: Props = $props();

	let health = $state<HealthCheckResult | null>(null);
	let lastCheck = $state<Date | null>(null);
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
			lastCheck = new Date();
			isConnected = health?.healthy ?? false;
		} catch (err) {
			console.error('Failed to load health status:', err);
			toast.error('Failed to load connection status');
			health = {
				healthy: false,
				diagnostics: {
					baseUrl: 'unknown',
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
</script>

<Card class={cn('overflow-hidden', className)}>
	<CardHeader class="pb-4">
		<div class="flex items-start justify-between gap-4">
			<div class="flex items-center gap-3">
				<div class={cn('flex h-12 w-12 items-center justify-center rounded-xl', 'bg-muted')}>
					{#if isLoading}
						<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
					{:else if health?.healthy}
						<CheckCircle2 class="h-6 w-6 text-primary" />
					{:else}
						<XCircle class="h-6 w-6 text-destructive" />
					{/if}
				</div>
				<div>
					<CardTitle class="text-xl font-bold">Connection Status</CardTitle>
					<CardDescription class="mt-1">OpenCode service health check</CardDescription>
				</div>
			</div>
			<Button
				variant="outline"
				size="sm"
				onclick={handleRefresh}
				disabled={isRefreshing || isLoading}
				class="gap-2"
			>
				{#if isRefreshing}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<RefreshCw class="h-4 w-4" />
				{/if}
				<span class="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
			</Button>
		</div>
	</CardHeader>
	<CardContent class="pt-0">
		{#if isLoading}
			<div class="flex items-center gap-3 rounded-lg border bg-muted p-4">
				<Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
				<span class="text-base text-muted-foreground">Checking connection...</span>
			</div>
		{:else if health}
			<div
				class={cn(
					'mb-4 flex items-center gap-3 rounded-lg border p-4',
					health?.healthy ? 'border-primary' : 'border-destructive'
				)}
			>
				{#if health?.healthy}
					<Wifi class="h-6 w-6 shrink-0 text-primary" />
					<div class="flex-1">
						<p class="font-semibold text-primary">Connected</p>
						<p class="text-sm text-muted-foreground">OpenCode service is healthy and responding</p>
					</div>
				{:else}
					<WifiOff class="h-6 w-6 shrink-0 text-destructive" />
					<div class="flex-1">
						<p class="font-semibold text-destructive">Disconnected</p>
						<p class="text-sm text-muted-foreground">Unable to connect to OpenCode service</p>
					</div>
				{/if}
			</div>

			{#if health.diagnostics}
				<div class="space-y-3">
					<h4 class="text-sm font-semibold">Connection Details</h4>
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="rounded-lg border bg-muted p-3">
							<p class="text-xs font-medium text-muted-foreground">Base URL</p>
							<p class="font-mono text-sm font-medium">{health.diagnostics.baseUrl}</p>
						</div>
						<div class="rounded-lg border bg-muted p-3">
							<p class="text-xs font-medium text-muted-foreground">Last Check</p>
							<p class="text-sm font-medium">{lastCheck?.toLocaleString() ?? 'Never'}</p>
						</div>
						{#if health.version}
							<div class="rounded-lg border bg-muted p-3">
								<p class="text-xs font-medium text-muted-foreground">Version</p>
								<p class="font-mono text-sm font-medium">{health.version}</p>
							</div>
						{/if}
						<div class="rounded-lg border bg-muted p-3">
							<p class="text-xs font-medium text-muted-foreground">Status</p>
							<Badge variant={health?.healthy ? 'default' : 'destructive'} class="mt-1">
								{health?.healthy ? 'Healthy' : 'Unhealthy'}
							</Badge>
						</div>
					</div>

					{#if health.diagnostics.error}
						<div class="mt-4 rounded-lg border border-destructive p-4">
							<p class="font-semibold text-destructive">Error Details</p>
							<p class="font-mono text-sm text-muted-foreground">{health.diagnostics.error}</p>
						</div>
					{/if}

					{#if !health.healthy && !health.connected}
						<div class="mt-4 rounded-lg border p-4">
							<p class="font-semibold">OpenCode server is not reachable</p>
							<p class="mt-2 text-sm text-muted-foreground">
								The OpenCode headless server is probably not running. Start the server:
							</p>
							<pre class="overflow-x-auto rounded-lg border bg-muted p-3 font-mono text-sm"><code
									>opencode serve</code
								></pre>
							<p class="mt-3 text-sm text-muted-foreground">
								No API key needed - OpenCode is a local server at {health.diagnostics.baseUrl}
							</p>
						</div>
					{:else if !health.healthy && health.connected}
						<div class="mt-4 rounded-lg border p-4">
							<p class="font-semibold">Server reachable but not healthy</p>
							<p class="mt-2 text-sm text-muted-foreground">
								The server is responding but there's an issue. Check the logs for details.
							</p>
						</div>
					{/if}
				</div>
			{/if}
		{/if}
	</CardContent>
</Card>
