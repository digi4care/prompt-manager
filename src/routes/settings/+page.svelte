<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { providers } from '$lib/stores/providers.svelte';
	import {
		Plug,
		Shield,
		Settings,
		Database,
		Sparkles,
		ChevronDown,
		ChevronUp,
		Server,
		Users
	} from 'lucide-svelte';
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import ProvidersBlock from '$lib/components/admin/ai-settings/providers-block.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import FunctionSettingsCard from '$lib/components/admin/function-settings/FunctionSettingsCard.svelte';

	interface SelectedModel {
		id: string;
		name: string;
		provider: string;
		logo?: string;
	}

	type Section =
		| 'connection'
		| 'providers'
		| 'policy'
		| 'defaults'
		| 'council'
		| 'catalog'
		| 'presets';

	const sectionIcons = {
		connection: Plug,
		providers: Server,
		policy: Shield,
		defaults: Settings,
		council: Users,
		catalog: Database,
		presets: Sparkles
	} as const;

	const sections: Array<{
		id: Section;
		title: string;
		color: string;
		description: string;
	}> = [
		{
			id: 'connection',
			title: 'Connection',
			color: 'sapphire',
			description: 'API credentials & endpoints'
		},
		{
			id: 'providers',
			title: 'Providers',
			color: 'teal',
			description: 'Manage AI providers & API keys'
		},
		{
			id: 'policy',
			title: 'AI Policy',
			color: 'mauve',
			description: 'Model whitelist & scopes'
		},
		{
			id: 'defaults',
			title: 'Function Defaults',
			color: 'green',
			description: 'Default models & settings'
		},
		{
			id: 'council',
			title: 'LLM Council',
			color: 'blue',
			description: 'Multi-model council agents'
		},
		{
			id: 'catalog',
			title: 'Model Catalog',
			color: 'peach',
			description: 'Available models'
		},
		{
			id: 'presets',
			title: 'Improve Presets',
			color: 'pink',
			description: 'Prompt improvement rules'
		}
	];

	const STORAGE_KEY = 'admin-ai-settings:open-accordions';
	const validSections = new Set(sections.map((s) => s.id));

	// Track which accordions are open
	let openAccordions = $state<Set<Section>>(new Set(['connection']));
	let mounted = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as Section[];
				const valid = parsed.filter((s) => validSections.has(s));
				if (valid.length > 0) {
					openAccordions = new Set(valid);
				}
			}
		} catch {
			// ignore
		}
		mounted = true;
	});

	$effect(() => {
		if (!mounted || typeof window === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify([...openAccordions]));
		} catch {
			// ignore
		}
	});

	// Get data from server
	let data = $derived($page.data);

	// Local state for function defaults (for immediate UI updates)
	let functionDefaults = $state<{
		executor: { modelId: string; modelName: string; temperature: number; maxTokens: number };
		judge: { modelId: string; modelName: string; temperature: number; maxTokens: number };
		improve: { modelId: string; modelName: string; temperature: number; maxTokens: number };
	}>({
		executor: { modelId: '', modelName: '', temperature: 0.7, maxTokens: 4096 },
		judge: { modelId: '', modelName: '', temperature: 0.3, maxTokens: 2048 },
		improve: { modelId: '', modelName: '', temperature: 0.5, maxTokens: 4096 }
	});

	// Track if there are unsaved changes
	let isDirty = $state(false);
	let isSaving = $state(false);

	// Helper to resolve model name from model ID
	function resolveModelName(modelId: string | null): string {
		if (!modelId) return '';
		const model = data.models?.find((m) => m.id === modelId);
		return model?.name || modelId;
	}

	// Initialize function defaults from server data
	$effect(() => {
		if (data.settings?.executor) {
			functionDefaults.executor = {
				...data.settings.executor,
				modelName: resolveModelName(data.settings.executor.modelId)
			};
		}
		if (data.settings?.judge) {
			functionDefaults.judge = {
				...data.settings.judge,
				modelName: resolveModelName(data.settings.judge.modelId)
			};
		}
		if (data.settings?.improve) {
			functionDefaults.improve = {
				...data.settings.improve,
				modelName: resolveModelName(data.settings.improve.modelId)
			};
		}
	});

	// Handler for model selection (marks as dirty, doesn't save yet)
	function handleModelSelect(
		type: 'executor' | 'judge' | 'improve',
		model: { id: string; name: string; provider: string }
	) {
		// Update local state immediately
		functionDefaults[type] = {
			...functionDefaults[type],
			modelId: model.id,
			modelName: model.name
		};
		isDirty = true;
	}

	// Save all function defaults to server
	async function saveFunctionDefaults() {
		if (isSaving) return;
		isSaving = true;

		try {
			const types = ['executor', 'judge', 'improve'] as const;
			for (const type of types) {
				const response = await fetch(`/api/admin/function-defaults/${type}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						modelId: functionDefaults[type].modelId,
						modelName: functionDefaults[type].modelName,
						temperature: functionDefaults[type].temperature,
						maxTokens: functionDefaults[type].maxTokens
					})
				});

				if (!response.ok) {
					console.error(`Failed to save ${type} settings`);
				}
			}
			isDirty = false;
		} catch (error) {
			console.error('Error saving function defaults:', error);
		} finally {
			isSaving = false;
		}
	}

	// Council CRUD functions
	async function addCouncilMember() {
		try {
			const response = await fetch('/api/admin/council-agents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parentType: 'function_defaults',
					parentId: 1,
					modelId: null,
					temperature: 0.5,
					maxTokens: 8192,
					promptLinkId: null
				})
			});
			if (!response.ok) throw new Error('Failed to add council member');
			await invalidateAll();
		} catch (error) {
			console.error('Error adding council member:', error);
		}
	}

	async function deleteCouncilMember(id: number) {
		try {
			const response = await fetch(`/api/admin/council-agents/${id}`, {
				method: 'DELETE'
			});
			if (!response.ok) throw new Error('Failed to delete council member');
			await invalidateAll();
		} catch (error) {
			console.error('Error deleting council member:', error);
		}
	}

	async function updateCouncilPrompt(agentId: number, promptId: number | null) {
		try {
			const response = await fetch(`/api/admin/council-agents/${agentId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ promptLinkId: promptId })
			});
			if (!response.ok) throw new Error('Failed to update council prompt');
			await invalidateAll();
		} catch (error) {
			console.error('Error updating council prompt:', error);
		}
	}

	// Providers store - handles all provider state
	// Initialize store with server data
	$effect(() => {
		if (data.allProviders && data.connectedProviderIds) {
			providers.init({
				all: data.allProviders,
				connected: data.connectedProviderIds
			});
		}
	});

	function toggleAccordion(sectionId: Section) {
		const newSet = new Set(openAccordions);
		if (newSet.has(sectionId)) {
			newSet.delete(sectionId);
		} else {
			newSet.add(sectionId);
		}
		openAccordions = newSet;
	}

	// Map colors to actual Tailwind classes (Tailwind can't compile dynamic classes)
	const leftBorderClasses: Record<string, string> = {
		sapphire: 'border-l-primary',
		mauve: 'border-l-primary',
		green: 'border-l-primary',
		peach: 'border-l-primary',
		pink: 'border-l-primary'
	};

	const bgClasses: Record<string, string> = {
		sapphire: 'bg-secondary',
		mauve: 'bg-secondary',
		green: 'bg-secondary',
		peach: 'bg-secondary',
		pink: 'bg-secondary'
	};

	const textClasses: Record<string, string> = {
		sapphire: 'text-primary',
		mauve: 'text-primary',
		green: 'text-primary',
		peach: 'text-primary',
		pink: 'text-primary'
	};

	function getColorClasses(color: string): {
		leftBorder: string;
		bg: string;
		text: string;
	} {
		return {
			leftBorder: leftBorderClasses[color] || 'border-l-primary',
			bg: bgClasses[color] || 'bg-secondary',
			text: textClasses[color] || 'text-primary'
		};
	}
