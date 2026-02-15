<script lang="ts">
	import ConnectionStatus from '$lib/components/admin/ai-settings/connection-status.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
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
		<!-- Connection Status -->
		<ConnectionStatus />

		<!-- Model Catalog -->
		<CatalogView />

		<!-- AI Policy -->
		<PolicyEditor />

		<!-- Improve Presets -->
		<ImprovePresets />
	</div>
</div>
