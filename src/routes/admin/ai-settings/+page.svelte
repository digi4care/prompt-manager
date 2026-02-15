<script lang="ts">
	import FunctionSettingsTable from '$lib/components/admin/function-settings/function-settings-table.svelte';
	import ConnectionStatus from '$lib/components/admin/ai-settings/connection-status.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';

	let isConnected = $state(false);
</script>

<svelte:head>
	<title>AI Settings | Prompt Management</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight">AI Settings</h1>
		<p class="mt-2 text-muted-foreground">
			Configure OpenCode integration, model policy, and Improve presets
		</p>
	</div>

	<div class="space-y-6">
		<!-- Connection Status (FIRST - must be configured before other settings) -->
		<ConnectionStatus bind:isConnected />

		{#if !isConnected}
			<!-- Show warning when not connected -->
			<div
				class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
			>
				<div class="flex items-start gap-3">
					<span class="text-xl text-amber-600 dark:text-amber-400">⚠️</span>
					<div>
						<h3 class="font-semibold text-amber-800 dark:text-amber-200">
							OpenCode niet verbonden
						</h3>
						<p class="mt-1 text-sm text-amber-700 dark:text-amber-300">
							Configureer eerst je OpenCode API key in de environment variables (<code
								class="rounded bg-amber-100 px-1 dark:bg-amber-900">OPENCODE_BASE_URL</code
							>
							en <code class="rounded bg-amber-100 px-1 dark:bg-amber-900">OPENCODE_API_KEY</code>)
							om de functie-instellingen te kunnen configureren.
						</p>
					</div>
				</div>
			</div>
		{:else}
			<!-- Function Defaults - only shown when connected -->
			<FunctionSettingsTable />

			<!-- Model Catalog -->
			<CatalogView />

			<!-- AI Policy (will be superseded by FunctionSettingsTable) -->
			<PolicyEditor />

			<!-- Improve Presets -->
			<ImprovePresets />
		{/if}
	</div>
</div>
