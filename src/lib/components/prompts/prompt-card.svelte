<script lang="ts">
	import type { Prompt } from '$lib/stores/prompts.svelte';
	import { dateFormatStore } from '$lib/stores/date-format.svelte';
	import { formatDateString } from '$lib/utils/date';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { cn } from '$lib/utils';
	import { MoreHorizontal, Pencil, Copy, Trash2, Clock, FileText } from 'lucide-svelte';

	interface Props {
		prompt: Prompt;
		selectable?: boolean;
		selected?: boolean;
		onclick?: () => void;
		onselect?: () => void;
		onedit?: (prompt: Prompt) => void;
		ondelete?: (prompt: Prompt) => void;
		onduplicate?: (prompt: Prompt) => void;
		class?: string;
	}

	let {
		prompt,
		selectable = false,
		selected = false,
		onclick,
		onselect,
		onedit,
		ondelete,
		onduplicate,
		class: className = ''
	}: Props = $props();

	let showDropdown = $state(false);

	// Format date with null check
	function getFormattedDate(): string {
		if (!prompt.updatedAt) return 'Unknown';
		const d = new Date(prompt.updatedAt);
		if (isNaN(d.getTime())) return 'Unknown';
		return formatDateString(d, dateFormatStore.format);
	}

	let formattedDate = $derived(getFormattedDate());

	// Get purpose badge color
	function getPurposeColor(purpose: string | null): string {
		if (!purpose) return 'bg-muted text-muted-foreground';
		const colors: Record<string, string> = {
			development: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
			writing: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
			analysis: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
			creative: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
			general: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
		};
		return colors[purpose.toLowerCase()] || colors.general;
	}

	function handleEdit(e: Event) {
		e.stopPropagation();
		onedit?.(prompt);
		showDropdown = false;
	}

	function handleDelete(e: Event) {
		e.stopPropagation();
		ondelete?.(prompt);
		showDropdown = false;
	}

	function handleDuplicate(e: Event) {
		e.stopPropagation();
		onduplicate?.(prompt);
		showDropdown = false;
	}
</script>

<Card
	class={cn(
		'cursor-pointer transition-all duration-200 hover:shadow-md',
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
				{prompt.title}
			</CardTitle>
			<div class="flex items-center gap-2">
				{#if prompt.purpose}
					<span
						class={cn(
							'inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium capitalize',
							getPurposeColor(prompt.purpose)
						)}
					>
						{prompt.purpose}
					</span>
				{/if}

				<!-- Actions Dropdown -->
				<DropdownMenu bind:open={showDropdown}>
					<DropdownMenuTrigger
						class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
						onclick={(e: Event) => e.stopPropagation()}
					>
						<MoreHorizontal class="h-4 w-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onclick={handleEdit}>
							<Pencil class="mr-2 h-4 w-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem onclick={handleDuplicate}>
							<Copy class="mr-2 h-4 w-4" />
							Duplicate
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
		{#if prompt.description}
			<p class="mb-3 line-clamp-2 text-sm text-muted-foreground">
				{prompt.description}
			</p>
		{/if}

		{#if prompt.tags && prompt.tags.length > 0}
			<div class="mb-3 flex flex-wrap gap-1.5">
				{#each prompt.tags.slice(0, 4) as tag}
					<span
						class="inline-flex items-center rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
					>
						{tag}
					</span>
				{/each}
				{#if prompt.tags.length > 4}
					<span
						class="inline-flex items-center rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
					>
						+{prompt.tags.length - 4}
					</span>
				{/if}
			</div>
		{/if}

		<div class="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
			<span class="flex items-center gap-1">
				<Clock class="h-3.5 w-3.5" />
				Updated {formattedDate}
			</span>
			{#if prompt.latestVersionId}
				<span class="flex items-center gap-1">
					<FileText class="h-3.5 w-3.5" />
					v{prompt.latestVersionId}
				</span>
			{/if}
		</div>
	</CardContent>
</Card>
