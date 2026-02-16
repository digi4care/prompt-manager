<script lang="ts">
	import { page } from '$app/stores';
	import ConnectionSettings from '$lib/components/admin/ai-settings/connection-settings.svelte';
	import CatalogView from '$lib/components/admin/ai-settings/catalog-view.svelte';
	import PolicyEditor from '$lib/components/admin/ai-settings/policy-editor.svelte';
	import ImprovePresets from '$lib/components/admin/ai-settings/improve-presets.svelte';
	import FunctionSettingsCard from '$lib/components/admin/function-settings/FunctionSettingsCard.svelte';

	type Section = 'connection' | 'policy' | 'defaults' | 'catalog' | 'presets';

	const sections: Array<{ id: Section; title: string; tag: string }> = [
		{ id: 'connection', title: 'Connection', tag: 'OC' },
		{ id: 'policy', title: 'AI Policy', tag: 'AP' },
		{ id: 'defaults', title: 'Function Defaults', tag: 'FD' },
		{ id: 'catalog', title: 'Model Catalog', tag: 'MC' },
		{ id: 'presets', title: 'Improve Presets', tag: 'IP' }
	];

	const STORAGE_KEY = 'admin-ai-settings:active-section';
	const validSections = new Set(sections.map((s) => s.id));

	let activeSection = $state<Section>('connection');
	let mounted = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored && validSections.has(stored as Section)) {
				activeSection = stored as Section;
			}
		} catch {
			// ignore
		}
		mounted = true;
	});

	$effect(() => {
		if (!mounted || typeof window === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, activeSection);
		} catch {
			// ignore
		}
	});

	// Get data from server
	let data = $derived($page.data);
</script>

<svelte:head>
	<title>Settings - Admin</title>
</svelte:head>

<div class="container mx-auto space-y-4 px-4 py-6 md:space-y-6 md:py-8">
	<div>
		<h1 class="text-xl font-bold md:text-2xl">Settings</h1>
		<p class="text-sm text-muted-foreground md:text-base">
			Configure OpenCode connection and function defaults
		</p>
	</div>

	<!-- Mobile: horizontal scrollable tabs -->
	<div class="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3 md:hidden">
		{#each sections as section}
			<button
				type="button"
				class="flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors {activeSection ===
				section.id
					? 'bg-primary text-primary-foreground'
					: 'bg-muted text-muted-foreground hover:bg-muted/80'}"
				onclick={() => (activeSection = section.id)}
			>
				<span
					class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px] font-bold"
				>
					{section.tag}
				</span>
				<span>{section.title}</span>
			</button>
		{/each}
	</div>

	<!-- Desktop: sidebar + content -->
	<div class="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
		<!-- Sidebar -->
		<aside class="hidden overflow-hidden rounded-lg border bg-card md:block">
			<nav class="flex flex-col">
				{#each sections as section, i}
					<button
						type="button"
						class="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-muted/50 {activeSection ===
						section.id
							? 'bg-muted text-foreground'
							: 'text-muted-foreground'} {i > 0 ? 'border-t' : ''}"
						onclick={() => (activeSection = section.id)}
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
						<span class="text-xs">{activeSection === section.id ? '▾' : '›'}</span>
					</button>
				{/each}
			</nav>
		</aside>

		<!-- Content -->
		<div class="min-w-0">
			{#if activeSection === 'connection'}
				<ConnectionSettings />
			{:else if activeSection === 'policy'}
				<PolicyEditor />
			{:else if activeSection === 'defaults'}
				<div class="space-y-6">
					<div>
						<h2 class="text-base font-semibold">Function Defaults</h2>
						<p class="text-sm text-muted-foreground">
							Configure default model, temperature, and token limits for each function type.
						</p>
					</div>

					<div class="grid gap-4 lg:grid-cols-2">
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
					</div>

					<!-- Council Agents -->
					{#if data.settings?.council && data.settings.council.length > 0}
						<div>
							<h3 class="mb-3 text-sm font-semibold">Council Agents</h3>
							<div class="grid gap-4 lg:grid-cols-2">
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
							</div>
						</div>
					{/if}
				</div>
			{:else if activeSection === 'catalog'}
				<CatalogView />
			{:else if activeSection === 'presets'}
				<ImprovePresets />
			{/if}
		</div>
	</div>
</div>
