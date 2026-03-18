<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { providers } from '$lib/stores/providers.svelte';
	import {
		Plug,
		Shield,
		Settings,
		Server,
		Sparkles,
		Users,
		FileCheck,
		RotateCcw,
		Save
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	
	// New Settings Schema Registry integration
	import { settingsRegistry, createSettingsStore } from './settings-schema';
	import { SettingsForm, SettingsBlock } from '$lib/components/settings';
	
	// Legacy components (gradual migration)
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import ProvidersBlock from '$lib/components/admin/ai-settings/providers-block.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import FunctionDefaultsList from '$lib/components/admin/function-settings/FunctionDefaultsList.svelte';
	import CouncilMembersList from '$lib/components/admin/function-settings/CouncilMembersList.svelte';

	// Page data
	let { data } = $props();

	// Feature flag for new settings system
	const useNewSettingsSystem = $page.url.searchParams.has('new');

	// Initialize settings store with registry
	const settingsStore = createSettingsStore({
		registry: settingsRegistry,
		initialValues: data.settings ?? {},
		async onSave(values) {
			const response = await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(values)
			});
			
			if (!response.ok) {
				throw new Error('Failed to save settings');
			}
			
			toast.success('Settings saved successfully');
			await invalidateAll();
		}
	});

	// Section configuration (legacy)
	type Section = 'connection' | 'providers' | 'policy' | 'defaults' | 'council' | 'review' | 'catalog' | 'presets';

	const sectionIcons: Record<Section, typeof Plug> = {
		connection: Plug,
		providers: Server,
		policy: Shield,
		defaults: Settings,
		council: Users,
		review: FileCheck,
		catalog: Sparkles,
		presets: Sparkles
	};

	// Active section tracking
	let activeSections = $state<Set<Section>>(new Set(['connection']));

	function toggleSection(section: Section) {
		const newSet = new Set(activeSections);
		if (newSet.has(section)) {
			newSet.delete(section);
		} else {
			newSet.add(section);
		}
		activeSections = newSet;
	}

	// Connection status
	let connectionStatus = $state<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

	// Legacy data binding
	let selectedProviders = $state<string[]>([]);
	let selectedModels = $state<string[]>([]);
	let policyConfig = $state({
		allowedModels: [] as string[],
		blockedModels: [] as string[],
		requireApproval: false
	});
</script>

<div class="container mx-auto py-8">
	<header class="mb-8">
		<h1 class="text-3xl font-bold">Settings</h1>
		<p class="text-muted-foreground mt-2">
			Configure AI providers, models, and application preferences
		</p>
		{#if useNewSettingsSystem}
			<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 mt-2">
				New Settings System
			</span>
		{/if}
	</header>

	{#if useNewSettingsSystem}
		<!-- New Settings Schema Registry UI -->
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
	{:else}
		<!-- Legacy Settings UI (gradual migration) -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Sidebar Navigation -->
			<nav class="lg:col-span-1 space-y-2">
				{#each Object.entries(sectionIcons) as [section, Icon]}
					{@const isActive = activeSections.has(section as Section)}
					<button
						type="button"
						class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
							{isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
						onclick={() => toggleSection(section as Section)}
					>
						<Icon class="w-5 h-5" />
						<span class="capitalize font-medium">{section}</span>
					</button>
				{/each}
			</nav>

			<!-- Main Content -->
			<div class="lg:col-span-2 space-y-8">
				<!-- Connection Section -->
				{#if activeSections.has('connection')}
					<section class="border rounded-lg p-6">
						<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
							<Plug class="w-5 h-5" />
							Connection
						</h2>
						<ConnectionSettings
							status={connectionStatus}
							onStatusChange={(status) => connectionStatus = status}
						/>
					</section>
				{/if}

				<!-- Providers Section -->
				{#if activeSections.has('providers')}
					<section class="border rounded-lg p-6">
						<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
							<Server class="w-5 h-5" />
							Providers
						</h2>
						<ProvidersBlock
							providers={$providers}
							selected={selectedProviders}
							onSelectionChange={(selected) => selectedProviders = selected}
						/>
					</section>
				{/if}

				<!-- Policy Section -->
				{#if activeSections.has('policy')}
					<section class="border rounded-lg p-6">
						<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
							<Shield class="w-5 h-5" />
							AI Policy
						</h2>
						<PolicyEditor
							allowedModels={policyConfig.allowedModels}
							blockedModels={policyConfig.blockedModels}
							requireApproval={policyConfig.requireApproval}
							onChange={(config) => policyConfig = { ...policyConfig, ...config }}
						/>
					</section>
				{/if}

				<!-- Defaults Section -->
				{#if activeSections.has('defaults')}
					<section class="border rounded-lg p-6">
						<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
							<Settings class="w-5 h-5" />
							Function Defaults
						</h2>
						<FunctionDefaultsList />
					</section>
				{/if}

				<!-- Council Section -->
				{#if activeSections.has('council')}
					<section class="border rounded-lg p-6">
						<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
							<Users class="w-5 h-5" />
							LLM Council
						</h2>
						<CouncilMembersList />
					</section>
				{/if}

				<!-- Catalog Section -->
				{#if activeSections.has('catalog')}
					<section class="border rounded-lg p-6">
						<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
							<Sparkles class="w-5 h-5" />
							Model Catalog
						</h2>
						<CatalogView
							models={selectedModels}
							onSelectionChange={(models) => selectedModels = models}
						/>
					</section>
				{/if}

				<!-- Presets Section -->
				{#if activeSections.has('presets')}
					<section class="border rounded-lg p-6">
						<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
							<Sparkles class="w-5 h-5" />
							Improve Presets
						</h2>
						<ImprovePresets />
					</section>
				{/if}
			</div>
		</div>
	{/if}
</div>
