<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import PromptCard from '$lib/components/prompts/prompt-card.svelte';
	import PromptTable from '$lib/components/prompts/prompt-table.svelte';
	import {
		LayoutGrid,
		Table,
		Search,
		Plus,
		Trash2,
		CheckSquare,
		X,
		FileText,
		FolderOpen
	} from 'lucide-svelte';
	import type { Prompt } from '$lib/stores/prompts.svelte';
	import PromptCardSkeleton from '$lib/components/prompts/prompt-card-skeleton.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// View state
	let viewMode: 'grid' | 'table' = $state('grid');
	let searchQuery: string = $state($page.url.searchParams.get('search') || '');
	let isLoading: boolean = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	let selectedTags: string[] = $state([]);
	let selectedPurpose: string = $state($page.url.searchParams.get('purpose') || '');
	let sortField: string = $state($page.url.searchParams.get('sort') || 'updatedAt');
	let sortDirection: 'asc' | 'desc' = $state(
		($page.url.searchParams.get('direction') as 'asc' | 'desc') || 'desc'
	);

	// Bulk actions state
	let isBulkMode: boolean = $state(false);
	let selectedPromptIds: Set<number> = $state(new Set());

	// Confirmation state
	let showDeleteConfirm: boolean = $state(false);
	let showBulkDeleteConfirm: boolean = $state(false);
	let promptToDelete: Prompt | null = $state(null);

	// Derived values
	let allTags: string[] = $derived(data.allTags || []);
	let prompts: Prompt[] = $derived(data.prompts || []);
	let filteredPrompts: Prompt[] = $derived(filterPrompts(prompts));

	function filterPrompts(prompts: Prompt[]): Prompt[] {
		let result = [...prompts];

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(p) =>
					p.title.toLowerCase().includes(query) ||
					(p.description || '').toLowerCase().includes(query)
			);
		}

		// Apply tag filter
		if (selectedTags.length > 0) {
			result = result.filter((p) => selectedTags.some((tag) => p.tags?.includes(tag)));
		}

		// Apply purpose filter
		if (selectedPurpose) {
			result = result.filter((p) => p.purpose === selectedPurpose);
		}

		// Apply sorting
		result.sort((a, b) => {
			let comparison = 0;
			switch (sortField) {
				case 'title':
					comparison = a.title.localeCompare(b.title);
					break;
				case 'updatedAt':
					comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
					break;
				case 'createdAt':
					comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
					break;
			}
			return sortDirection === 'asc' ? comparison : -comparison;
		});

		return result;
	}

	function updateUrl() {
		const url = new URL(window.location.href);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');
		if (selectedPurpose) url.searchParams.set('purpose', selectedPurpose);
		else url.searchParams.delete('purpose');
		url.searchParams.set('sort', sortField);
		url.searchParams.set('direction', sortDirection);
		isLoading = true;
		goto(url.toString(), { replaceState: true, invalidateAll: true }).finally(() => {
			isLoading = false;
		});
	}

	function debouncedSearch() {
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(updateUrl, 300);
	}

	// Toggle tag selection
	function toggleTag(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter((t) => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	// Clear all filters
	function clearFilters() {
		searchQuery = '';
		selectedTags = [];
		selectedPurpose = '';
		sortField = 'updatedAt';
		sortDirection = 'desc';
		const url = new URL(window.location.href);
		url.searchParams.delete('search');
		url.searchParams.delete('purpose');
		url.searchParams.delete('sort');
		url.searchParams.delete('direction');
		goto(url.toString(), { replaceState: true, invalidateAll: true });
	}

	// Bulk mode
	function toggleBulkMode() {
		isBulkMode = !isBulkMode;
		selectedPromptIds = new Set();
	}

	function toggleSelectAll() {
		if (selectedPromptIds.size === filteredPrompts.length) {
			selectedPromptIds = new Set();
		} else {
			selectedPromptIds = new Set(filteredPrompts.map((p) => p.id));
		}
	}

	function togglePromptSelection(promptId: number) {
		const newSet = new Set(selectedPromptIds);
		if (newSet.has(promptId)) {
			newSet.delete(promptId);
		} else {
			newSet.add(promptId);
		}
		selectedPromptIds = newSet;
	}

	// CRUD handlers
	function handleCreate() {
		goto('/prompts/new');
	}

	function handleEdit(prompt: Prompt) {
		goto(`/prompts/${prompt.id}/edit`);
	}

	function handleDelete(prompt: Prompt) {
		promptToDelete = prompt;
		showDeleteConfirm = true;
	}

	async function confirmDelete() {
		if (!promptToDelete) return;

		try {
			const response = await fetch(`/api/prompts/${promptToDelete.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				await invalidate('prompts:list');
				showDeleteConfirm = false;
				promptToDelete = null;
			} else {
				console.error('Failed to delete prompt:', await response.text());
				alert('Failed to delete prompt');
			}
		} catch (error) {
			console.error('Error deleting prompt:', error);
			alert('Error deleting prompt');
		}
	}

	function cancelDelete() {
		showDeleteConfirm = false;
		promptToDelete = null;
	}

	function handleDuplicate(prompt: Prompt) {
		goto(`/prompts/new?duplicate=${prompt.id}`);
	}

	async function handleBulkDelete() {
		if (selectedPromptIds.size === 0) return;

		try {
			const response = await fetch('/api/prompts/bulk-delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ids: Array.from(selectedPromptIds) })
			});

			if (response.ok) {
				selectedPromptIds = new Set();
				showBulkDeleteConfirm = false;
				await invalidate('prompts:list');
			} else {
				console.error('Failed to delete prompts:', await response.text());
				alert('Failed to delete prompts');
			}
		} catch (error) {
			console.error('Error deleting prompts:', error);
			alert('Error deleting prompts');
		}
	}

	function cancelBulkDelete() {
		showBulkDeleteConfirm = false;
	}
</script>

<svelte:head>
	<title>Prompts - Prompt Wallet</title>
</svelte:head>

<div class="flex h-full gap-6 p-6">
	<!-- Main Content -->
	<div class="flex min-w-0 flex-1 flex-col">
		<!-- Header -->
		<div class="mb-6 flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl font-semibold">Prompts</h1>
				<div class="flex gap-2">
					<Button variant="outline" onclick={toggleBulkMode}>
						<CheckSquare class="mr-2 h-4 w-4" />
						{isBulkMode ? 'Done' : 'Bulk Select'}
					</Button>
					{#if isBulkMode && selectedPromptIds.size > 0}
						<Button variant="destructive" onclick={() => (showBulkDeleteConfirm = true)}>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete ({selectedPromptIds.size})
						</Button>
					{/if}
					<Button onclick={handleCreate}>
						<Plus class="mr-2 h-4 w-4" />
						Create Prompt
					</Button>
				</div>
			</div>

			<!-- Search and Controls -->
			<div class="flex flex-wrap items-center gap-3">
				<div class="relative min-w-[200px] flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search prompts..."
						bind:value={searchQuery}
						oninput={debouncedSearch}
						class="pl-9"
					/>
				</div>
				<div class="flex items-center gap-2">
					<Button
						variant={viewMode === 'grid' ? 'default' : 'outline'}
						size="icon"
						onclick={() => (viewMode = 'grid')}
					>
						<LayoutGrid class="h-4 w-4" />
					</Button>
					<Button
						variant={viewMode === 'table' ? 'default' : 'outline'}
						size="icon"
						onclick={() => (viewMode = 'table')}
					>
						<Table class="h-4 w-4" />
					</Button>
				</div>
			</div>

			<!-- Bulk Action Bar -->
			{#if isBulkMode}
				<div class="flex items-center gap-2 rounded-lg border bg-muted p-3">
					<input
						type="checkbox"
						checked={selectedPromptIds.size === filteredPrompts.length &&
							filteredPrompts.length > 0}
						onchange={toggleSelectAll}
						class="h-4 w-4"
					/>
					<span class="text-sm font-medium">
						{selectedPromptIds.size === filteredPrompts.length && filteredPrompts.length > 0
							? 'Deselect All'
							: `Select All (${filteredPrompts.length})`}
					</span>
					<span class="ml-auto text-sm text-muted-foreground">
						{selectedPromptIds.size} selected
					</span>
				</div>
			{/if}
		</div>

		<!-- Prompts List -->
		{#if isLoading}
			{#if viewMode === 'grid'}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<PromptCardSkeleton count={6} />
				</div>
			{:else}
				<div class="rounded-lg border">
					<div class="animate-pulse divide-y">
						{#each Array(6) as _}
							<div class="flex h-16 items-center gap-4 px-4">
								<div class="h-4 w-4 rounded bg-muted"></div>
								<div class="h-4 w-1/4 rounded bg-muted"></div>
								<div class="h-4 w-1/3 rounded bg-muted"></div>
								<div class="ml-auto h-4 w-20 rounded bg-muted"></div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{:else if filteredPrompts.length > 0}
			{#if viewMode === 'grid'}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{#each filteredPrompts as prompt (prompt.id)}
						<PromptCard
							{prompt}
							selectable={isBulkMode}
							selected={selectedPromptIds.has(prompt.id)}
							onclick={() => goto(`/prompts/${prompt.id}`)}
							onselect={() => togglePromptSelection(prompt.id)}
							onedit={handleEdit}
							ondelete={handleDelete}
							onduplicate={handleDuplicate}
						/>
					{/each}
				</div>
			{:else}
				<PromptTable
					prompts={filteredPrompts}
					{isBulkMode}
					{selectedPromptIds}
					onToggleSelection={togglePromptSelection}
					onedit={handleEdit}
					ondelete={handleDelete}
					onduplicate={handleDuplicate}
				/>
			{/if}
		{:else if prompts.length === 0}
			<div class="flex flex-1 flex-col items-center justify-center py-16 text-center">
				<div class="mb-6 rounded-full bg-muted p-6">
					<FolderOpen class="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-xl font-semibold">No prompts yet</h3>
				<p class="mb-6 max-w-sm text-muted-foreground">
					Start building your prompt library by creating your first prompt.
				</p>
				<Button onclick={handleCreate}>
					<Plus class="mr-2 h-4 w-4" />
					Create Your First Prompt
				</Button>
			</div>
		{:else}
			<div class="flex flex-1 flex-col items-center justify-center py-16 text-center">
				<div class="mb-6 rounded-full bg-muted p-6">
					<Search class="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-xl font-semibold">No prompts found</h3>
				<p class="mb-6 max-w-sm text-muted-foreground">
					No prompts match your search criteria. Try adjusting your filters.
				</p>
				<Button variant="outline" onclick={clearFilters}>Clear Filters</Button>
			</div>
		{/if}
	</div>

	<!-- Sidebar -->
	<div class="w-64 shrink-0 space-y-6">
		<!-- Sort -->
		<div class="space-y-3">
			<h3 class="font-medium">Sort By</h3>
			<div class="space-y-2">
				<select
					bind:value={sortField}
					onchange={updateUrl}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					<option value="updatedAt">Updated</option>
					<option value="createdAt">Created</option>
					<option value="title">Title</option>
				</select>
				<div class="flex gap-2">
					<Button
						variant={sortDirection === 'asc' ? 'default' : 'outline'}
						size="sm"
						class="flex-1"
						onclick={() => {
							sortDirection = 'asc';
							updateUrl();
						}}
					>
						Asc
					</Button>
					<Button
						variant={sortDirection === 'desc' ? 'default' : 'outline'}
						size="sm"
						class="flex-1"
						onclick={() => {
							sortDirection = 'desc';
							updateUrl();
						}}
					>
						Desc
					</Button>
				</div>
			</div>
		</div>

		<!-- Purpose Filter -->
		<div class="space-y-3">
			<h3 class="font-medium">Purpose</h3>
			<select
				bind:value={selectedPurpose}
				onchange={updateUrl}
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
			>
				<option value="">All purposes</option>
				<option value="development">Development</option>
				<option value="writing">Writing</option>
				<option value="analysis">Analysis</option>
				<option value="creative">Creative</option>
			</select>
		</div>

		<!-- Tags Filter -->
		{#if allTags.length > 0}
			<div class="space-y-3">
				<h3 class="font-medium">Tags</h3>
				<div class="flex flex-wrap gap-2">
					{#each allTags as tag}
						<button
							class="rounded-full px-3 py-1 text-xs transition-colors {selectedTags.includes(tag)
								? 'bg-primary text-primary-foreground'
								: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
							onclick={() => {
								toggleTag(tag);
								updateUrl();
							}}
						>
							{tag}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Clear Filters -->
		<Button variant="outline" class="w-full" onclick={clearFilters}>Clear Filters</Button>

		<!-- Quick Actions -->
		<div class="space-y-3 border-t pt-6">
			<h3 class="font-medium">Quick Actions</h3>
			<div class="space-y-2">
				<Button variant="outline" class="w-full justify-start" onclick={handleCreate}>
					<Plus class="mr-2 h-4 w-4" />
					New Prompt
				</Button>
				<Button variant="outline" class="w-full justify-start" onclick={toggleBulkMode}>
					<CheckSquare class="mr-2 h-4 w-4" />
					Bulk Select
				</Button>
			</div>
		</div>
	</div>
</div>

<!-- Inline Delete Confirmation -->
{#if showDeleteConfirm && promptToDelete}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Delete Prompt</h3>
				<button onclick={cancelDelete} class="rounded p-1 hover:bg-muted">
					<X class="h-4 w-4" />
				</button>
			</div>
			<p class="mb-6 text-sm text-muted-foreground">
				Are you sure you want to delete "{promptToDelete.title}"? This action cannot be undone.
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={cancelDelete}>Cancel</Button>
				<Button variant="destructive" onclick={confirmDelete}>Delete</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Inline Bulk Delete Confirmation -->
{#if showBulkDeleteConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Delete Multiple Prompts</h3>
				<button onclick={cancelBulkDelete} class="rounded p-1 hover:bg-muted">
					<X class="h-4 w-4" />
				</button>
			</div>
			<p class="mb-6 text-sm text-muted-foreground">
				Are you sure you want to delete {selectedPromptIds.size} prompts? This action cannot be undone.
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={cancelBulkDelete}>Cancel</Button>
				<Button variant="destructive" onclick={handleBulkDelete}>Delete All</Button>
			</div>
		</div>
	</div>
{/if}
