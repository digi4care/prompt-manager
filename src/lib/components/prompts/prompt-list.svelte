<script lang="ts">
	import type { Prompt } from '$lib/stores/prompts.svelte';
	import { promptsStore } from '$lib/stores/prompts.svelte';
	import PromptCard from './prompt-card.svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';

	interface Props {
		prompts?: Prompt[];
		loading?: boolean;
		onPromptSelect?: (prompt: Prompt) => void;
		onedit?: (prompt: Prompt) => void;
		ondelete?: (prompt: Prompt) => void;
		onduplicate?: (prompt: Prompt) => void;
		onbulkdelete?: (promptIds: number[]) => void;
		isBulkMode?: boolean;
		selectedPromptIds?: Set<number>;
		onToggleSelection?: (id: number) => void;
		emptyAction?: import('svelte').Snippet;
		class?: string;
	}

	let {
		prompts: propPrompts,
		loading: propLoading = false,
		onPromptSelect,
		onedit,
		ondelete,
		onduplicate,
		onbulkdelete,
		isBulkMode = false,
		selectedPromptIds = new Set(),
		onToggleSelection,
		emptyAction,
		class: className = ''
	}: Props = $props();

	// Use prop prompts if provided, otherwise use store
	let prompts = $derived(propPrompts ?? promptsStore.prompts);
	let loading = $derived(propLoading || promptsStore.loading);
	let error = $derived(promptsStore.error);

	// Check if there are any prompts at all (for empty state)
	let hasAnyPrompts = $derived(prompts.length > 0);

	// Check if filters are active
	let hasActiveFilters = $derived(false);

	function handlePromptClick(prompt: Prompt) {
		onPromptSelect?.(prompt);
	}
</script>

<div class={cn('space-y-4', className)} id="prompt-list-container">
	<!-- Loading state -->
	{#if loading}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each Array(6) as _, i}
				<div class="animate-pulse rounded-lg border bg-card p-6">
					<div class="mb-3 h-6 w-3/4 rounded bg-muted"></div>
					<div class="mb-2 h-4 w-full rounded bg-muted"></div>
					<div class="mb-4 h-4 w-2/3 rounded bg-muted"></div>
					<div class="flex gap-2">
						<div class="h-5 w-16 rounded bg-muted"></div>
						<div class="h-5 w-16 rounded bg-muted"></div>
					</div>
				</div>
			{/each}
		</div>
	{:else if error}
		<!-- Error state -->
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="48"
				height="48"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mb-4 text-destructive"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" x2="12" y1="8" y2="12" />
				<line x1="12" x2="12.01" y1="16" y2="16" />
			</svg>
			<h3 class="mb-2 text-lg font-semibold">Failed to load prompts</h3>
			<p class="mb-4 text-muted-foreground">{error}</p>
			<Button onclick={() => promptsStore.fetchPrompts()}>Try Again</Button>
		</div>
	{:else if !hasAnyPrompts}
		<!-- Empty state - no prompts -->
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="64"
				height="64"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mb-4 text-muted-foreground"
			>
				<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
				<polyline points="14 2 14 8 20 8" />
			</svg>
			<h3 class="mb-2 text-xl font-semibold">No prompts yet</h3>
			<p class="mb-6 max-w-sm text-muted-foreground">
				Create your first prompt to start building your collection. Prompts are building blocks of
				your AI-powered workflow.
			</p>
			{#if emptyAction}
				{@render emptyAction()}
			{:else}
				<Button href="/prompts/new">Create Your First Prompt</Button>
			{/if}
		</div>
	{:else if prompts.length === 0}
		<!-- Empty state - no results for filters -->
		<div class="flex flex-col items-center justify-center py-16 text-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="64"
				height="64"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="mb-4 text-muted-foreground"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
				<line x1="8" x2="14" y1="11" y2="11" />
			</svg>
			<h3 class="mb-2 text-xl font-semibold">No matching prompts</h3>
			<p class="mb-6 max-w-sm text-muted-foreground">
				Try adjusting your search or filters to find what you're looking for.
			</p>
			<Button variant="outline" onclick={() => window.location.reload()}>Clear All Filters</Button>
		</div>
	{:else}
		<!-- Prompts grid -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each prompts as prompt (prompt.id)}
				<div
					class={cn(
						'relative cursor-pointer transition-all',
						isBulkMode && selectedPromptIds.has(prompt.id) && 'ring-2 ring-primary ring-offset-2'
					)}
					role="button"
					tabindex="0"
					onclick={() => {
						if (isBulkMode) {
							onToggleSelection?.(prompt.id);
						} else {
							handlePromptClick(prompt);
						}
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							if (isBulkMode) {
								onToggleSelection?.(prompt.id);
							} else {
								handlePromptClick(prompt);
							}
						}
					}}
				>
					<PromptCard
						{prompt}
						{onedit}
						{ondelete}
						{onduplicate}
						class={cn(
							isBulkMode && selectedPromptIds.has(prompt.id) && 'border-primary bg-primary/5'
						)}
					/>
				</div>
			{/each}
		</div>

		<!-- Load more button (if there are more) -->
		{#if promptsStore.pagination.hasMore}
			<div class="flex justify-center pt-4">
				<Button variant="outline" {loading} onclick={() => promptsStore.loadMore()}>
					Load More
				</Button>
			</div>
		{/if}
	{/if}
</div>
