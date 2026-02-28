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
	import { MoreHorizontal, Pencil, Trash2, Clock, Code, Tag, FileText } from 'lucide-svelte';

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

	// Get content preview (first 120 chars, preserving line breaks)
	let contentPreview = $derived(() => {
		const content = snippet.content || '';
		if (content.length <= 120) return content;
		return content.substring(0, 120) + '...';
	});

	// Extract variables from content
	let variableCount = $derived(extractVariables(snippet.content).length);

	// Get category badge color
	function getCategoryColor(category: string | null): string {
		if (!category) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
		const colors: Record<string, string> = {
			greetings: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
			formatting: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
			prompts: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
			templates: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
			code: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
		};
		return (
			colors[category.toLowerCase()] ||
			'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
		);
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
		'group cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-0.5 hover:shadow-lg',
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
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<div class="flex min-w-0 flex-1 items-start gap-3">
				{#if selectable}
					<input
						type="checkbox"
						checked={selected}
						class="mt-1 shrink-0"
						onclick={(e) => {
							e.stopPropagation();
							onselect?.();
						}}
					/>
				{/if}
				<div class="min-w-0 flex-1">
					<CardTitle class="line-clamp-2 leading-snug text-base">
						{snippet.title}
					</CardTitle>
				</div>
			</div>

			<!-- Actions Dropdown -->
			<DropdownMenu bind:open={showDropdown}>
				<DropdownMenuTrigger
					class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
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
					<DropdownMenuItem onclick={handleDelete} class="text-destructive focus:text-destructive">
						<Trash2 class="mr-2 h-4 w-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>

		<!-- Category & Metadata Row -->
		<div class="mt-2 flex flex-wrap items-center gap-2">
			{#if snippet.categoryName}
				<span
					class={cn(
						'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize',
						getCategoryColor(snippet.categoryName)
					)}
				>
					{snippet.categoryName}
				</span>
			{:else}
				<span
					class="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
				>
					Uncategorized
				</span>
			{/if}

			{#if variableCount > 0}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
				>
					<Code class="h-3 w-3" />
					{variableCount} variable{variableCount > 1 ? 's' : ''}
				</span>
			{/if}
		</div>
	</CardHeader>

	<CardContent class="space-y-3 pt-0">
		<!-- Description -->
		{#if snippet.description}
			<p class="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
				{snippet.description}
			</p>
		{/if}

		<!-- Content Preview -->
		<div class="rounded-md bg-muted/50 p-2.5">
			<pre
				class="max-h-16 overflow-hidden font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{contentPreview()}</pre>
		</div>

		<!-- Footer: Tags & Date -->
		<div class="flex items-center justify-between gap-2 pt-1">
			<!-- Tags -->
			<div class="flex min-w-0 flex-1 items-center gap-1.5">
				{#if snippet.tagsList && snippet.tagsList.length > 0}
					<Tag class="h-3 w-3 shrink-0 text-muted-foreground/60" />
					<div class="flex flex-wrap gap-1">
						{#each snippet.tagsList.slice(0, 3) as tag}
							<span
								class="rounded bg-secondary/50 px-1.5 py-0.5 text-[10px] text-secondary-foreground"
							>
								{tag}
							</span>
						{/each}
						{#if snippet.tagsList.length > 3}
							<span class="text-[10px] text-muted-foreground">
								+{snippet.tagsList.length - 3}
							</span>
						{/if}
					</div>
				{:else}
					<span class="text-xs text-muted-foreground/50">No tags</span>
				{/if}
			</div>

			<!-- Date -->
			<span class="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground/70">
				<Clock class="h-3 w-3" />
				{formattedDate}
			</span>
		</div>
	</CardContent>
</Card>
