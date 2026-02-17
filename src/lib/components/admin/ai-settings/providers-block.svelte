<script lang="ts">
	import { Check, Plus, RefreshCw, Server, X } from 'lucide-svelte';
	import { goto, invalidateAll } from '$app/navigation';

	interface Provider {
		id: string;
		name: string;
		description?: string;
		source?: string;
		models?: Record<string, { id: string; name?: string }>;
	}

	interface Props {
		allProviders: Provider[];
		connectedProviderIds: string[];
		connected: boolean;
	}

	let { allProviders = [], connectedProviderIds = [], connected = false }: Props = $props();

	// Modal state
	let showProviderModal = $state(false);
	let modalSearchQuery = $state('');

	// Connected providers set for quick lookup
	let connectedSet = $derived(new Set(connectedProviderIds));

	// Get connected providers only
	let connectedProviders = $derived.by(() => {
		return allProviders.filter((p) => connectedSet.has(p.id));
	});

	// Filtered providers for modal (show all, not just connected)
	let filteredAllProviders = $derived.by(() => {
		if (!allProviders || allProviders.length === 0) return [];
		if (!modalSearchQuery.trim()) return allProviders;
		const query = modalSearchQuery.toLowerCase();
		return allProviders.filter(
			(p) =>
				p.name.toLowerCase().includes(query) ||
				p.id.toLowerCase().includes(query) ||
				p.description?.toLowerCase().includes(query)
		);
	});

	function getModelCount(provider: Provider): number {
		return provider.models ? Object.keys(provider.models).length : 0;
	}

	function isConnected(providerId: string): boolean {
		return connectedSet.has(providerId);
	}

	function openProviderModal() {
		showProviderModal = true;
		modalSearchQuery = '';
	}

	function closeProviderModal() {
		showProviderModal = false;
	}

	async function handleRefresh(force = false) {
		if (force) {
			// Force refresh by calling API with force parameter to clear cache
			await fetch('/api/opencode/providers/all?force=true');
			// Then navigate with refresh parameter to get fresh data from server
			goto('?refresh=true', { replaceState: true, noScroll: true, keepFocus: true });
		} else {
			await invalidateAll();
		}
	}

	function handleConnectProvider(providerId: string) {
		// TODO: Implement auth flow
		console.log('Connect provider:', providerId);
	}

	async function handleDisconnectProvider(providerId: string) {
		try {
			const response = await fetch('/api/opencode/providers/auth', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ providerId })
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to disconnect provider:', error);
				return;
			}

			console.log('Provider disconnected:', providerId);
			// Force refresh providers list to get updated connected status
			await handleRefresh(true);
		} catch (err) {
			console.error('Error disconnecting provider:', err);
		}
	}
</script>

{#if connected}
	<div class="space-y-4">
		<!-- Action buttons -->
		<div class="flex gap-2">
			<button
				onclick={openProviderModal}
				class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				<Plus class="h-4 w-4" />
				Add Provider
			</button>
			<button
				onclick={() => handleRefresh()}
				class="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50"
			>
				<RefreshCw class="h-4 w-4" />
				Refresh
			</button>
		</div>

		<!-- Connected providers list -->
		{#if connectedProviders.length === 0}
			<div class="rounded-md bg-muted/20 px-3 py-6 text-center">
				<p class="text-sm text-muted-foreground">No providers connected yet</p>
				<p class="mt-1 text-xs text-muted-foreground">Click "Add Provider" to connect one</p>
			</div>
		{:else}
			<div class="space-y-2">
				<div class="flex items-center justify-between text-xs text-muted-foreground">
					<span>{connectedProviders.length} connected</span>
					<span>{allProviders.length} available</span>
				</div>

				{#each connectedProviders as provider (provider.id)}
					<div
						class="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2"
					>
						<div class="flex items-center gap-3">
							<Server class="h-4 w-4 text-primary" />
							<div>
								<div class="text-sm font-medium">{provider.name}</div>
								<dl class="flex gap-3 text-xs text-muted-foreground">
									<dt class="sr-only">ID</dt>
									<dd class="font-mono">{provider.id}</dd>
									<dt class="sr-only">Models</dt>
									<dd>{getModelCount(provider)} models</dd>
								</dl>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<span
								class="bg-success/10 text-success flex items-center gap-1 rounded px-2 py-1 text-xs"
							>
								<Check class="h-3 w-3" />
								Connected
							</span>
							<button
								onclick={() => handleDisconnectProvider(provider.id)}
								class="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
								title="Disconnect"
							>
								<X class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div class="rounded-md bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
		Connect to OpenCode first to manage providers
	</div>
{/if}

<!-- Provider Selection Modal (like /connect) -->
{#if showProviderModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		onclick={closeProviderModal}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="relative w-full max-w-2xl overflow-hidden rounded-xl border bg-background shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="border-b px-4 py-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold">Add Provider</h3>
						<p class="text-sm text-muted-foreground">Select a provider to connect</p>
					</div>
					<button
						onclick={closeProviderModal}
						class="rounded p-1 text-muted-foreground hover:bg-muted"
					>
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="space-y-3 p-4">
				<!-- Search -->
				<input
					type="text"
					placeholder="Search providers..."
					bind:value={modalSearchQuery}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				/>

				<!-- Stats -->
				<div class="flex items-center justify-between text-xs text-muted-foreground">
					<span>{filteredAllProviders.length} providers</span>
					<span>{connectedProviderIds.length} connected</span>
				</div>

				<!-- Provider list -->
				<div class="max-h-[400px] space-y-1 overflow-y-auto">
					{#if filteredAllProviders.length === 0}
						<div class="rounded-md bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
							No providers found
						</div>
					{:else}
						{#each filteredAllProviders as provider (provider.id)}
							{@const connected = isConnected(provider.id)}
							<div
								class="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 transition-colors {connected
									? 'border-primary/30 bg-primary/5'
									: 'border-border hover:bg-muted/50'}"
								onclick={() => !connected && handleConnectProvider(provider.id)}
							>
								<div class="flex items-center gap-3">
									<Server class="h-4 w-4 text-muted-foreground" />
									<div>
										<div class="text-sm font-medium">{provider.name}</div>
										<dl class="flex gap-3 text-xs text-muted-foreground">
											<dt class="sr-only">ID</dt>
											<dd class="font-mono">{provider.id}</dd>
											<dt class="sr-only">Models</dt>
											<dd>{getModelCount(provider)} models</dd>
										</dl>
									</div>
								</div>
								{#if connected}
									<span
										class="bg-success/10 text-success flex items-center gap-1 rounded px-2 py-1 text-xs"
									>
										<Check class="h-3 w-3" />
										Connected
									</span>
								{:else}
									<button
										class="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
										onclick={() => handleConnectProvider(provider.id)}
									>
										Connect
									</button>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t px-4 py-3">
				<button
					onclick={closeProviderModal}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
