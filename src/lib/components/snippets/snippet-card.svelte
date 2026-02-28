<script lang="ts">
	import type { SnippetWithTags } from '$lib/server/services/snippets.service';
	import { dateFormatStore } from '$lib/stores/date-format.svelte';
	import { formatDateString } from '$lib/utils/date';
	import { extractVariables } from '$lib/utils/snippet-variables';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { cn } from '$lib/utils';
	import { MoreHorizontal, Pencil, Trash2, Clock, Code } from 'lucide-svelte';

	interface Props {
		snippet: SnippetWithTags;
		selectable?: boolean;
		selected?: boolean;
		onclick?: () => void;
		onselect?: () => void;
		onedit?: (snippet: SnippetWithTags) => void;
		ondelete?: (snippet: SnippetWithTags) => void;
		class?: string;
	}

	let {
		snippet,
		selectable = false,
		selected = false,
		onclick,
		onselect,
		onedit,
		ondelete,
		class: className = ''
	}: Props = $props();

	let showDropdown = $state(false);

	// Format date with null check
	function getFormattedDate(): string {
		if (!snippet.updatedAt) return 'Unknown';
		const d = new Date(snippet.updatedAt);
		if (isNaN(d.getTime())) return 'Unknown';
		return formatDateString(d, dateFormatStore.format);
	}

	let formattedDate = $derived(getFormattedDate());

	// Get content preview (first 100 chars)
	let contentPreview = $derived(() => {
		const content = snippet.content || '';
		if (content.length <= 100) return content;
		return content.substring(0, 100) + '...';
	});

	// Extract variables from content
	let variableCount = $derived(extractVariables(snippet.content).length);

	// Get category badge color
	function getCategoryColor(category: string | null): string {
		if (!category) return 'bg-muted text-muted-foreground';
		const colors: Record<string, string> = {
			greetings: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
			formatting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
			prompts: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
			templates: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
			code: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
		};
		return colors[category.toLowerCase()] || 'bg-muted text-muted-foreground';
	}

	function handleEdit(e: Event) {
		e.stopPropagation();
		onedit?.(snippet);
		showDropdown = false;
	}

	function handleDelete(e: Event) {
		e.stopPropagation();
		ondelete?.(snippet);
		showDropdown = false;
	}
</script>

<Card
	class={cn(
		'cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-0.5 hover:shadow-lg',
		selected ? 'ring-2 ring-primary' : '',
		className
	)}
	{onclick}
	role="button"
	tabindex="0"
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onclick?.();
		}
	}}
>
	<CardHeader class="pb-2">
		<div class="flex items-start justify-between gap-2">
			{#if selectable}
				<input
					type="checkbox"
					checked={selected}
					class="mt-1 mr-2"
					onclick={(e) => {
						e.stopPropagation();
						onselect?.();
					}}
				/>
			{/if}
			<CardTitle class="line-clamp-2 flex-1 text-lg leading-tight">
				{snippet.title}
			</CardTitle>
			<div class="flex items-center gap-2">
				{#if snippet.categoryName}
					<span
						class={cn(
							'inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium capitalize',
							getCategoryColor(snippet.categoryName)
						)}
					>
						{snippet.categoryName}
					</span>
				{/if}

				<!-- Variable count badge -->
				{#if variableCount > 0}
					<span
						class="inline-flex shrink-0 items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
					>
						<Code class="h-3 w-3" />
						{variableCount}
					</span>
				{/if}

				<!-- Actions Dropdown -->
				<DropdownMenu bind:open={showDropdown}>
					<DropdownMenuTrigger
						class="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						onclick={(e: Event) => e.stopPropagation()}
					>
						<MoreHorizontal class="h-4 w-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onclick={handleEdit}>
							<Pencil class="mr-2 h-4 w-4" />
							Edit
						</DropdownMenuItem>
						<div class="my-1 border-t"></div>
						<DropdownMenuItem
							onclick={handleDelete}
							class="text-destructive focus:text-destructive"
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	</CardHeader>

	<CardContent class="pt-0">
		{#if snippet.description}
			<p class="mb-3 line-clamp-2 text-sm text-muted-foreground">
				{snippet.description}
			</p>
		{/if}

		<!-- Content preview -->
		<pre
			class="mb-3 max-h-20 overflow-hidden rounded bg-muted p-2 text-xs whitespace-pre-wrap text-muted-foreground">{contentPreview()}</pre>

		{#if snippet.tagsList && snippet.tagsList.length > 0}
			<div class="mb-3 flex flex-wrap gap-1.5">
				{#each snippet.tagsList.slice(0, 4) as tag}
					<span
						class="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
					>
						{tag}
					</span>
				{/each}
				{#if snippet.tagsList.length > 4}
					<span
						class="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
					>
						+{snippet.tagsList.length - 4}
					</span>
				{/if}
			</div>
		{/if}

		<div class="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
			<span class="flex items-center gap-1">
				<Clock class="h-3.5 w-3.5" />
				Updated {formattedDate}
			</span>
		</div>
	</CardContent>
</Card>
