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
		Server,
		Users,
		ChevronUp,
		ChevronDown,
		Plus,
		Tags,
		FileCheck
	} from 'lucide-svelte';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import ProvidersBlock from '$lib/components/admin/ai-settings/providers-block.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import FunctionDefaultsList from '$lib/components/admin/function-settings/FunctionDefaultsList.svelte';
	import CouncilMembersList from '$lib/components/admin/function-settings/CouncilMembersList.svelte';

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
		| 'review'
		| 'catalog'
		| 'presets'
		| 'snippets';

	const sectionIcons = {
		connection: Plug,
		providers: Server,
		policy: Shield,
		defaults: Settings,
		council: Users,
		review: FileCheck,
		catalog: Database,
		presets: Sparkles,
		snippets: Tags
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
			id: 'review',
			title: 'LLM Review',
			color: 'purple',
			description: 'Multi-model review agents'
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
		},
		{
			id: 'snippets',
			title: 'Snippet Taxonomy',
			color: 'yellow',
			description: 'Categories & tags for snippets'
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
		executor: {
			modelId: string;
			modelName: string;
			modelProvider: string;
			temperature: number;
			maxTokens: number;
			promptLinkId: number | null;
			thinkingLevel: string | null;
			modelVariant: string | null;
		};
		judge: {
			modelId: string;
			modelName: string;
			modelProvider: string;
			temperature: number;
			maxTokens: number;
			promptLinkId: number | null;
			thinkingLevel: string | null;
			modelVariant: string | null;
		};
		improve: {
			modelId: string;
			modelName: string;
			modelProvider: string;
			temperature: number;
			maxTokens: number;
			promptLinkId: number | null;
			thinkingLevel: string | null;
			modelVariant: string | null;
		};
	}>({
		executor: {
			modelId: '',
			modelName: '',
			modelProvider: '',
			temperature: 0.7,
			maxTokens: 4096,
			promptLinkId: null,
			thinkingLevel: null,
			modelVariant: null
		},
		judge: {
			modelId: '',
			modelName: '',
			modelProvider: '',
			temperature: 0.3,
			maxTokens: 2048,
			promptLinkId: null,
			thinkingLevel: null,
			modelVariant: null
		},
		improve: {
			modelId: '',
			modelName: '',
			modelProvider: '',
			temperature: 0.5,
			maxTokens: 4096,
			promptLinkId: null,
			thinkingLevel: null,
			modelVariant: null
		}
	});

	// Track if there are unsaved changes
	let isDirty = $state(false);
	let isSaving = $state(false);

	// Helper to resolve model name from model ID
	function resolveModelName(modelId: string | null): string {
		if (!modelId) return '';
		const model = data.models?.find((m: { id: string; name: string }) => m.id === modelId);
		return model?.name || modelId;
	}

	// Initialize function defaults from server data
	$effect(() => {
		if (data.settings?.executor) {
			const exec = data.settings.executor as Record<string, unknown>;
			functionDefaults.executor = {
				...(exec as any),
				modelName: resolveModelName(exec.modelId as string),
				modelProvider: (exec.providerId || exec.modelProvider || '') as string,
				promptLinkId: (exec.promptId ?? null) as number | null
			};
		}
		if (data.settings?.judge) {
			const judge = data.settings.judge as Record<string, unknown>;
			functionDefaults.judge = {
				...(judge as any),
				modelName: resolveModelName(judge.modelId as string),
				modelProvider: (judge.providerId || judge.modelProvider || '') as string,
				promptLinkId: (judge.promptId ?? null) as number | null
			};
		}
		if (data.settings?.improve) {
			const improve = data.settings.improve as Record<string, unknown>;
			functionDefaults.improve = {
				...(improve as any),
				modelName: resolveModelName(improve.modelId as string),
				modelProvider: (improve.providerId || improve.modelProvider || '') as string,
				promptLinkId: (improve.promptId ?? null) as number | null
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
			modelName: model.name,
			modelProvider: model.provider
		};
		isDirty = true;
	}

	// Handle prompt template selection for function defaults
	async function handleFunctionPromptChange(
		type: 'executor' | 'judge' | 'improve',
		promptId: number | null
	) {
		functionDefaults[type].promptLinkId = promptId;
		isDirty = true;
	}

	// Handle variant change for function defaults
	function handleVariantChange(type: 'executor' | 'judge' | 'improve', variant: string | null) {
		functionDefaults[type].modelVariant = variant;
		isDirty = true;
	}

	// Handle settings change (temperature, maxTokens, thinkingLevel) for function defaults
	function updateFunctionSettings(
		type: 'executor' | 'judge' | 'improve',
		settings: {
			temperature?: number | null;
			maxTokens?: number | null;
			thinkingLevel?: string | null;
		}
	) {
		if (settings.temperature !== undefined) {
			functionDefaults[type].temperature = settings.temperature ?? 0.5;
		}
		if (settings.maxTokens !== undefined) {
			functionDefaults[type].maxTokens = settings.maxTokens ?? 8192;
		}
		if (settings.thinkingLevel !== undefined) {
			functionDefaults[type].thinkingLevel = settings.thinkingLevel;
		}
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
						modelProvider: functionDefaults[type].modelProvider,
						temperature: functionDefaults[type].temperature,
						maxTokens: functionDefaults[type].maxTokens,
						promptId: functionDefaults[type].promptLinkId
					})
				});

				if (!response.ok) {
					console.error(`Failed to save ${type} settings`);
				}
			}
			await invalidateAll();
		} catch (error) {
			console.error('Error saving function defaults:', error);
		} finally {
			isSaving = false;
			isDirty = false;
		}
	}

	// Council CRUD functions
	async function addCouncilMember() {
		try {
			// Use first whitelisted model as default (guaranteed to exist in catalog)
			const defaultModelId = data.whitelistModels?.[0] || 'zai-coding-plan/glm-4.7';
			const response = await fetch('/api/admin/council-agents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parentType: 'function_defaults',
					parentId: 0,
					modelId: defaultModelId,
					temperature: 0.5,
					maxTokens: 8192,
					promptLinkId: null
				})
			});
			if (!response.ok) {
				if (response.status === 302 || response.status === 401) {
					throw new Error('Je moet ingelogd zijn om dit te doen');
				}
				const err = await response.json();
				throw new Error(err.message || 'Failed to add council member');
			}
			await invalidateAll();
		} catch (error) {
			console.error('Error adding council member:', error);
			alert(error instanceof Error ? error.message : 'Failed to add council member');
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
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ promptLinkId: promptId })
			});
			if (!response.ok) throw new Error('Failed to update council prompt');
			await invalidateAll();
		} catch (error) {
			console.error('Error updating council prompt:', error);
		}
	}

	// Update council member model
	async function updateCouncilModel(
		agentId: number,
		model: { id: string; name: string; provider: string; logo?: string }
	) {
		if (!model?.id) return;

		try {
			const response = await fetch(`/api/admin/council-agents/${agentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					modelId: model.id,
					modelName: model.name,
					modelProvider: model.provider,
					modelLogo: model.logo
				})
			});

			if (!response.ok) throw new Error('Failed to update');

			invalidateAll();
		} catch (error) {
			console.error('Error updating council model:', error);
		}
	}

	// Update agent settings (temperature, maxTokens, thinkingLevel)
	async function updateAgentSettings(
		agentId: number,
		settings: {
			temperature?: number | null;
			maxTokens?: number | null;
			thinkingLevel?: string | null;
		}
	) {
		try {
			const response = await fetch(`/api/admin/council-agents/${agentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings)
			});

			if (!response.ok) throw new Error('Failed to update settings');

			invalidateAll();
		} catch (error) {
			console.error('Error updating agent settings:', error);
		}
	}

	// Review CRUD functions
	async function addReviewMember() {
		try {
			// Use a safe default model ID with provider prefix
			const defaultModelId = 'zai-coding-plan/glm-5';
			const response = await fetch('/api/admin/council-agents', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parentType: 'review_defaults',
					parentId: 0,
					modelId: defaultModelId,
					temperature: 0.5,
					maxTokens: 8192,
					promptLinkId: null
				})
			});
			if (!response.ok) {
				if (response.status === 302 || response.status === 401) {
					throw new Error('Je moet ingelogd zijn om dit te doen');
				}
				const err = await response.json();
				throw new Error(err.message || 'Failed to add review member');
			}
			await invalidateAll();
		} catch (error) {
			console.error('Error adding review member:', error);
			alert(error instanceof Error ? error.message : 'Failed to add review member');
		}
	}

	async function deleteReviewMember(id: number) {
		try {
			const response = await fetch(`/api/admin/council-agents/${id}`, {
				method: 'DELETE'
			});
			if (!response.ok) throw new Error('Failed to delete review member');
			await invalidateAll();
		} catch (error) {
			console.error('Error deleting review member:', error);
		}
	}

	async function updateReviewPrompt(agentId: number, promptId: number | null) {
		try {
			const response = await fetch(`/api/admin/council-agents/${agentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ promptLinkId: promptId })
			});
			if (!response.ok) throw new Error('Failed to update review prompt');
			await invalidateAll();
		} catch (error) {
			console.error('Error updating review prompt:', error);
		}
	}

	async function updateReviewModel(
		agentId: number,
		model: { id: string; name: string; provider: string; logo?: string }
	) {
		if (!model?.id) return;

		try {
			const response = await fetch(`/api/admin/council-agents/${agentId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					modelId: model.id,
					modelName: model.name,
					modelProvider: model.provider,
					modelLogo: model.logo
				})
			});

			if (!response.ok) throw new Error('Failed to update');

			invalidateAll();
		} catch (error) {
			console.error('Error updating review model:', error);
		}
	}

	// Navigate to prompts page
	function goToPrompts() {
		window.location.href = '/prompts';
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

	// Remove old toggle function - using shadcn-svelte Accordion instead
	// Map colors to actual Tailwind classes - distinct colors per section
	const leftBorderClasses: Record<string, string> = {
		sapphire: 'border-l-blue-500 dark:border-l-blue-400',
		mauve: 'border-l-violet-500 dark:border-l-violet-400',
		green: 'border-l-emerald-500 dark:border-l-emerald-400',
		peach: 'border-l-orange-400 dark:border-l-orange-300',
		pink: 'border-l-pink-500 dark:border-l-pink-400',
		teal: 'border-l-teal-500 dark:border-l-teal-400',
		blue: 'border-l-blue-500 dark:border-l-blue-400',
		yellow: 'border-l-yellow-500 dark:border-l-yellow-400'
	};

	const bgClasses: Record<string, string> = {
		sapphire: 'bg-blue-50 dark:bg-blue-950/30',
		mauve: 'bg-violet-50 dark:bg-violet-950/30',
		green: 'bg-emerald-50 dark:bg-emerald-950/30',
		peach: 'bg-orange-50 dark:bg-orange-950/30',
		pink: 'bg-pink-50 dark:bg-pink-950/30',
		teal: 'bg-teal-50 dark:bg-teal-950/30',
		blue: 'bg-blue-50 dark:bg-blue-950/30',
		yellow: 'bg-yellow-50 dark:bg-yellow-950/30'
	};

	const textClasses: Record<string, string> = {
		sapphire: 'text-blue-600 dark:text-blue-400',
		mauve: 'text-violet-600 dark:text-violet-400',
		green: 'text-emerald-600 dark:text-emerald-400',
		peach: 'text-orange-600 dark:text-orange-400',
		pink: 'text-pink-600 dark:text-pink-400',
		teal: 'text-teal-600 dark:text-teal-400',
		blue: 'text-blue-600 dark:text-blue-400',
		yellow: 'text-yellow-600 dark:text-yellow-400'
	};

	const iconBgClasses: Record<string, string> = {
		sapphire: 'bg-blue-100 dark:bg-blue-900/50',
		mauve: 'bg-violet-100 dark:bg-violet-900/50',
		green: 'bg-emerald-100 dark:bg-emerald-900/50',
		peach: 'bg-orange-100 dark:bg-orange-900/50',
		pink: 'bg-pink-100 dark:bg-pink-900/50',
		teal: 'bg-teal-100 dark:bg-teal-900/50',
		blue: 'bg-blue-100 dark:bg-blue-900/50',
		yellow: 'bg-yellow-100 dark:bg-yellow-900/50'
	};

	function getColorClasses(color: string): {
		leftBorder: string;
		bg: string;
		text: string;
		iconBg: string;
	} {
		return {
			leftBorder: leftBorderClasses[color] || 'border-l-primary',
			bg: bgClasses[color] || 'bg-secondary',
			text: textClasses[color] || 'text-primary',
			iconBg: iconBgClasses[color] || 'bg-secondary'
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
							<PolicyEditor models={data.models} />
							{:else if section.id === 'defaults'}
								<FunctionDefaultsList
									executor={functionDefaults.executor}
									judge={functionDefaults.judge}
									improve={data.settings?.improve ? functionDefaults.improve : null}
									prompts={data.prompts}
									models={data.models}
									allowedModels={data.allowedModels}
									onModelSelect={handleModelSelect}
									onPromptChange={handleFunctionPromptChange}
									onVariantChange={handleVariantChange}
									onSettingsChange={updateFunctionSettings}
									onSave={saveFunctionDefaults}
									{isSaving}
									{isDirty}
								/>
							{:else if section.id === 'council'}
								<CouncilMembersList
									agents={data.councilAgents ?? []}
									prompts={data.prompts}
									models={data.models}
									allowedModels={data.allowedModels}
									onModelChange={updateCouncilModel}
									onDelete={deleteCouncilMember}
									onAdd={addCouncilMember}
									onPromptChange={updateCouncilPrompt}
									onSettingsChange={updateAgentSettings}
								/>
							{:else if section.id === 'review'}
								<CouncilMembersList
									agents={data.reviewAgents ?? []}
									prompts={data.prompts}
									models={data.models}
									allowedModels={data.allowedModels}
									onModelChange={updateReviewModel}
									onDelete={deleteReviewMember}
									onAdd={addReviewMember}
									onPromptChange={updateReviewPrompt}
									parentType="review_defaults"
									onSettingsChange={updateAgentSettings}
								/>
							{:else if section.id === 'catalog'}
								<CatalogView allowedModels={data.allowedModels} />
							{:else if section.id === 'presets'}
								<ImprovePresets />
							{:else if section.id === 'snippets'}
								<div class="space-y-4">
									<p class="text-sm text-muted-foreground">
										Manage categories and tags that users can select when creating snippets. Only
										admin-defined options are available to ensure consistency.
									</p>
									<Button onclick={() => (window.location.href = '/admin/snippets')}>
										Manage Snippet Categories & Tags
									</Button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
