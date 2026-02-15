<script lang="ts">
	import { onMount } from 'svelte';

	interface ConnectionStatus {
		mode: 'local' | 'remote';
		baseUrl: string | null;
		hasPassword: boolean;
		connected: boolean;
		healthy: boolean;
		version: string | null;
		lastConnected: string | null;
	}

	let { onConnectionChange = () => {} }: { onConnectionChange?: (connected: boolean) => void } =
		$props();

	let status = $state<ConnectionStatus | null>(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Form state
	let mode = $state<'local' | 'remote'>('local');
	let baseUrl = $state('');
	let password = $state('');

	async function loadStatus() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/admin/opencode-connection');
			if (!res.ok) throw new Error('Failed to load connection status');
			const data = await res.json();
			status = data.data;
			mode = status?.mode || 'local';
			baseUrl = status?.baseUrl || '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	async function saveSettings() {
		saving = true;
		error = null;
		try {
			const res = await fetch('/api/admin/opencode-connection', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode,
					baseUrl: mode === 'remote' ? baseUrl : null,
					password: mode === 'remote' ? password || null : null
				})
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Failed to save settings');
			}
			const data = await res.json();
			status = data.data;
			password = ''; // Clear password field after save
			onConnectionChange(!!(status?.connected && status?.healthy));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			saving = false;
		}
	}

	async function refreshStatus() {
		await loadStatus();
		onConnectionChange(!!(status?.connected && status?.healthy));
	}

	onMount(loadStatus);
</script>

<div class="rounded-lg border bg-card p-4">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold">OpenCode Verbinding</h3>
		<button
			type="button"
			onclick={refreshStatus}
			disabled={loading}
			class="rounded px-3 py-1 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
		>
			{#if loading}
				Laden...
			{:else}
				Ververs
			{/if}
		</button>
	</div>

	{#if error}
		<div
			class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30"
		>
			<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
		</div>
	{/if}

	<!-- Mode Selector -->
	<div class="mb-4">
		<label class="mb-2 block text-sm font-medium">Verbindingsmodus</label>
		<div class="flex gap-4">
			<label class="flex items-center gap-2">
				<input type="radio" name="mode" value="local" bind:group={mode} class="h-4 w-4" />
				<span class="text-sm font-medium">SDK</span>
				<span class="text-xs text-muted-foreground">(embedded server, geen setup nodig)</span>
			</label>
			<label class="flex items-center gap-2">
				<input type="radio" name="mode" value="remote" bind:group={mode} class="h-4 w-4" />
				<span class="text-sm font-medium">Server</span>
				<span class="text-xs text-muted-foreground">(verbind met externe server)</span>
			</label>
		</div>
	</div>

	<!-- Local Mode Info -->
	{#if mode === 'local'}
		<div
			class="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30"
		>
			<p class="text-sm font-medium text-blue-800 dark:text-blue-200">
				Lokale modus (SDK embedded)
			</p>
			<p class="mt-1 text-xs text-blue-700 dark:text-blue-300">
				De SDK start automatisch een embedded server. Je hoeft <strong>niets</strong> te doen!
			</p>
			<p class="mt-2 text-xs text-blue-600 dark:text-blue-400">
				Heb je al <code class="rounded bg-blue-100 px-1 dark:bg-blue-900/50">opencode serve</code>
				gedraaid? Gebruik dan <strong>Remote</strong> modus.
			</p>
		</div>
	{/if}

	<!-- Remote Mode Fields -->
	{#if mode === 'remote'}
		<div
			class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
		>
			<p class="text-sm font-medium text-amber-800 dark:text-amber-200">
				Remote modus (externe server)
			</p>
			<p class="mt-1 text-xs text-amber-700 dark:text-amber-300">
				Verbind met een server die je hebt gestart met <code
					class="rounded bg-amber-100 px-1 dark:bg-amber-900/50">opencode serve</code
				>
			</p>
		</div>
		<div class="mb-4 space-y-3">
			<div>
				<label class="mb-1 block text-sm font-medium">
					Server URL <span class="text-red-500">*</span>
				</label>
				<input
					type="url"
					bind:value={baseUrl}
					placeholder="http://localhost:4096"
					class="w-full rounded-md border px-3 py-2 text-sm"
				/>
				<p class="mt-1 text-xs text-muted-foreground">
					Standaard: http://localhost:4096 (als je lokaal <code class="rounded bg-muted px-1"
						>opencode serve</code
					> draait)
				</p>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium"> Wachtwoord </label>
				<input
					type="password"
					bind:value={password}
					placeholder="••••••••"
					class="w-full rounded-md border px-3 py-2 text-sm"
				/>
				<p class="mt-1 text-xs text-muted-foreground">
					Het wachtwoord uit <code class="rounded bg-muted px-1">OPENCODE_SERVER_PASSWORD</code>
					{#if status?.hasPassword}
						<span class="text-green-600">(huidig wachtwoord ingesteld)</span>
					{/if}
				</p>
			</div>
		</div>
	{/if}

	<!-- Save Button -->
	<div class="mb-4">
		<button
			type="button"
			onclick={saveSettings}
			disabled={saving || (mode === 'remote' && !baseUrl)}
			class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
		>
			{#if saving}
				Opslaan...
			{:else}
				Instellingen opslaan
			{/if}
		</button>
	</div>

	<!-- Connection Status -->
	{#if status}
		<div class="border-t pt-4">
			<h4 class="mb-2 text-sm font-medium">Status</h4>
			<div class="flex items-center gap-2">
				{#if status.healthy && status.connected}
					<span
						class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300"
					>
						<span class="mr-1 h-2 w-2 rounded-full bg-green-500"></span>
						Verbonden
					</span>
				{:else if status.connected && !status.healthy}
					<span
						class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
					>
						<span class="mr-1 h-2 w-2 rounded-full bg-amber-500"></span>
						Verbonden (niet healthy)
					</span>
				{:else}
					<span
						class="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300"
					>
						<span class="mr-1 h-2 w-2 rounded-full bg-red-500"></span>
						Niet verbonden
					</span>
				{/if}
				{#if status.version}
					<span class="text-xs text-muted-foreground">v{status.version}</span>
				{/if}
			</div>

			{#if status.lastConnected}
				<p class="mt-2 text-xs text-muted-foreground">
					Laatste verbinding: {new Date(status.lastConnected).toLocaleString()}
				</p>
			{/if}
		</div>
	{/if}
</div>
