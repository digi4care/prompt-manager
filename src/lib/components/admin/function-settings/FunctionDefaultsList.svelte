<script lang="ts">
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import { Button } from '$lib/components/ui/button';

	interface Model {
		id: string;
		name: string;
		provider: string;
		logo?: string;
	}

	interface FunctionConfig {
		modelId: string;
		modelName: string;
		modelProvider?: string | null;
		modelLogo?: string | null;
		temperature: number;
		maxTokens: number;
		promptTemplate?: string | null;
		promptLinkId?: number | null;
	}

	interface Props {
		executor?: FunctionConfig | null;
		judge?: FunctionConfig | null;
		improve?: FunctionConfig | null;
		prompts?: { id: number; title: string }[];
		models?: Model[];
		allowedModels?: string[];
		onModelSelect: (type: 'executor' | 'judge' | 'improve', model: Model) => void;
		onPromptChange?: (type: 'executor' | 'judge' | 'improve', promptId: number | null) => void;
		onSave?: () => void;
		isSaving?: boolean;
		isDirty?: boolean;
	}

	let {
		executor,
		judge,
		improve = null,
		prompts = [],
		models = [],
		allowedModels = [],
		onModelSelect,
		onPromptChange,
		onSave,
		isSaving = false,
		isDirty = false
	}: Props = $props();

	let activeModal = $state<'executor' | 'judge' | 'improve' | null>(null);
	let searchQuery = $state('');

	function isModelAllowed(modelId: string, providerId: string): boolean {
		if (!allowedModels?.length) return true;
		const fullId = `${providerId}/${modelId}`.toLowerCase();
		return allowedModels.some((a) => {
			const aLower = a.toLowerCase();
			if (aLower.includes('/')) return fullId === aLower || fullId.startsWith(aLower);
			return modelId.toLowerCase() === aLower || modelId.toLowerCase().startsWith(aLower);
		});
	}

	let filteredModels = $derived.by(() => {
		let result = models.filter((m) => isModelAllowed(m.id, m.provider));
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(m) => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q)
			);
		}
		return result;
	});

	function openModal(type: 'executor' | 'judge' | 'improve') {
		activeModal = type;
		searchQuery = '';
	}

	function selectModel(model: Model) {
		if (activeModal) {
			onModelSelect(activeModal, model);
			activeModal = null;
		}
	}

	const roleConfig = {
		executor: { label: 'Executor', desc: 'Runs prompt content', icon: '▶', color: 'emerald' },
		judge: { label: 'Judge', desc: 'Evaluates responses', icon: '⚖', color: 'violet' },
		improve: { label: 'Improve', desc: 'Improves prompts', icon: '✨', color: 'amber' }
	} as const;

	function getConfig(type: 'executor' | 'judge' | 'improve'): FunctionConfig | undefined {
		if (type === 'executor') return executor ?? undefined;
		if (type === 'judge') return judge ?? undefined;
		return improve ?? executor ?? undefined;
	}
</script>

<div class="space-y-2">
	{#each ['executor', 'judge', 'improve'] as type_}
		{@const type = type_ as 'executor' | 'judge' | 'improve'}
		{@const config = getConfig(type)}
		{@const role = roleConfig[type]}
		{#if config && (type !== 'improve' || improve)}
			<div
				class="group flex flex-col gap-3 rounded-lg border border-border/50 bg-card p-3 transition-all hover:border-border sm:flex-row sm:items-center sm:gap-4"
			>
				<div class="flex items-center gap-3 sm:min-w-[140px]">
					<span
						class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-{role.color}-100 text-base dark:bg-{role.color}-900/30"
					>
						{role.icon}
					</span>
					<div class="min-w-0">
						<div class="text-sm font-medium">{role.label}</div>
						<div class="truncate text-xs text-muted-foreground">{role.desc}</div>
					</div>
				</div>

				<div class="flex flex-1 flex-wrap items-center gap-2 sm:gap-3">
					<button
						type="button"
						class="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent/30 focus:ring-2 focus:ring-primary/30 focus:outline-none"
						onclick={() => openModal(type)}
					>
						{#if config.modelProvider}
							<ProviderLogo providerId={config.modelProvider} size="sm" />
						{:else}
							<span class="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs"
								>?</span
							>
						{/if}
						<span class="flex-1 truncate text-sm">
							{#if config.modelName}
								<span class="font-medium">{config.modelName}</span>
							{:else}
								<span class="text-muted-foreground">Select model...</span>
							{/if}
						</span>
						<span class="shrink-0 text-xs text-muted-foreground">Change</span>
					</button>

					{#if prompts.length > 0}
						<select
							class="h-9 min-w-[140px] rounded-md border border-border/60 bg-background px-2 text-xs focus:ring-2 focus:ring-primary/30 focus:outline-none"
							value={config.promptLinkId ?? ''}
							onchange={(e) => {
								const val = (e.target as HTMLSelectElement).value;
								onPromptChange?.(type, val ? Number(val) : null);
							}}
						>
							<option value="">No prompt</option>
							{#each prompts as prompt}
								<option value={prompt.id} selected={config.promptLinkId === prompt.id}>
									{prompt.title}
								</option>
							{/each}
						</select>
					{/if}
				</div>
			</div>
		{/if}
	{/each}

	{#if isDirty && onSave}
		<div class="flex justify-end pt-2">
			<Button onclick={onSave} disabled={isSaving}>
				{isSaving ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	{/if}
</div>

{#if activeModal}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (activeModal = null)}
		onkeydown={(e) => e.key === 'Escape' && (activeModal = null)}
		role="button"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="border-b p-4">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold">Select Model for {roleConfig[activeModal].label}</h3>
					<button
						type="button"
						class="rounded p-1 hover:bg-muted"
						onclick={() => (activeModal = null)}
					>
						✕
					</button>
				</div>
				<input
					type="text"
					placeholder="Search models..."
					bind:value={searchQuery}
					class="mt-3 h-9 w-full rounded-md border bg-background px-3 text-sm"
				/>
			</div>

			<div class="max-h-[50vh] overflow-y-auto p-2">
				{#if filteredModels.length === 0}
					<p class="py-8 text-center text-sm text-muted-foreground">No models found</p>
				{:else}
					{#each filteredModels as model}
						{@const isSelected = getConfig(activeModal)?.modelId === model.id}
						<button
							type="button"
							class="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-accent {isSelected
								? 'bg-primary/10 ring-1 ring-primary/30'
								: ''}"
							onclick={() => selectModel(model)}
						>
							<ProviderLogo providerId={model.provider} size="sm" />
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm font-medium">{model.name}</div>
								<div class="text-xs text-muted-foreground">{model.provider}</div>
							</div>
							{#if isSelected}
								<span class="text-xs font-medium text-primary">Selected</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
