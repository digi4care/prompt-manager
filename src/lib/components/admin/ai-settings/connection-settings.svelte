<script lang="ts">
	import { onMount } from 'svelte';

	interface PortRange {
		min: number;
		max: number;
	}

	interface LocalSettings {
		hostname?: string;
		portRange?: PortRange;
	}

	interface RemoteSettings {
		protocol?: 'http' | 'https';
		host?: string;
		port?: number;
		basePath?: string;
		baseUrl?: string;
		username?: string;
		password?: string;
	}

	interface ConnectionSettings {
		mode: 'local' | 'remote';
		local?: LocalSettings;
		remote?: RemoteSettings;
	}

	interface ConnectionStatus {
		mode: 'local' | 'remote';
		settings: ConnectionSettings;
		baseUrl: string;
		port: number | null;
		startedLocalServer: boolean;
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

	let mode = $state<'local' | 'remote'>('local');

	let localHostname = $state('127.0.0.1');
	let localPortMin = $state('10000');
	let localPortMax = $state('65535');

	let remoteProtocol = $state<'http' | 'https'>('http');
	let remoteHost = $state('');
	let remotePort = $state('');
	let remoteBasePath = $state('');
	let remoteBaseUrl = $state('');
	let remoteUsername = $state('');
	let remotePassword = $state('');

	function parseErrorMessage(payload: unknown, fallback: string): string {
		if (typeof payload === 'string') {
			try {
				const parsed = JSON.parse(payload) as { message?: string };
				return parsed.message || payload;
			} catch {
				return payload;
			}
		}

		if (payload && typeof payload === 'object' && 'message' in payload) {
			const message = (payload as { message?: unknown }).message;
			if (typeof message === 'string' && message.length > 0) {
				return message;
			}
		}

		return fallback;
	}

	function applyStatusToForm(nextStatus: ConnectionStatus) {
		mode = nextStatus.mode;

		if (nextStatus.settings.mode === 'local') {
			localHostname = nextStatus.settings.local?.hostname || '127.0.0.1';
			localPortMin = String(nextStatus.settings.local?.portRange?.min ?? 10000);
			localPortMax = String(nextStatus.settings.local?.portRange?.max ?? 65535);
			return;
		}

		remoteProtocol = nextStatus.settings.remote?.protocol ?? 'http';
		remoteHost = nextStatus.settings.remote?.host ?? '';
		remotePort = nextStatus.settings.remote?.port ? String(nextStatus.settings.remote.port) : '';
		remoteBasePath = nextStatus.settings.remote?.basePath ?? '';
		remoteBaseUrl = nextStatus.settings.remote?.baseUrl ?? '';
		remoteUsername = nextStatus.settings.remote?.username ?? '';
	}

	function buildSettingsPayload(): ConnectionSettings {
		if (mode === 'local') {
			const parsedMin = Number(localPortMin);
			const parsedMax = Number(localPortMax);

			return {
				mode: 'local',
				local: {
					hostname: localHostname.trim() || '127.0.0.1',
					portRange: {
						min: Number.isInteger(parsedMin) ? parsedMin : 10000,
						max: Number.isInteger(parsedMax) ? parsedMax : 65535
					}
				}
			};
		}

		const parsedPort = Number(remotePort);
		return {
			mode: 'remote',
			remote: {
				protocol: remoteProtocol,
				host: remoteHost.trim() || undefined,
				port: Number.isInteger(parsedPort) ? parsedPort : undefined,
				basePath: remoteBasePath.trim() || undefined,
				baseUrl: remoteBaseUrl.trim() || undefined,
				username: remoteUsername.trim() || undefined,
				password: remotePassword.length > 0 ? remotePassword : undefined
			}
		};
	}

	function canSaveRemote(): boolean {
		if (remoteBaseUrl.trim().length > 0) {
			return true;
		}

		if (remoteHost.trim().length === 0) {
			return false;
		}

		const parsedPort = Number(remotePort);
		return Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535;
	}

	async function loadStatus() {
		loading = true;
		error = null;

		try {
			const res = await fetch('/api/admin/opencode-connection');
			if (!res.ok) {
				const payload = await res.text();
				throw new Error(parseErrorMessage(payload, 'Failed to load connection status'));
			}

			const data = (await res.json()) as { data: ConnectionStatus };
			status = data.data;
			applyStatusToForm(data.data);
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
					settings: buildSettingsPayload()
				})
			});

			if (!res.ok) {
				const payload = await res.text();
				throw new Error(parseErrorMessage(payload, 'Failed to save settings'));
			}

			const data = (await res.json()) as { data: ConnectionStatus };
			status = data.data;
			applyStatusToForm(data.data);
			remotePassword = '';
			onConnectionChange(Boolean(data.data.connected && data.data.healthy));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			saving = false;
		}
	}

	async function refreshStatus() {
		await loadStatus();
		onConnectionChange(Boolean(status?.connected && status?.healthy));
	}

	onMount(loadStatus);
