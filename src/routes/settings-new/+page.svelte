<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Settings } from 'lucide-svelte';
	import { settingsRegistry, createSettingsStore } from './settings-schema';
	import { SettingsForm } from '$lib/components/settings';

	// Page data
	let { data } = $props();

	// Initialize settings store with registry
	const settingsStore = createSettingsStore({
		registry: settingsRegistry,
		initialValues: data.registrySettings ?? {},
		async onSave(values) {
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values)
			});
			
			if (!response.ok) {
				throw new Error('Failed to save settings');
			}
			
			await invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>Settings - New System</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="container mx-auto px-4 py-6 md:py-10">
		<!-- Header -->
		<div class="mb-6 flex items-center gap-4 md:mb-8">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md">
				<Settings class="size-6 text-primary-foreground" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Settings</h1>
				<p class="text-sm text-muted-foreground md:text-base">
					Configure your workspace preferences
				</p>
				<span class="mt-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
					New Settings System (Beta)
				</span>
			</div>
		</div>

		<!-- New Settings Form -->
		<div class="space-y-6">
			<SettingsForm
				registry={settingsRegistry}
				store={settingsStore}
				saveLabel="Save Settings"
				resetLabel="Reset Changes"
				showSaveButton={true}
				showResetButton={true}
				collapsible={true}
			/>
		</div>

		<!-- Back to legacy settings -->
		<div class="mt-8 border-t pt-6">
			<a href="/settings" class="text-sm text-muted-foreground hover:text-foreground">
				← Back to legacy settings
			</a>
		</div>
	</div>
</div>
