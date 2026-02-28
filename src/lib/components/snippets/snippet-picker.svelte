<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Search, FileText, X } from 'lucide-svelte';
	import { extractVariables } from '$lib/utils/snippet-variables';

	interface Snippet {
		id: number;
		title: string;
		description?: string | null;
		content: string;
		category?: string | null;
		tags?: string[] | null;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
		onselect: (snippet: Snippet) => void;
	}

	let { open, onclose, onselect }: Props = $props();

	let searchQuery = $state('');
	let snippets = $state<Snippet[]>([]);
	let categories = $state<string[]>([]);
	let selectedCategory = $state<string | null>(null);
	let isLoading = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let dialogElement = $state<HTMLDivElement | null>(null);

	// Fetch snippets when dialog opens or search changes
	$effect(() => {
		if (open) {
			searchQuery = '';
			selectedCategory = null;
			fetchSnippets();
			dialogElement?.focus();
		}
	});

	async function fetchSnippets() {
		isLoading = true;
		try {
			const params = new URLSearchParams();
			if (searchQuery) params.set('search', searchQuery);
			if (selectedCategory) params.set('category', selectedCategory);

			const response = await fetch(`/api/snippets?${params}`);
			if (response.ok) {
				const data = await response.json();
				snippets = data.data.snippets;
				// Extract categories from results
				categories = [
					...new Set(snippets.map((s: Snippet) => s.category).filter(Boolean))
				] as string[];
			}
		} catch (err) {
			console.error('Failed to fetch snippets:', err);
		} finally {
			isLoading = false;
		}
	}

	function debouncedSearch() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(fetchSnippets, 300);
	}

	function handleSelect(snippet: Snippet) {
		onselect(snippet);
		onclose();
	}

	function handleClose() {
		onclose();
	}

	function getPreview(content: string): string {
		// Show first 100 chars, truncate with ellipsis
		return content.length > 100 ? content.slice(0, 100) + '...' : content;
	}

	function getVariableCount(content: string): number {
		return extractVariables(content).length;
	}

	function handleCategoryClick(category: string | null) {
		selectedCategory = category;
		fetchSnippets();
	}

	function handleDialogKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			handleClose();
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="absolute inset-0 h-full w-full bg-black/40"
			onclick={handleClose}
			aria-label="Close snippet picker"
		></button>

		<div
			bind:this={dialogElement}
			class="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-label="Insert Snippet"
			tabindex="-1"
			onkeydown={handleDialogKeydown}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b px-4 py-3">
				<div>
					<h3 class="font-semibold text-base">Insert Snippet</h3>
					<p class="text-xs text-muted-foreground">Select a snippet to insert at cursor position</p>
				</div>
				<Button variant="ghost" size="sm" onclick={handleClose}>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<!-- Search -->
			<div class="border-b p-4">
				<div class="relative">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search snippets..."
						bind:value={searchQuery}
						oninput={debouncedSearch}
						class="flex h-10 w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					/>
				</div>
			</div>

			<!-- Category filters -->
			{#if categories.length > 0}
				<div class="flex flex-wrap gap-2 border-b px-4 py-3">
					<Button
						variant={selectedCategory === null ? 'default' : 'outline'}
						size="sm"
						onclick={() => handleCategoryClick(null)}
					>
						All
					</Button>
					{#each categories as category}
						<Button
							variant={selectedCategory === category ? 'default' : 'outline'}
							size="sm"
							onclick={() => handleCategoryClick(category)}
						>
							{category}
						</Button>
					{/each}
				</div>
			{/if}

			<!-- Snippets list -->
			<div class="flex-1 space-y-2 overflow-y-auto p-4">
				{#if isLoading}
					<div class="py-8 text-center text-muted-foreground">Loading...</div>
				{:else if snippets.length === 0}
					<div class="py-8 text-center text-muted-foreground">
						<FileText class="mx-auto mb-2 h-8 w-8 opacity-50" />
						<p>No snippets found.</p>
						<p class="text-sm">Create snippets in the library first.</p>
					</div>
				{:else}
					{#each snippets as snippet (snippet.id)}
						<button
							type="button"
							class="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
							onclick={() => handleSelect(snippet)}
						>
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="font-medium">{snippet.title}</div>
									{#if snippet.description}
										<div class="mt-1 text-sm text-muted-foreground">{snippet.description}</div>
									{/if}
									<pre
										class="mt-2 overflow-hidden rounded bg-muted p-2 text-xs whitespace-pre-wrap">{getPreview(
											snippet.content
										)}</pre>
								</div>
								<div class="flex flex-col items-end gap-1">
									{#if snippet.category}
										<Badge variant="secondary">{snippet.category}</Badge>
									{/if}
									{#if getVariableCount(snippet.content) > 0}
										<Badge variant="outline">{getVariableCount(snippet.content)} vars</Badge>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
