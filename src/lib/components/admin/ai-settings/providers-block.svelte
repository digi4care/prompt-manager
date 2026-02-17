<script lang="ts">
	import { Check, Plus, RefreshCw, Server, X } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { providers, type Provider } from '$lib/stores/providers.svelte';

	// Local state
	let showProviderModal = $state(false);
	let searchQuery = $state('');
	let isRefreshing = $state(false);

	// Derived: filtered providers for modal
	let filteredProviders = $derived.by(() => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) return providers.all;
		return providers.all.filter(
			(p) => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query)
		);
	});

	// Derived: connected providers for main view
	let connectedProviders = $derived.by(() => {
		return providers.all.filter((p) => providers.connectedIds.includes(p.id));
	});

	function openProviderModal() {
		showProviderModal = true;
		searchQuery = '';
	}

	function closeProviderModal() {
		showProviderModal = false;
	}

	async function handleRefresh(force = false) {
		isRefreshing = true;
		if (force) {
			await fetch('/api/opencode/providers/all?force=true');
		}
		await invalidateAll();
		isRefreshing = false;
	}

	// Helper functions
	function getModelCount(provider: Provider): number {
		return provider.models ? Object.keys(provider.models).length : 0;
	}

	function isConnected(providerId: string): boolean {
		return providers.connectedIds.includes(providerId);
	}

	// Auth modal state
	let showAuthModal = $state(false);
	let authProviderId = $state('');
	let authProviderName = $state('');
	let authMethods: { type: string; label: string }[] = $state([]);
	let selectedMethod = $state<{ type: string; label: string } | null>(null);
	let authLoading = $state(false);
	let authError = $state('');
	let apiKeyInput = $state('');

	async function handleConnectProvider(providerId: string) {
		console.log('handleConnectProvider called with:', providerId);
		authProviderId = providerId;
		authProviderName = providers.all.find((p) => p.id === providerId)?.name || providerId;
		authError = '';
		apiKeyInput = '';
		selectedMethod = null;

		try {
			// Fetch auth methods from OpenCode server
			console.log('Fetching auth methods for:', providerId);
			const response = await fetch('/api/opencode/providers/auth');
			const data = await response.json();
			console.log('Auth data received:', Object.keys(data));
			console.log('Auth methods for', providerId + ':', data[providerId]);

			// Get auth methods for this provider
			authMethods = data[providerId] || [];
			console.log('authMethods set to:', authMethods);

			// Fallback: if no auth methods, create default API key method
			if (authMethods.length === 0) {
				console.log('No auth methods, using default API key method');
				authMethods = [
					{
						type: 'api',
						label: 'API Key'
					} as any
				];
			}

			// Auto-select if only one method
			if (authMethods.length === 1) {
				selectedMethod = authMethods[0];
			}

			console.log('Setting showAuthModal to true');
			showAuthModal = true;
		} catch (err) {
			console.error('Failed to fetch auth methods:', err);
			authError = 'Failed to load authentication methods';
		}
	}

	async function submitAuth() {
		if (!selectedMethod || !authProviderId) return;

		authLoading = true;
		authError = '';

		try {
			if (selectedMethod.type === 'api') {
				// API key authentication - use PUT /auth/:providerID
				const response = await fetch(`/api/opencode/providers/auth/${authProviderId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						type: 'api',
						key: apiKeyInput
					})
				});

				if (!response.ok) {
					const error = await response.json();
					authError = error.message || 'Failed to connect provider';
					return;
				}

				const result = await response.json();
				console.log('Provider connected:', authProviderId, 'connected:', result.connected);
				providers.setConnected(result.connected);
				showAuthModal = false;
				showProviderModal = false;
			} else if (selectedMethod.type === 'oauth') {
				// OAuth authentication - start flow
				const response = await fetch(`/api/opencode/providers/oauth/authorize`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						providerId: authProviderId,
						method: 0
					})
				});

				if (!response.ok) {
					const error = await response.json();
					authError = error.message || 'Failed to start OAuth flow';
					return;
				}

				const oauthData = await response.json();
				console.log('OAuth started:', oauthData);

				// Open OAuth URL in new window/tab
				if (oauthData.url) {
					window.open(oauthData.url, '_blank');
				}

				// Show message to complete auth
				authError =
					'Please complete the OAuth authorization in the opened window, then click Continue';
			}
		} catch (err) {
			console.error('Auth error:', err);
			authError = 'Authentication failed';
		} finally {
			authLoading = false;
		}
	}

	function closeAuthModal() {
		showAuthModal = false;
		authProviderId = '';
		authProviderName = '';
		authMethods = [];
		selectedMethod = null;
		authError = '';
		apiKeyInput = '';
	}

	async function handleDisconnectProvider(providerId: string) {
		try {
			const response = await fetch(`/api/opencode/providers/auth/${providerId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Failed to disconnect provider:', error);
				return;
			}

			const result = await response.json();
			console.log('Provider disconnected:', providerId, 'connected:', result.connected);
			providers.setConnected(result.connected);
		} catch (err) {
			console.error('Error disconnecting provider:', err);
		}
	}
</script>

{#if providers.isConnected}
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
					<span>{providers.all.length} available</span>
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
					bind:value={searchQuery}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				/>

				<!-- Stats -->
				<div class="flex items-center justify-between text-xs text-muted-foreground">
					<span>{filteredProviders.length} providers</span>
					<span>{providers.connectedIds.length} connected</span>
				</div>

				<!-- Provider list -->
				<div class="max-h-[400px] space-y-1 overflow-y-auto">
					{#if filteredProviders.length === 0}
						<div class="rounded-md bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
							No providers found
						</div>
					{:else}
						{#each filteredProviders as provider (provider.id)}
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
								{#if providers.isConnected}
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

<!-- Auth Modal (for API key or OAuth) -->
{#if showAuthModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		onclick={closeAuthModal}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="relative w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<!-- Header -->
			<div class="border-b px-4 py-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-lg font-semibold">Connect {authProviderName}</h3>
						<p class="text-sm text-muted-foreground">Authentication required</p>
					</div>
					<button onclick={closeAuthModal} class="rounded p-1 text-muted-foreground hover:bg-muted">
						<X class="h-5 w-5" />
					</button>
				</div>
			</div>

			<!-- Content -->
			<div class="space-y-4 p-4">
				{#if authError}
					<div class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{authError}
					</div>
				{/if}

				<!-- Auth method selection -->
				{#if !selectedMethod && authMethods.length > 1}
					<div class="space-y-2">
						<label class="text-sm font-medium">Select authentication method</label>
						<div class="space-y-1">
							{#each authMethods as method, i (method.type + '-' + i)}
								<option value={method.type}>{method.label}</option>
							{/each}
						</div>
					</div>
				{/if}

				<!-- API Key input -->
				{#if selectedMethod?.type === 'api'}
					<div class="space-y-2">
						<label for="apiKey" class="text-sm font-medium">API Key</label>
						<input
							id="apiKey"
							type="password"
							bind:value={apiKeyInput}
							placeholder="Enter your API key"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						/>
						<p class="text-xs text-muted-foreground">
							Get your API key from the provider's dashboard
						</p>
					</div>
				{/if}

				<!-- OAuth info -->
				{#if selectedMethod?.type === 'oauth'}
					<div class="rounded-md bg-muted/20 px-3 py-3 text-sm">
						<p class="font-medium">OAuth Authorization</p>
						<p class="mt-1 text-xs text-muted-foreground">
							Click "Start OAuth" to open the provider's authorization page. You'll need to complete
							the authorization there.
						</p>
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex justify-end gap-2 border-t px-4 py-3">
				<button
					onclick={closeAuthModal}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted/50"
				>
					Cancel
				</button>
				{#if selectedMethod}
					<button
						onclick={submitAuth}
						disabled={authLoading || (selectedMethod.type === 'api' && !apiKeyInput)}
						class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
					>
						{authLoading
							? 'Connecting...'
							: selectedMethod.type === 'api'
								? 'Connect'
								: 'Start OAuth'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