</script>

<svelte:head>
	<title>Settings - Admin</title>
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
			</div>
		</div>

		<!-- Accordion Layout -->
		<div class="mx-auto max-w-4xl space-y-3">
			{#each sections as section (section.id)}
				{@const isOpen = openAccordions.has(section.id)}
				{@const colors = getColorClasses(section.color)}
				<div
					class="overflow-hidden rounded-xl bg-card shadow-md transition-all duration-200 {isOpen
						? 'shadow-lg'
						: ''}"
				>
					<!-- Accordion Header with colored left border -->
					<button
						type="button"
						class="group flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-colors hover:bg-muted md:p-5 {isOpen
							? 'rounded-tl-xl rounded-tr-xl'
							: 'rounded-xl'}"
						onclick={() => toggleAccordion(section.id)}
					>
						<div
							class="{colors.bg} flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105"
						>
							<svelte:component this={sectionIcons[section.id]} class="size-5 {colors.text}" />
						</div>
						<div class="min-w-0 flex-1">
							<span class="font-semibold">{section.title}</span>
							<p class="truncate text-sm text-muted-foreground">{section.description}</p>
						</div>
						{#if isOpen}
							<ChevronUp class="size-5 shrink-0 text-muted-foreground" />
						{:else}
							<ChevronDown class="size-5 shrink-0 text-muted-foreground" />
						{/if}
					</button>

					<!-- Accordion Content -->
					{#if isOpen}
						<div class="border-t border-border p-4 md:p-5">
							{#if section.id === 'connection'}
								<ConnectionSettings />
							{:else if section.id === 'providers'}
								{#if providers.isConnected}
									<ProvidersBlock />
								{:else}
									<div class="rounded-lg bg-muted/30 p-4 text-center text-sm text-muted-foreground">
										Please establish a connection first to manage providers.
									</div>
								{/if}
							{:else if section.id === 'policy'}
								<PolicyEditor />
							{:else if section.id === 'defaults'}
								<div class="space-y-6">
									<FunctionSettingsCard
										type="executor"
										label="Executor"
										description="Runs prompt content"
										modelId={functionDefaults.executor.modelId}
										modelName={functionDefaults.executor.modelName}
										modelProvider={data.settings?.executor?.modelProvider}
										modelLogo={data.settings?.executor?.modelLogo}
										temperature={functionDefaults.executor.temperature}
										maxTokens={functionDefaults.executor.maxTokens}
										promptTemplate={data.settings?.executor?.promptTemplate}
										prompts={data.prompts}
										models={data.models}
										allowedModels={data.allowedModels}
										onselect={(model) => handleModelSelect('executor', model)}
									/>

									<FunctionSettingsCard
										type="judge"
										label="Judge"
										description="Evaluates responses"
										modelId={functionDefaults.judge.modelId}
										modelName={functionDefaults.judge.modelName}
										modelProvider={data.settings?.judge?.modelProvider}
										modelLogo={data.settings?.judge?.modelLogo}
										temperature={functionDefaults.judge.temperature}
										maxTokens={functionDefaults.judge.maxTokens}
										promptTemplate={data.settings?.judge?.promptTemplate}
										prompts={data.prompts}
										models={data.models}
										allowedModels={data.allowedModels}
										onselect={(model) => handleModelSelect('judge', model)}
									/>

									{#if data.settings?.improve}
										<FunctionSettingsCard
											type="improve"
											label="Improve"
											description="Improves prompts"
											modelId={functionDefaults.improve.modelId}
											modelName={functionDefaults.improve.modelName}
											modelProvider={data.settings?.improve?.modelProvider}
											modelLogo={data.settings?.improve?.modelLogo}
											temperature={functionDefaults.improve.temperature}
											maxTokens={functionDefaults.improve.maxTokens}
											promptTemplate={data.settings?.improve?.promptTemplate}
											prompts={data.prompts}
											models={data.models}
											allowedModels={data.allowedModels}
											onselect={(model) => handleModelSelect('improve', model)}
										/>
									{/if}

									<!-- Save Button -->
									{#if isDirty}
										<div
											class="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-700"
										>
											<button
												type="button"
												class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
												onclick={saveFunctionDefaults}
												disabled={isSaving}
											>
												{isSaving ? 'Saving...' : 'Save Changes'}
											</button>
										</div>
									{/if}
								</div>
							{:else if section.id === 'council'}
								<div class="space-y-4">
									{#if data.councilAgents && data.councilAgents.length > 0}
										{#each data.councilAgents as agent, i}
											<FunctionSettingsCard
												type="council"
												label="Agent {i + 1}"
												description="Council member"
												modelId={agent.modelId}
												modelName={agent.modelName}
												modelProvider={agent.modelProvider}
												modelLogo={agent.modelLogo}
												temperature={agent.temperature}
												maxTokens={agent.maxTokens}
												prompts={data.prompts}
												models={data.models}
												allowedModels={data.allowedModels}
											/>
										{/each}
									{:else}
										<p class="text-sm text-gray-500">No council agents configured</p>
									{/if}
								</div>
							{:else if section.id === 'catalog'}
								<CatalogView />
							{:else if section.id === 'presets'}
								<ImprovePresets />
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
