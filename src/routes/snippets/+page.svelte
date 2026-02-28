<script lang="ts">
	import type { PageData } from './$types';
	import type { SnippetWithTags } from '$lib/server/services/snippets.service';
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { SnippetCard } from '$lib/components/snippets';
	import {
		Search,
		Plus,
		X,
		Code,
		Info,
		ChevronDown,
		ChevronUp,
		LayoutGrid,
		List
	} from 'lucide-svelte';
	import { browser } from '$app/environment';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// View mode state with localStorage persistence
	let viewMode = $state<'cards' | 'list'>('cards');

	// Restore view preference from localStorage on mount
	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem('snippets-view-mode');
			if (saved === 'cards' || saved === 'list') {
				viewMode = saved;
			}
		}
	});

	// Persist view preference to localStorage
	function setViewMode(mode: 'cards' | 'list') {
		viewMode = mode;
		if (browser) {
			localStorage.setItem('snippets-view-mode', mode);
		}
	}

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
	let currentPage = $derived(data.page || 1);
	let totalPages = $derived(data.totalPages || 1);
	let hasMore = $derived(data.hasMore || false);

	function updateUrl(resetPage = true) {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (selectedCategoryId) url.searchParams.set('categoryId', String(selectedCategoryId));
		else url.searchParams.delete('categoryId');
		// Reset to page 1 when changing filters
		if (resetPage) url.searchParams.delete('page');
		else if (currentPage > 1) url.searchParams.set('page', String(currentPage));
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
		url.searchParams.delete('page');
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	// Pagination
	function goToPage(page: number) {
		if (page < 1 || page > totalPages) return;
		const url = new URL(window.location.href);
		if (page === 1) url.searchParams.delete('page');
		else url.searchParams.set('page', String(page));
		isLoading = true;
		goto(url.toString(), { replaceState: true, invalidateAll: true }).finally(() => {
			isLoading = false;
		});
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
				<div class="flex items-center gap-3">
					<!-- View Toggle -->
					<div class="flex gap-1 rounded-lg border p-1">
						<button
							class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors {viewMode ===
							'cards'
								? 'bg-primary text-primary-foreground'
								: 'hover:bg-muted'}"
							onclick={() => setViewMode('cards')}
							aria-label="Cards view"
						>
							<LayoutGrid class="h-4 w-4" />
							Cards
						</button>
						<button
							class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors {viewMode ===
							'list'
								? 'bg-primary text-primary-foreground'
								: 'hover:bg-muted'}"
							onclick={() => setViewMode('list')}
							aria-label="List view"
						>
							<List class="h-4 w-4" />
							List
						</button>
					</div>
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
			{#if viewMode === 'cards'}
				<!-- Cards View -->
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
			{:else}
				<!-- List View -->
				<div class="overflow-hidden rounded-lg border">
					<table class="w-full text-sm">
						<thead class="border-b bg-muted/50">
							<tr>
								<th class="px-4 py-3 text-left font-medium">Title</th>
								<th class="px-4 py-3 text-left font-medium">Category</th>
								<th class="px-4 py-3 text-left font-medium">Variables</th>
								<th class="px-4 py-3 text-left font-medium">Tags</th>
								<th class="px-4 py-3 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each snippets as snippet (snippet.id)}
								<tr
									class="cursor-pointer transition-colors hover:bg-muted/50"
									onclick={() => goto(`/snippets/${snippet.id}`)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											goto(`/snippets/${snippet.id}`);
										}
									}}
									role="button"
									tabindex="0"
								>
									<td class="px-4 py-3">
										<div class="font-medium">{snippet.title}</div>
										{#if snippet.description}
											<div class="mt-0.5 truncate text-xs text-muted-foreground">
												{snippet.description}
											</div>
										{/if}
									</td>
									<td class="px-4 py-3">
										{#if snippet.categoryName}
											<span class="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">
												{snippet.categoryName}
											</span>
										{:else}
											<span class="text-muted-foreground">—</span>
										{/if}
									</td>
									<td class="px-4 py-3">
										{#if snippet.variables && Object.keys(snippet.variables).length > 0}
											<span
												class="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
											>
												{Object.keys(snippet.variables).length} vars
											</span>
										{:else}
											<span class="text-muted-foreground">—</span>
										{/if}
									</td>
									<td class="px-4 py-3">
										{#if snippet.tagsList && snippet.tagsList.length > 0}
											<div class="flex flex-wrap gap-1">
												{#each snippet.tagsList.slice(0, 3) as tag}
													<span class="rounded bg-muted px-1.5 py-0.5 text-xs">
														{tag}
													</span>
												{/each}
												{#if snippet.tagsList.length > 3}
													<span class="text-xs text-muted-foreground">
														+{snippet.tagsList.length - 3}
													</span>
												{/if}
											</div>
										{:else}
											<span class="text-muted-foreground">—</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-right">
										<div class="flex justify-end gap-1" onclick={(e) => e.stopPropagation()}>
											<button
												class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
												onclick={() => handleEdit(snippet)}
												aria-label="Edit snippet"
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
													<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
													<path d="m15 5 4 4" />
												</svg>
											</button>
											<button
												class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
												onclick={() => handleDelete(snippet)}
												aria-label="Delete snippet"
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
													<path d="M3 6h18" />
													<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
													<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
												</svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- Pagination Controls -->
			{#if totalPages > 1}
				<div class="mt-6 flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={currentPage === 1}
						onclick={() => goToPage(currentPage - 1)}
					>
						Previous
					</Button>
					<div class="flex items-center gap-1">
						{#each Array(Math.min(5, totalPages)) as _, i}
							{@const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i}
							{@const showPage = pageNum <= totalPages}
							{#if showPage}
								<button
									class="min-w-[2rem] rounded px-2 py-1 text-sm transition-colors {currentPage ===
									pageNum
										? 'bg-primary text-primary-foreground'
										: 'hover:bg-muted'}"
									onclick={() => goToPage(pageNum)}
								>
									{pageNum}
								</button>
							{/if}
						{/each}
						{#if totalPages > 5 && currentPage < totalPages - 2}
							<span class="px-1 text-muted-foreground">...</span>
							<button
								class="min-w-[2rem] rounded px-2 py-1 text-sm transition-colors hover:bg-muted"
								onclick={() => goToPage(totalPages)}
							>
								{totalPages}
							</button>
						{/if}
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={!hasMore}
						onclick={() => goToPage(currentPage + 1)}
					>
						Next
					</Button>
					<span class="ml-2 text-sm text-muted-foreground">
						Page {currentPage} of {totalPages}
					</span>
				</div>
			{/if}
		{:else if !searchQuery && !selectedCategoryId}
			<!-- No snippets at all - truly empty library -->
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
			<!-- No results from filtering - show clear filters option -->
			<div class="flex flex-1 flex-col items-center justify-center py-16 text-center">
				<div class="mb-6 rounded-full bg-muted p-6">
					<Search class="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-xl font-semibold">No snippets match your filter</h3>
				<p class="mb-6 max-w-sm text-muted-foreground">
					No snippets match your search criteria. Try adjusting your filters or create a new
					snippet.
				</p>
				<div class="flex gap-3">
					<Button variant="outline" onclick={clearFilters}>Clear Filters</Button>
					<Button onclick={handleCreate}>
						<Plus class="mr-2 h-4 w-4" />
						Create Snippet
					</Button>
				</div>
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
				{#if totalPages > 1}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Showing</span>
						<span class="font-medium"
							>{(currentPage - 1) * data.perPage + 1}-{Math.min(
								currentPage * data.perPage,
								data.totalCount
							)}</span
						>
					</div>
				{/if}
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
