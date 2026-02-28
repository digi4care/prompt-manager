<script lang="ts">
	import type { PageData } from './$types';
	import type { SnippetWithTags } from '$lib/server/services/snippets.service';
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { SnippetCard } from '$lib/components/snippets';
	import { Search, Plus, X, Code, Info, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// View state
	let searchQuery: string = $state(data.search || '');
	let isLoading: boolean = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let selectedCategoryId: number | null = $state(data.categoryId || null);

	// Confirmation state
	let showDeleteConfirm: boolean = $state(false);
	let snippetToDelete: SnippetWithTags | null = $state(null);
	let showInfoBox: boolean = $state(true);

	// Derived values
	let categories = $derived(data.categories || []);
	let snippets: SnippetWithTags[] = $derived(data.snippets || []);

	function updateUrl() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (selectedCategoryId) url.searchParams.set('categoryId', String(selectedCategoryId));
		else url.searchParams.delete('categoryId');
		isLoading = true;
		goto(url.toString(), { replaceState: true, invalidateAll: true }).finally(() => {
			isLoading = false;
		});
	}

	function debouncedSearch() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(updateUrl, 300);
	}

	function selectCategory(categoryId: number | null) {
		selectedCategoryId = selectedCategoryId === categoryId ? null : categoryId;
		updateUrl();
	}

	// Clear all filters
	function clearFilters() {
		searchQuery = '';
		selectedCategoryId = null;
		const url = new URL(window.location.href);
		url.searchParams.delete('search');
		url.searchParams.delete('categoryId');
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	// CRUD handlers
	function handleCreate() {
		goto('/snippets/new');
	}

	function handleEdit(snippet: SnippetWithTags) {
		goto(`/snippets/${snippet.id}/edit`);
	}

	function handleDelete(snippet: SnippetWithTags) {
		snippetToDelete = snippet;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (!snippetToDelete) return;

		try {
			const response = await fetch(`/api/snippets/${snippetToDelete.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				await invalidate('snippets:list');
				showDeleteConfirm = false;
				snippetToDelete = null;
			} else {
				console.error('Failed to delete snippet:', await response.text());
				alert('Failed to delete snippet');
			}
		} catch (error) {
			console.error('Error deleting snippet:', error);
			alert('Error deleting snippet');
		}
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		snippetToDelete = null;
	}
</script>

<svelte:head>
	<title>Snippets - Prompt Wallet</title>
</svelte:head>

<div class="flex h-full gap-6 p-6">
	<!-- Main Content -->
	<div class="flex min-w-0 flex-1 flex-col">
		<!-- Header -->
		<div class="mb-6 flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-semibold">Snippets</h1>
				<div class="flex gap-2">
					<Button onclick={handleCreate}>
						<Plus class="mr-2 h-4 w-4" />
						Create Snippet
					</Button>
				</div>
			</div>

			<!-- Info Box - What are Snippets? -->
			{#if showInfoBox}
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950"
				>
					<div class="flex items-start gap-3">
						<Info class="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
						<div class="flex-1">
							<div class="flex items-center justify-between">
								<h3 class="font-medium text-blue-900 dark:text-blue-100">What are Snippets?</h3>
								<button
									type="button"
									onclick={() => (showInfoBox = false)}
									class="rounded p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
									aria-label="Dismiss"
								>
									<X class="h-4 w-4" />
								</button>
							</div>
							<p class="mt-1 text-sm text-blue-700 dark:text-blue-300">
								Snippets are reusable text templates with optional <code
									class="rounded bg-blue-100 px-1 font-mono text-xs dark:bg-blue-900"
									>{'{{'}VARIABLE{'}}'}</code
								>
								placeholders. Use them to quickly insert common prompts, greetings, or formatted text
								into your prompts.
							</p>
						</div>
					</div>
				</div>
			{:else}
				<button
					type="button"
					onclick={() => (showInfoBox = true)}
					class="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
				>
					<ChevronDown class="h-4 w-4" />
					Show info
				</button>
			{/if}

			<!-- Search and Category Filter -->
			<div class="flex flex-wrap items-center gap-3">
				<div class="relative min-w-[200px] flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search snippets..."
						bind:value={searchQuery}
						oninput={debouncedSearch}
						class="pl-9"
					/>
				</div>
			</div>

			<!-- Category Filter Buttons -->
			{#if categories.length > 0}
				<div class="flex flex-wrap items-center gap-2">
					<span class="text-sm text-muted-foreground">Filter:</span>
					<button
						class="rounded-full px-3 py-1 text-xs transition-colors {!selectedCategoryId
							? 'bg-primary text-primary-foreground'
							: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
						onclick={() => selectCategory(null)}
					>
						All
					</button>
					{#each categories as category}
						<button
							class="rounded-full px-3 py-1 text-xs capitalize transition-colors {selectedCategoryId ===
							category.id
								? 'bg-primary text-primary-foreground'
								: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
							onclick={() => selectCategory(category.id)}
						>
							{category.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Snippets List -->
		{#if isLoading}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each Array(6) as _}
					<div class="h-64 animate-pulse rounded-lg border bg-muted"></div>
				{/each}
			</div>
		{:else if snippets.length > 0}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{#each snippets as snippet (snippet.id)}
					<SnippetCard
						{snippet}
						onclick={() => goto(`/snippets/${snippet.id}`)}
						onedit={handleEdit}
						ondelete={handleDelete}
					/>
				{/each}
			</div>
		{:else if data.totalCount === 0}
			<div class="flex flex-1 flex-col items-center justify-center py-16 text-center">
				<div class="mb-6 rounded-full bg-muted p-6">
					<Code class="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-xl font-semibold">No snippets yet</h3>
				<p class="mb-6 max-w-sm text-muted-foreground">
					Start building your snippet library by creating your first reusable template fragment.
				</p>
				<Button onclick={handleCreate}>
					<Plus class="mr-2 h-4 w-4" />
					Create Your First Snippet
				</Button>
			</div>
		{:else}
			<div class="flex flex-1 flex-col items-center justify-center py-16 text-center">
				<div class="mb-6 rounded-full bg-muted p-6">
					<Search class="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-xl font-semibold">No snippets found</h3>
				<p class="mb-6 max-w-sm text-muted-foreground">
					No snippets match your search criteria. Try adjusting your filters.
				</p>
				<Button variant="outline" onclick={clearFilters}>Clear Filters</Button>
			</div>
		{/if}
	</div>

	<!-- Sidebar -->
	<div class="w-64 shrink-0 space-y-6">
		<!-- Stats -->
		<div class="space-y-3 border-t pt-6">
			<h3 class="font-medium">Statistics</h3>
			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-muted-foreground">Total snippets</span>
					<span class="font-medium">{data.totalCount}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-muted-foreground">Categories</span>
					<span class="font-medium">{categories.length}</span>
				</div>
			</div>
		</div>

		<!-- Clear Filters -->
		{#if searchQuery || selectedCategoryId}
			<Button variant="outline" class="w-full" onclick={clearFilters}>Clear Filters</Button>
		{/if}
	</div>
</div>

<!-- Inline Delete Confirmation -->
{#if showDeleteConfirm && snippetToDelete}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Delete Snippet</h3>
				<button onclick={cancelDelete} class="rounded p-1 hover:bg-muted">
					<X class="h-4 w-4" />
				</button>
			</div>
			<p class="mb-6 text-sm text-muted-foreground">
				Are you sure you want to delete "{snippetToDelete.title}"? This action cannot be undone.
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={cancelDelete}>Cancel</Button>
				<Button variant="destructive" onclick={confirmDelete}>Delete</Button>
			</div>
		</div>
	</div>
{/if}
