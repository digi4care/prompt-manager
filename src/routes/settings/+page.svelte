<script lang="ts">
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import FunctionSettingsTable from '$lib/components/admin/function-settings/function-settings-table.svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
</script>

<svelte:head>
	<title>Settings - Admin</title>
</svelte:head>

<div class="container mx-auto space-y-6 px-4 py-8">
	<div>
		<h1 class="text-2xl font-bold">Settings</h1>
		<p class="text-muted-foreground">Configureer OpenCode verbinding en functie-defaults</p>
	</div>

	<ConnectionSettings />

	<div class="space-y-6">
		<Card>
			<CardHeader>
				<CardTitle>Function Defaults</CardTitle>
				<CardDescription>
					Configure default model, temperature, and token limits for each function type.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FunctionSettingsTable />
			</CardContent>
		</Card>

		<CatalogView />
		<PolicyEditor />
		<ImprovePresets />
	</div>
</div>
