<script lang="ts">
	import FunctionSettingsTable from '$lib/components/admin/function-settings/function-settings-table.svelte';
	import ConnectionStatus from '$lib/components/admin/ai-settings/connection-status.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import Icon from '@iconify/svelte';

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
			<Alert variant="destructive">
				<Icon icon="lucide:alert-triangle" class="h-4 w-4" />
				<AlertTitle>OpenCode niet verbonden</AlertTitle>
				<AlertDescription>
					Configureer eerst je OpenCode API key in de environment variables (<code
						>OPENCODE_BASE_URL</code
					>
					en <code>OPENCODE_API_KEY</code>) om de functie-instellingen te kunnen configureren.
				</AlertDescription>
			</Alert>
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
