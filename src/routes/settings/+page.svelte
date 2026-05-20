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
		Tags,
		FileCheck
	} from 'lucide-svelte';
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import ProvidersBlock from '$lib/components/admin/ai-settings/providers-block.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import FunctionDefaultsList from '$lib/components/admin/function-settings/FunctionDefaultsList.svelte';
	import CouncilMembersList from '$lib/components/admin/function-settings/CouncilMembersList.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getColorClasses } from './settings-colors';
	import {
		addCouncilMember,
		deleteCouncilMember,
		updateCouncilPrompt,
		updateCouncilModel,
		addReviewMember,
		deleteReviewMember,
		updateReviewPrompt,
		updateReviewModel,
		updateAgentSettings,
		type AgentModel
	} from './settings-agent-crud';

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
		{ id: 'connection', title: 'Connection', color: 'sapphire', description: 'API credentials & endpoints' },
		{ id: 'providers', title: 'Providers', color: 'teal', description: 'Manage AI providers & API keys' },
		{ id: 'policy', title: 'AI Policy', color: 'mauve', description: 'Model whitelist & scopes' },
		{ id: 'defaults', title: 'Function Defaults', color: 'green', description: 'Default models & settings' },
		{ id: 'council', title: 'LLM Council', color: 'blue', description: 'Multi-model council agents' },
		{ id: 'review', title: 'LLM Review', color: 'purple', description: 'Multi-model review agents' },
		{ id: 'catalog', title: 'Model Catalog', color: 'peach', description: 'Available models' },
		{ id: 'presets', title: 'Improve Presets', color: 'pink', description: 'Prompt improvement rules' },
		{ id: 'snippets', title: 'Snippet Taxonomy', color: 'yellow', description: 'Categories & tags for snippets' }
	];

	const STORAGE_KEY = 'admin-ai-settings:open-accordions';
	const validSections = new Set(sections.map((s) => s.id));

	// Accordion state
	let openAccordions = $state<Set<Section>>(new Set(['connection']));
	let mounted = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as Section[];
				const valid = parsed.filter((s) => validSections.has(s));
				if (valid.length > 0) openAccordions = new Set(valid);
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

	// Server data
	let data = $derived($page.data);

	// Function defaults state
	type FunctionDefaults = {
		modelId: string;
		modelName: string;
		modelProvider: string;
		temperature: number;
		maxTokens: number;
		promptLinkId: number | null;
		thinkingLevel: string | null;
		modelVariant: string | null;
	};

	let functionDefaults = $state<Record<'executor' | 'judge' | 'improve', FunctionDefaults>>({
		executor: { modelId: '', modelName: '', modelProvider: '', temperature: 0.7, maxTokens: 4096, promptLinkId: null, thinkingLevel: null, modelVariant: null },
		judge: { modelId: '', modelName: '', modelProvider: '', temperature: 0.3, maxTokens: 2048, promptLinkId: null, thinkingLevel: null, modelVariant: null },
		improve: { modelId: '', modelName: '', modelProvider: '', temperature: 0.5, maxTokens: 4096, promptLinkId: null, thinkingLevel: null, modelVariant: null }
	});

	let isDirty = $state(false);
	let isSaving = $state(false);

	function resolveModelName(modelId: string | null): string {
		if (!modelId) return '';
		const model = data.models?.find((m: { id: string; name: string }) => m.id === modelId);
		return model?.name || modelId;
	}

	$effect(() => {
		for (const type of ['executor', 'judge', 'improve'] as const) {
			const raw = data.settings?.[type] as Record<string, unknown> | undefined;
			if (raw) {
				functionDefaults[type] = {
					...(raw as any),
					modelName: resolveModelName(raw.modelId as string),
					modelProvider: (raw.providerId || raw.modelProvider || '') as string,
					promptLinkId: (raw.promptId ?? null) as number | null
				};
			}
		}
	});

	function handleModelSelect(type: 'executor' | 'judge' | 'improve', model: AgentModel) {
		functionDefaults[type] = { ...functionDefaults[type], modelId: model.id, modelName: model.name, modelProvider: model.provider };
		isDirty = true;
	}

	function handleFunctionPromptChange(type: 'executor' | 'judge' | 'improve', promptId: number | null) {
		functionDefaults[type].promptLinkId = promptId;
		isDirty = true;
	}

	function handleVariantChange(type: 'executor' | 'judge' | 'improve', variant: string | null) {
		functionDefaults[type].modelVariant = variant;
		isDirty = true;
	}

	function updateFunctionSettings(type: 'executor' | 'judge' | 'improve', settings: { temperature?: number | null; maxTokens?: number | null; thinkingLevel?: string | null }) {
		if (settings.temperature !== undefined) functionDefaults[type].temperature = settings.temperature ?? 0.5;
		if (settings.maxTokens !== undefined) functionDefaults[type].maxTokens = settings.maxTokens ?? 8192;
		if (settings.thinkingLevel !== undefined) functionDefaults[type].thinkingLevel = settings.thinkingLevel;
		isDirty = true;
	}

	async function saveFunctionDefaults() {
		if (isSaving) return;
		isSaving = true;
		try {
			for (const type of ['executor', 'judge', 'improve'] as const) {
				await fetch(`/api/admin/function-defaults/${type}`, {
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
			}
			await invalidateAll();
		} catch (error) {
			console.error('Error saving function defaults:', error);
		} finally {
			isSaving = false;
			isDirty = false;
		}
	}

	// Default model IDs for agent creation
	const defaultCouncilModelId = $derived(data.whitelistModels?.[0] || 'zai-coding-plan/glm-4.7');
	const defaultReviewModelId = 'zai-coding-plan/glm-5';

	// Initialize providers store
	$effect(() => {
		if (data.allProviders && data.connectedProviderIds) {
			providers.init({ all: data.allProviders, connected: data.connectedProviderIds });
		}
	});

	function toggleAccordion(sectionId: Section) {
		const newSet = new Set(openAccordions);
		if (newSet.has(sectionId)) newSet.delete(sectionId);
		else newSet.add(sectionId);
		openAccordions = newSet;
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
					<!-- Accordion Header -->
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
									onModelChange={(_id, model) => updateCouncilModel(_id, model)}
									onDelete={(_id) => deleteCouncilMember(_id)}
									onAdd={() => addCouncilMember(defaultCouncilModelId)}
									onPromptChange={(_id, pid) => updateCouncilPrompt(_id, pid)}
									onSettingsChange={(_id, settings) => updateAgentSettings(_id, settings)}
								/>
							{:else if section.id === 'review'}
								<CouncilMembersList
									agents={data.reviewAgents ?? []}
									prompts={data.prompts}
									models={data.models}
									allowedModels={data.allowedModels}
									onModelChange={(_id, model) => updateReviewModel(_id, model)}
									onDelete={(_id) => deleteReviewMember(_id)}
									onAdd={() => addReviewMember(defaultReviewModelId)}
									onPromptChange={(_id, pid) => updateReviewPrompt(_id, pid)}
									parentType="review_defaults"
									onSettingsChange={(_id, settings) => updateAgentSettings(_id, settings)}
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
