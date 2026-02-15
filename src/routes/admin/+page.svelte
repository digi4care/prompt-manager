<script lang="ts">
	import SettingsPanel from '$lib/components/admin/settings-panel.svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
</script>

<svelte:head>
	<title>Admin Settings | Prompt Management</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight">Admin Settings</h1>
		<p class="mt-2 text-muted-foreground">
			Configure AI models, temperature, reasoning, and provider settings
		</p>
	</div>

	<SettingsPanel />
</div>
