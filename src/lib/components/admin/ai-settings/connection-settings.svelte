<script lang="ts" module>
	import { cn } from '$lib/utils';
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import {
		CheckCircle2,
		XCircle,
		Loader2,
		Settings2,
		Server,
		Globe,
		Lock,
		ArrowRight
	} from 'lucide-svelte';
	import {
		type ConnectionSettings,
		type ConnectionStatus,
		fetchConnectionStatus,
		saveConnectionSettings
	} from './connection-api';

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
		if (remoteBaseUrl.trim().length > 0) return true;
		if (remoteHost.trim().length === 0) return false;
		const parsedPort = Number(remotePort);
		return Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535;
	}

	async function loadStatus() {
		loading = true;
		error = null;
		try {
			status = await fetchConnectionStatus();
			applyStatusToForm(status);
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
			status = await saveConnectionSettings(buildSettingsPayload());
			applyStatusToForm(status);
			remotePassword = '';
			onConnectionChange(Boolean(status.connected && status.healthy));
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

<div class="space-y-6">
	<!-- Connection Status Banner -->
	{#if status}
		<div
			class={cn(
				'flex items-center gap-4 rounded-xl border p-4',
				status.healthy && status.connected
					? 'border-primary bg-muted'
					: 'border-destructive bg-muted'
			)}
		>
			<div
				class={cn(
					'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
					status.healthy && status.connected ? 'bg-muted' : 'bg-muted'
				)}
			>
				{#if status.healthy && status.connected}
					<CheckCircle2 class="h-6 w-6 text-primary" />
				{:else}
					<XCircle class="h-6 w-6 text-destructive" />
				{/if}
			</div>
			<div class="flex-1">
				<div class="flex items-center gap-2">
					<span class="font-semibold">
						{status.healthy && status.connected
							? 'Connected'
							: status.connected
								? 'Connected (Unhealthy)'
								: 'Disconnected'}
					</span>
					<Badge variant={status.healthy && status.connected ? 'default' : 'destructive'}>
						{status.healthy && status.connected
							? 'Healthy'
							: status.connected
								? 'Degraded'
								: 'Offline'}
					</Badge>
				</div>
				<p class="mt-1 text-sm text-muted-foreground">
					Endpoint: {status.baseUrl}
					{#if status.port}
						<span class="mx-1">·</span> Port: {status.port}
					{/if}
					{#if status.version}
						<span class="mx-1">·</span> v{status.version}
					{/if}
				</p>
			</div>
			<Button variant="outline" size="sm" onclick={refreshStatus} disabled={loading}>
				<Loader2 class={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
				Refresh
			</Button>
		</div>
	{/if}

	<!-- Error Display -->
	{#if error}
		<div class="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
			<p class="font-medium text-destructive">{error}</p>
		</div>
	{/if}

	<!-- Settings Form -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Settings2 class="h-5 w-5" />
				Connection Settings
			</CardTitle>
			<CardDescription>Configure how to connect to the OpenCode service</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			<!-- Mode Selection -->
			<div class="space-y-3">
				<label class="text-sm font-medium">Connection Mode</label>
				<div class="grid gap-3 sm:grid-cols-2">
					<button
						type="button"
						onclick={() => (mode = 'local')}
						class={cn(
							'flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50',
							mode === 'local' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
						)}
					>
						<div
							class={cn(
								'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
								mode === 'local' ? 'bg-primary/10' : 'bg-muted'
							)}
						>
							<Server
								class={cn('h-5 w-5', mode === 'local' ? 'text-primary' : 'text-muted-foreground')}
							/>
						</div>
						<div class="flex-1">
							<span class="block font-medium">Local</span>
							<span class="block text-sm text-muted-foreground">Embedded server</span>
						</div>
						{#if mode === 'local'}
							<CheckCircle2 class="h-5 w-5 text-primary" />
						{/if}
					</button>
					<button
						type="button"
						onclick={() => (mode = 'remote')}
						class={cn(
							'flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50',
							mode === 'remote' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
						)}
					>
						<div
							class={cn(
								'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
								mode === 'remote' ? 'bg-primary/10' : 'bg-muted'
							)}
						>
							<Globe
								class={cn('h-5 w-5', mode === 'remote' ? 'text-primary' : 'text-muted-foreground')}
							/>
						</div>
						<div class="flex-1">
							<span class="block font-medium">Remote</span>
							<span class="block text-sm text-muted-foreground">External server</span>
						</div>
						{#if mode === 'remote'}
							<CheckCircle2 class="h-5 w-5 text-primary" />
						{/if}
					</button>
				</div>
			</div>

			<!-- Local Mode Settings -->
			{#if mode === 'local'}
				<div class="space-y-4 rounded-lg border bg-muted/30 p-5">
					<div class="flex items-center gap-2">
						<Server class="h-4 w-4 text-primary" />
						<span class="font-medium">Local Mode Configuration</span>
					</div>
					<p class="text-sm text-muted-foreground">
						Local mode starts an embedded OpenCode server on a random free port.
					</p>
					<div class="grid gap-4 sm:grid-cols-3">
						<div class="space-y-2">
							<label for="opencode-local-hostname" class="text-sm font-medium">Hostname</label>
							<input
								id="opencode-local-hostname"
								type="text"
								bind:value={localHostname}
								class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div class="space-y-2">
							<label for="opencode-local-port-min" class="text-sm font-medium">Port Range Min</label
							>
							<input
								id="opencode-local-port-min"
								type="number"
								bind:value={localPortMin}
								min="10000"
								max="65535"
								class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div class="space-y-2">
							<label for="opencode-local-port-max" class="text-sm font-medium">Port Range Max</label
							>
							<input
								id="opencode-local-port-max"
								type="number"
								bind:value={localPortMax}
								min="10000"
								max="65535"
								class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					</div>
				</div>
			{/if}

			<!-- Remote Mode Settings -->
			{#if mode === 'remote'}
				<div class="space-y-4 rounded-lg border bg-muted/30 p-5">
					<div class="flex items-center gap-2">
						<Globe class="h-4 w-4 text-primary" />
						<span class="font-medium">Remote Mode Configuration</span>
					</div>
					<p class="text-sm text-muted-foreground">
						Connect to a remote OpenCode server using base URL or protocol + host + port.
					</p>

					<!-- Protocol + Host + Port -->
					<div class="grid gap-4 sm:grid-cols-3">
						<div class="space-y-2">
							<label for="opencode-remote-protocol" class="text-sm font-medium">Protocol</label>
							<select
								id="opencode-remote-protocol"
								bind:value={remoteProtocol}
								class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							>
								<option value="http">http</option>
								<option value="https">https</option>
							</select>
						</div>
						<div class="space-y-2">
							<label for="opencode-remote-host" class="text-sm font-medium">Host</label>
							<input
								id="opencode-remote-host"
								type="text"
								bind:value={remoteHost}
								placeholder="localhost or IP"
								class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div class="space-y-2">
							<label for="opencode-remote-port" class="text-sm font-medium">Port</label>
							<input
								id="opencode-remote-port"
								type="number"
								bind:value={remotePort}
								min="1"
								max="65535"
								placeholder="8080"
								class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					</div>

					<!-- Base Path + Base URL -->
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<label for="opencode-remote-base-path" class="text-sm font-medium">
								Base Path <span class="text-muted-foreground">(optional)</span>
							</label>
							<input
								id="opencode-remote-base-path"
								type="text"
								bind:value={remoteBasePath}
								placeholder="/opencode"
								class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<div class="space-y-2">
							<label for="opencode-remote-base-url" class="text-sm font-medium">
								Base URL Override <span class="text-muted-foreground">(optional)</span>
							</label>
							<input
								id="opencode-remote-base-url"
								type="url"
								bind:value={remoteBaseUrl}
								placeholder="https://api.example.com/opencode"
								class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					</div>

					<!-- Authentication -->
					<div class="space-y-3">
						<div class="flex items-center gap-2">
							<Lock class="h-4 w-4 text-muted-foreground" />
							<span class="text-sm font-medium"
								>Authentication <span class="text-muted-foreground">(optional)</span></span
							>
						</div>
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<label for="opencode-remote-username" class="text-sm font-medium">Username</label>
								<input
									id="opencode-remote-username"
									type="text"
									bind:value={remoteUsername}
									placeholder="opencode"
									class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
								/>
							</div>
							<div class="space-y-2">
								<label for="opencode-remote-password" class="text-sm font-medium">Password</label>
								<input
									id="opencode-remote-password"
									type="password"
									bind:value={remotePassword}
									placeholder="••••••••"
									class="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
								/>
								<p class="text-xs text-muted-foreground">
									Leave empty to keep existing password.
									{#if status?.hasPassword}
										<span class="font-medium text-primary">(already set)</span>
									{/if}
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Save Button -->
			<div class="flex items-center justify-end gap-3 pt-2">
				<Button
					onclick={saveSettings}
					disabled={saving || (mode === 'remote' && !canSaveRemote())}
					class="gap-2"
				>
					{#if saving}
						<Loader2 class="h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save Changes
						<ArrowRight class="h-4 w-4" />
					{/if}
				</Button>
			</div>

			<!-- Last Connected Info -->
			{#if status?.lastConnected}
				<div class="border-t pt-4">
					<p class="text-xs text-muted-foreground">
						Last connected: {new Date(status.lastConnected).toLocaleString()}
					</p>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
