<script lang="ts">
	import { onMount } from 'svelte';
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import FunctionSettingsTable from '$lib/components/admin/function-settings/function-settings-table.svelte';

	type AccordionSection = 'connection' | 'policy' | 'defaults' | 'catalog' | 'presets';

	const sections: Array<{ id: AccordionSection; title: string; tag: string }> = [
		{ id: 'connection', title: 'Connection', tag: 'OC' },
		{ id: 'policy', title: 'AI Policy', tag: 'AP' },
		{ id: 'defaults', title: 'Function Defaults', tag: 'FD' },
		{ id: 'catalog', title: 'Model Catalog', tag: 'MC' },
		{ id: 'presets', title: 'Improve Presets', tag: 'IP' }
	];

	const ACCORDION_STORAGE_KEY = 'admin-ai-settings:active-section';
	const validSectionIds = new Set<AccordionSection>(sections.map((section) => section.id));

	let activeSection = $state<AccordionSection>('connection');
	let hasLoadedStoredSection = $state(false);

	onMount(() => {
		try {
			const stored = window.localStorage.getItem(ACCORDION_STORAGE_KEY);
			if (stored && validSectionIds.has(stored as AccordionSection)) {
				activeSection = stored as AccordionSection;
			}
		} catch (error) {
			console.error('Failed to load accordion section from localStorage:', error);
		} finally {
			hasLoadedStoredSection = true;
		}
	});

	$effect(() => {
		if (!hasLoadedStoredSection || typeof window === 'undefined') {
			return;
		}

		try {
			window.localStorage.setItem(ACCORDION_STORAGE_KEY, activeSection);
		} catch (error) {
			console.error('Failed to save accordion section to localStorage:', error);
		}
	});

	function openSection(section: AccordionSection): void {
		activeSection = section;
	}
</script>

<svelte:head>
	<title>Settings - Admin</title>
</svelte:head>

<div class="container mx-auto space-y-6 px-4 py-8">
	<div>
		<h1 class="text-2xl font-bold">Settings</h1>
		<p class="text-muted-foreground">Configureer OpenCode verbinding en functie-defaults</p>
	</div>

	<div class="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
		<div class="overflow-hidden rounded-lg border bg-card">
			{#each sections as section, index}
				<button
					type="button"
					id={`ai-settings-trigger-${section.id}`}
					aria-controls={`ai-settings-panel-${section.id}`}
					aria-expanded={activeSection === section.id}
					class="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-muted/50 {activeSection ===
					section.id
						? 'bg-muted text-foreground'
						: 'text-muted-foreground'} {index > 0 ? 'border-t' : ''}"
					onclick={() => openSection(section.id)}
				>
					<span class="flex items-center gap-2">
						<span
							class="inline-flex h-6 min-w-6 items-center justify-center rounded border px-1.5 text-[10px] leading-none font-bold {activeSection ===
							section.id
								? 'border-primary text-foreground'
								: 'border-border text-muted-foreground'}"
						>
							{section.tag}
						</span>
						<span>{section.title}</span>
					</span>
					<span class="text-xs">{activeSection === section.id ? 'v' : '>'}</span>
				</button>
			{/each}
		</div>

		<div
			id={`ai-settings-panel-${activeSection}`}
			role="region"
			aria-labelledby={`ai-settings-trigger-${activeSection}`}
			class="min-w-0"
		>
			{#if activeSection === 'connection'}
				<ConnectionSettings />
			{:else if activeSection === 'policy'}
				<PolicyEditor />
			{:else if activeSection === 'defaults'}
				<div class="space-y-3">
					<div>
						<h2 class="text-base font-semibold">Function Defaults</h2>
						<p class="text-sm text-muted-foreground">
							Configure default model, temperature, and token limits for each function type.
						</p>
					</div>
					<FunctionSettingsTable />
				</div>
			{:else if activeSection === 'catalog'}
				<CatalogView />
			{:else}
				<ImprovePresets />
			{/if}
		</div>
	</div>
</div>
