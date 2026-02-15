<script lang="ts">
	import type { Prompt } from '$lib/stores/prompts.svelte';
	import { dateFormatStore } from '$lib/stores/date-format.svelte';
	import { formatDateString } from '$lib/utils/date';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { cn } from '$lib/utils';

	interface Props {
		prompts: Prompt[];
		onedit?: (prompt: Prompt) => void;
		ondelete?: (prompt: Prompt) => void;
		onduplicate?: (prompt: Prompt) => void;
		isBulkMode?: boolean;
		selectedPromptIds?: Set<number>;
		onToggleSelection?: (id: number) => void;
		class?: string;
	}

	let {
		prompts,
		onedit,
		ondelete,
		onduplicate,
		isBulkMode = false,
		selectedPromptIds = new Set(),
		onToggleSelection,
		class: className = ''
	}: Props = $props();

	// Format date with null check
	function getFormattedDate(date: Date | string): string {
		if (!date) return 'Unknown';
		const d = typeof date === 'string' ? new Date(date) : date;
		if (isNaN(d.getTime())) return 'Unknown';
		return formatDateString(d, dateFormatStore.format);
	}

	function handleEdit(prompt: Prompt, e: Event) {
		e.stopPropagation();
		onedit?.(prompt);
	}

	function handleDelete(prompt: Prompt, e: Event) {
		e.stopPropagation();
		ondelete?.(prompt);
	}

	function handleDuplicate(prompt: Prompt, e: Event) {
		e.stopPropagation();
		onduplicate?.(prompt);
	}
</script>

<div class={cn('space-y-4', className)} id="prompt-table-container">
	{#if prompts.length === 0}
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
			<p class="text-muted-foreground">Try adjusting your search or filters.</p>
		</div>
	{:else}
		<div class="rounded-md border">
			<table class="w-full">
				<thead class="bg-muted">
					<tr class="border-b">
						<th class="px-4 py-3 text-left text-sm font-medium">Title</th>
						<th class="px-4 py-3 text-left text-sm font-medium">Tags</th>
						<th class="px-4 py-3 text-left text-sm font-medium">Updated</th>
						<th class="px-4 py-3 text-right text-sm font-medium">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each prompts as prompt (prompt.id)}
						<tr
							class={cn(
								'cursor-pointer border-b transition-colors',
								isBulkMode && selectedPromptIds.has(prompt.id) && 'bg-primary/5',
								!isBulkMode && 'hover:bg-muted/50'
							)}
							onclick={() => {
								if (isBulkMode) {
									onToggleSelection?.(prompt.id);
								} else {
									window.location.href = `/prompts/${prompt.id}`;
								}
							}}
							role="button"
							tabindex="0"
							onkeydown={(e: KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									if (isBulkMode) {
										onToggleSelection?.(prompt.id);
									} else {
										window.location.href = `/prompts/${prompt.id}`;
									}
								}
							}}
						>
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									{#if isBulkMode}
										<input
											type="checkbox"
											checked={selectedPromptIds.has(prompt.id)}
											onchange={() => onToggleSelection?.(prompt.id)}
											class="h-4 w-4 cursor-pointer rounded border-primary bg-background focus:ring-2 focus:ring-primary"
										/>
									{/if}
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path
												d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
											/>
											<polyline points="14 2 14 8 20 8" />
										</svg>
									</div>
									<div class="min-w-0 flex-1">
										<div class="font-medium">{prompt.title}</div>
										{#if prompt.description}
											<div class="max-w-md truncate text-sm text-muted-foreground">
												{prompt.description}
											</div>
										{/if}
									</div>
								</div>
							</td>
							<td class="px-4 py-3">
								{#if prompt.tags && prompt.tags.length > 0}
									<div class="flex flex-wrap gap-1">
										{#each prompt.tags as tag}
											<span
												class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs"
											>
												{tag}
											</span>
										{/each}
									</div>
								{:else}
									<span class="text-sm text-muted-foreground">No tags</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-sm text-muted-foreground">
								{getFormattedDate(prompt.updatedAt)}
							</td>
							<td class="px-4 py-3 text-right">
								<DropdownMenu>
									<DropdownMenuTrigger
										class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
										onclick={(e: Event) => e.stopPropagation()}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<circle cx="12" cy="12" r="1" />
											<circle cx="19" cy="12" r="1" />
											<circle cx="5" cy="12" r="1" />
										</svg>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onclick={() => handleEdit(prompt, new Event('click'))}>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="mr-2"
											>
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
											</svg>
											Edit
										</DropdownMenuItem>
										<DropdownMenuItem onclick={() => handleDuplicate(prompt, new Event('click'))}>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="mr-2"
											>
												<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
												<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
											</svg>
											Duplicate
										</DropdownMenuItem>
										<div class="my-1 border-t"></div>
										<DropdownMenuItem
											onclick={() => handleDelete(prompt, new Event('click'))}
											class="text-destructive focus:text-destructive"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												class="mr-2"
											>
												<path d="M3 6h18" />
												<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
												<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
											</svg>
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
