<script lang="ts">
	import { onMount } from 'svelte';
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import FunctionSettingsTable from '$lib/components/admin/function-settings/function-settings-table.svelte';

	let isConnected = $state(false);

	function handleConnectionChange(connected: boolean) {
		isConnected = connected;
	}

	onMount(() => {
		// Check initial connection status
		fetch('/api/admin/opencode-connection')
			.then((res) => res.json())
			.then((data) => {
				isConnected = data.data?.connected && data.data?.healthy;
			})
			.catch(() => {
				isConnected = false;
			});
	});
</script>

<svelte:head>
	<title>AI Instellingen - Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">AI Instellingen</h1>
		<p class="text-muted-foreground">Configureer OpenCode verbinding en functie-defaults</p>
	</div>

	<!-- Connection Settings (always visible) -->
	<ConnectionSettings onConnectionChange={handleConnectionChange} />

	<!-- Function Settings (only when connected) -->
	{#if isConnected}
		<FunctionSettingsTable />
	{:else}
		<div
			class="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30"
		>
			<div class="flex">
				<div class="flex-shrink-0">
					<svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">
						Eerst verbinden met OpenCode
					</h3>
					<div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
						<p>Verbind met de OpenCode server om de functie-instellingen te configureren.</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
