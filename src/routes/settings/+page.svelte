<script lang="ts">
	import { page } from '$app/stores';
	import {
		Plug,
		Shield,
		Settings,
		Database,
		Sparkles,
		ChevronDown,
		ChevronUp
	} from 'lucide-svelte';
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import FunctionSettingsCard from '$lib/components/admin/function-settings/FunctionSettingsCard.svelte';

	type Section = 'connection' | 'policy' | 'defaults' | 'catalog' | 'presets';

	const sectionIcons = {
		connection: Plug,
		policy: Shield,
		defaults: Settings,
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
		sapphire: 'border-l-sapphire',
		mauve: 'border-l-mauve',
		green: 'border-l-green',
		peach: 'border-l-peach',
		pink: 'border-l-pink'
	};

	const bgClasses: Record<string, string> = {
		sapphire: 'bg-sapphire/20',
		mauve: 'bg-mauve/20',
		green: 'bg-green/20',
		peach: 'bg-peach/20',
		pink: 'bg-pink/20'
	};

	const textClasses: Record<string, string> = {
		sapphire: 'text-sapphire',
		mauve: 'text-mauve',
		green: 'text-green',
		peach: 'text-peach',
		pink: 'text-pink'
	};

	function getColorClasses(color: string): {
		leftBorder: string;
		bg: string;
		text: string;
	} {
		return {
			leftBorder: leftBorderClasses[color] || 'border-l-sapphire',
			bg: bgClasses[color] || 'bg-sapphire/20',
			text: textClasses[color] || 'text-sapphire'
		};
	}
</script>

<svelte:head>
	<title>Settings - Admin</title>
</svelte:head>

<div class="from-surface-0 to-surface-1 min-h-screen bg-gradient-to-br via-background">
	<div class="container mx-auto px-4 py-6 md:py-10">
		<!-- Header -->
		<div class="mb-6 flex items-center gap-4 md:mb-8">
			<div
				class="bg-gradient-mauve shadow-elevated flex h-12 w-12 items-center justify-center rounded-xl"
			>
				<Settings class="size-6 text-white" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
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
					class="bg-surface-1 overflow-hidden rounded-xl shadow-card transition-all duration-200 {isOpen
						? 'shadow-elevated'
						: ''}"
				>
					<!-- Accordion Header with colored left border -->
					<button
						type="button"
						class="group hover:bg-surface-2 flex w-full cursor-pointer items-center gap-4 p-4 text-left transition-colors md:p-5 {isOpen
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
						<div class="border-surface-2 border-t p-4 md:p-5">
							{#if section.id === 'connection'}
								<ConnectionSettings />
							{:else if section.id === 'policy'}
								<PolicyEditor />
							{:else if section.id === 'defaults'}
								<div class="space-y-6">
									{#if data.settings?.executor}
										<FunctionSettingsCard
											type="executor"
											label="Executor"
											description="Runs prompt content"
											modelId={data.settings.executor.modelId}
											modelName={data.settings.executor.modelName}
											modelProvider={data.settings.executor.modelProvider}
											modelLogo={data.settings.executor.modelLogo}
											temperature={data.settings.executor.temperature}
											maxTokens={data.settings.executor.maxTokens}
											promptTemplate={data.settings.executor.promptTemplate}
											prompts={data.prompts}
											models={data.models}
										/>
									{/if}

									{#if data.settings?.judge}
										<FunctionSettingsCard
											type="judge"
											label="Judge"
											description="Evaluates responses"
											modelId={data.settings.judge.modelId}
											modelName={data.settings.judge.modelName}
											modelProvider={data.settings.judge.modelProvider}
											modelLogo={data.settings.judge.modelLogo}
											temperature={data.settings.judge.temperature}
											maxTokens={data.settings.judge.maxTokens}
											promptTemplate={data.settings.judge.promptTemplate}
											prompts={data.prompts}
											models={data.models}
										/>
									{/if}

									{#if data.settings?.improve}
										<FunctionSettingsCard
											type="improve"
											label="Improve"
											description="Improves prompts"
											modelId={data.settings.improve.modelId}
											modelName={data.settings.improve.modelName}
											modelProvider={data.settings.improve.modelProvider}
											modelLogo={data.settings.improve.modelLogo}
											temperature={data.settings.improve.temperature}
											maxTokens={data.settings.improve.maxTokens}
											promptTemplate={data.settings.improve.promptTemplate}
											prompts={data.prompts}
											models={data.models}
										/>
									{/if}

									{#if data.settings?.council && data.settings.council.length > 0}
										{#each data.settings.council as agent, i}
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
												promptTemplate={agent.promptTemplate}
												prompts={data.prompts}
												models={data.models}
											/>
										{/each}
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