</script>

<div class="rounded-lg border bg-card p-4">
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold">Connection</h3>
		<button
			type="button"
			onclick={refreshStatus}
			disabled={loading}
			class="rounded px-3 py-1 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
		>
			{#if loading}
				Laden...
			{:else}
				Refresh
			{/if}
		</button>
	</div>

	{#if error}
		<div class="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3">
			<p class="text-sm text-destructive">{error}</p>
		</div>
	{/if}

	<fieldset class="mb-4">
		<legend class="mb-2 block text-sm font-medium">Verbindingsmodus</legend>
		<div class="flex gap-4">
			<label class="flex items-center gap-2">
				<input
					type="radio"
					id="opencode-mode-local"
					name="mode"
					value="local"
					bind:group={mode}
					class="h-4 w-4"
				/>
				<span class="text-sm font-medium">Local</span>
			</label>
			<label class="flex items-center gap-2">
				<input
					type="radio"
					id="opencode-mode-remote"
					name="mode"
					value="remote"
					bind:group={mode}
					class="h-4 w-4"
				/>
				<span class="text-sm font-medium">Remote</span>
			</label>
		</div>
	</fieldset>

	{#if mode === 'local'}
		<div class="mb-4 space-y-3 rounded-md border border-border bg-muted/30 p-3">
			<p class="text-sm font-medium text-foreground">Local mode</p>
			<p class="text-xs text-muted-foreground">
				Local mode start een embedded OpenCode server met een random vrije poort. Poort 4096 wordt
				niet geforceerd.
			</p>
			<div class="grid gap-3 md:grid-cols-3">
				<div>
					<label for="opencode-local-hostname" class="mb-1 block text-sm font-medium"
						>Hostname</label
					>
					<input
						id="opencode-local-hostname"
						type="text"
						bind:value={localHostname}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
				</div>
				<div>
					<label for="opencode-local-port-min" class="mb-1 block text-sm font-medium"
						>Port min</label
					>
					<input
						id="opencode-local-port-min"
						type="number"
						bind:value={localPortMin}
						min="10000"
						max="65535"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
				</div>
				<div>
					<label for="opencode-local-port-max" class="mb-1 block text-sm font-medium"
						>Port max</label
					>
					<input
						id="opencode-local-port-max"
						type="number"
						bind:value={localPortMax}
						min="10000"
						max="65535"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
				</div>
			</div>
		</div>
	{/if}

	{#if mode === 'remote'}
		<div class="mb-4 space-y-3 rounded-md border border-border bg-muted/30 p-3">
			<p class="text-sm font-medium text-foreground">Remote mode</p>
			<p class="text-xs text-muted-foreground">
				Gebruik <code class="rounded border border-border bg-background px-1">baseUrl</code> of vul
				<code class="rounded border border-border bg-background px-1">protocol + host + port</code>
				in.
			</p>

			<div class="grid gap-3 md:grid-cols-3">
				<div>
					<label for="opencode-remote-protocol" class="mb-1 block text-sm font-medium"
						>Protocol</label
					>
					<select
						id="opencode-remote-protocol"
						bind:value={remoteProtocol}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					>
						<option value="http">http</option>
						<option value="https">https</option>
					</select>
				</div>
				<div>
					<label for="opencode-remote-host" class="mb-1 block text-sm font-medium">Host</label>
					<input
						id="opencode-remote-host"
						type="text"
						bind:value={remoteHost}
						placeholder="localhost"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
				</div>
				<div>
					<label for="opencode-remote-port" class="mb-1 block text-sm font-medium">Port</label>
					<input
						id="opencode-remote-port"
						type="number"
						bind:value={remotePort}
						min="1"
						max="65535"
						placeholder="8080"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
				</div>
			</div>

			<div class="grid gap-3 md:grid-cols-2">
				<div>
					<label for="opencode-remote-base-path" class="mb-1 block text-sm font-medium"
						>Base path (optioneel)</label
					>
					<input
						id="opencode-remote-base-path"
						type="text"
						bind:value={remoteBasePath}
						placeholder="/opencode"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
				</div>
				<div>
					<label for="opencode-remote-base-url" class="mb-1 block text-sm font-medium"
						>Base URL override (optioneel)</label
					>
					<input
						id="opencode-remote-base-url"
						type="url"
						bind:value={remoteBaseUrl}
						placeholder="https://api.example.com/opencode"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
				</div>
			</div>

			<div class="grid gap-3 md:grid-cols-2">
				<div>
					<label for="opencode-remote-username" class="mb-1 block text-sm font-medium"
						>Username (optioneel)</label
					>
					<input
						id="opencode-remote-username"
						type="text"
						bind:value={remoteUsername}
						placeholder="opencode"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
				</div>
				<div>
					<label for="opencode-remote-password" class="mb-1 block text-sm font-medium"
						>Password (optioneel)</label
					>
					<input
						id="opencode-remote-password"
						type="password"
						bind:value={remotePassword}
						placeholder="••••••••"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
					/>
					<p class="mt-1 text-xs text-muted-foreground">
						Laat leeg om bestaand wachtwoord te behouden.
						{#if status?.hasPassword}
							<span class="text-primary">(reeds ingesteld)</span>
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}

	<div class="mb-4">
		<button
			type="button"
			onclick={saveSettings}
			disabled={saving || (mode === 'remote' && !canSaveRemote())}
			class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
		>
			{#if saving}
				Opslaan...
			{:else}
				Save Changes
			{/if}
		</button>
	</div>

	{#if status}
		<div class="border-t pt-4">
			<h4 class="mb-2 text-sm font-medium">Status</h4>
			<div class="flex flex-wrap items-center gap-2">
				{#if status.healthy && status.connected}
					<span
						class="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
					>
						<span class="mr-1 h-2 w-2 rounded-full bg-primary"></span>
						Connected
					</span>
				{:else if status.connected && !status.healthy}
					<span
						class="inline-flex items-center rounded-full border border-secondary bg-secondary/70 px-2 py-1 text-xs font-medium text-secondary-foreground"
					>
						<span class="mr-1 h-2 w-2 rounded-full bg-secondary-foreground"></span>
						Connected (niet healthy)
					</span>
				{:else}
					<span
						class="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
					>
						<span class="mr-1 h-2 w-2 rounded-full bg-destructive"></span>
						Not connected
					</span>
				{/if}

				<span class="text-xs text-muted-foreground">{status.mode}</span>
				{#if status.port !== null}
					<span class="text-xs text-muted-foreground">poort {status.port}</span>
				{/if}
				{#if status.version}
					<span class="text-xs text-muted-foreground">v{status.version}</span>
				{/if}
			</div>

			<p class="mt-2 text-xs text-muted-foreground">Endpoint: {status.baseUrl}</p>

			{#if status.lastConnected}
				<p class="mt-1 text-xs text-muted-foreground">
					Laatste verbinding: {new Date(status.lastConnected).toLocaleString()}
				</p>
			{/if}
		</div>
	{/if}
</div>
