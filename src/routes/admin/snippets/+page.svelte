<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { showSuccess, showError } from '$lib/stores/toast';
	import { Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-svelte';

	interface Category {
		id: number;
		name: string;
		description: string | null;
		sortOrder: number;
	}

	interface Tag {
		id: number;
		name: string;
	}

	let { data }: { data: PageData } = $props();

	// State
	let activeTab = $state<'categories' | 'tags'>('categories');
	let categories = $state<Category[]>(data.categories);
	let tags = $state<Tag[]>(data.tags);

	// Category form state
	let newCategoryName = $state('');
	let newCategoryDescription = $state('');
	let newCategorySortOrder = $state(0);
	let isAddingCategory = $state(false);
	let editingCategoryId = $state<number | null>(null);
	let editCategoryName = $state('');
	let editCategoryDescription = $state('');
	let editCategorySortOrder = $state(0);
	let savingCategoryId = $state<number | null>(null);

	// Tag form state
	let newTagName = $state('');
	let isAddingTag = $state(false);
	let savingTagId = $state<number | null>(null);

	// Delete confirmation
	let deleteTarget = $state<{ type: 'category' | 'tag'; id: number; name: string } | null>(null);
	let isDeleting = $state(false);

	// Category CRUD
	async function addCategory() {
		if (!newCategoryName.trim()) return;

		isAddingCategory = true;
		try {
			const response = await fetch('/api/admin/snippet-categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newCategoryName.trim(),
					description: newCategoryDescription.trim() || null,
					sortOrder: newCategorySortOrder
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to create category');
			}

			const newCategory = await response.json();
			categories = [...categories, newCategory].sort(
				(a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
			);
			newCategoryName = '';
			newCategoryDescription = '';
			newCategorySortOrder = 0;
			showSuccess('Category created!');
		} catch (err) {
			showError(err instanceof Error ? err.message : 'Failed to create category');
		} finally {
			isAddingCategory = false;
		}
	}

	function startEditCategory(category: Category) {
		editingCategoryId = category.id;
		editCategoryName = category.name;
		editCategoryDescription = category.description || '';
		editCategorySortOrder = category.sortOrder;
	}

	function cancelEditCategory() {
		editingCategoryId = null;
		editCategoryName = '';
		editCategoryDescription = '';
		editCategorySortOrder = 0;
	}

	async function saveCategory(id: number) {
		if (!editCategoryName.trim()) return;

		savingCategoryId = id;
		try {
			const response = await fetch(`/api/admin/snippet-categories/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editCategoryName.trim(),
					description: editCategoryDescription.trim() || null,
					sortOrder: editCategorySortOrder
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to update category');
			}

			const result = await response.json();
			categories = categories
				.map((c) => (c.id === id ? { ...c, ...result.data } : c))
				.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
			editingCategoryId = null;
			showSuccess('Category updated!');
		} catch (err) {
			showError(err instanceof Error ? err.message : 'Failed to update category');
		} finally {
			savingCategoryId = null;
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;

		isDeleting = true;
		try {
			const response = await fetch(`/api/admin/snippet-${deleteTarget.type}s/${deleteTarget.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || `Failed to delete ${deleteTarget.type}`);
			}

			if (deleteTarget.type === 'category') {
				categories = categories.filter((c) => c.id !== deleteTarget.id);
			} else {
				tags = tags.filter((t) => t.id !== deleteTarget.id);
			}
			showSuccess(
				`${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)} deleted!`
			);
		} catch (err) {
			showError(err instanceof Error ? err.message : `Failed to delete ${deleteTarget?.type}`);
		} finally {
			isDeleting = false;
			deleteTarget = null;
		}
	}

	// Tag CRUD
	async function addTag() {
		if (!newTagName.trim()) return;

		isAddingTag = true;
		try {
			const response = await fetch('/api/admin/snippet-tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newTagName.trim() })
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to create tag');
			}

			const newTag = await response.json();
			tags = [...tags, newTag].sort((a, b) => a.name.localeCompare(b.name));
			newTagName = '';
			showSuccess('Tag created!');
		} catch (err) {
			showError(err instanceof Error ? err.message : 'Failed to create tag');
		} finally {
			isAddingTag = false;
		}
	}
</script>

<svelte:head>
	<title>Snippet Taxonomy - Admin</title>
</svelte:head>

<div class="container mx-auto space-y-6 px-4 py-8">
	<div>
		<h1 class="text-2xl font-bold">Snippet Taxonomy Management</h1>
		<p class="text-muted-foreground">Manage categories and tags for organizing snippets</p>
	</div>

	<!-- Tab Navigation -->
	<div class="flex border-b">
		<button
			type="button"
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'categories'
				? 'border-b-2 border-primary text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = 'categories')}
		>
			Categories ({categories.length})
		</button>
		<button
			type="button"
			class="px-4 py-2 text-sm font-medium transition-colors {activeTab === 'tags'
				? 'border-b-2 border-primary text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => (activeTab = 'tags')}
		>
			Tags ({tags.length})
		</button>
	</div>

	{#if activeTab === 'categories'}
		<!-- Categories Tab -->
		<div class="space-y-6">
			<!-- Add Category Form -->
			<div class="rounded-lg border bg-card p-4">
				<h3 class="mb-3 text-sm font-semibold">Add New Category</h3>
				<div class="grid gap-3 md:grid-cols-4">
					<Input
						placeholder="Category name"
						bind:value={newCategoryName}
						disabled={isAddingCategory}
					/>
					<Input
						placeholder="Description (optional)"
						bind:value={newCategoryDescription}
						disabled={isAddingCategory}
					/>
					<Input
						type="number"
						placeholder="Sort order"
						bind:value={newCategorySortOrder}
						disabled={isAddingCategory}
					/>
					<Button onclick={addCategory} disabled={isAddingCategory || !newCategoryName.trim()}>
						{#if isAddingCategory}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<Plus class="mr-2 h-4 w-4" />
						{/if}
						Add
					</Button>
				</div>
			</div>

			<!-- Categories List -->
			<div class="rounded-lg border bg-card">
				<table class="w-full">
					<thead>
						<tr class="border-b bg-muted/50 text-left text-sm">
							<th class="px-4 py-3">Name</th>
							<th class="px-4 py-3">Description</th>
							<th class="px-4 py-3 text-center">Sort Order</th>
							<th class="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each categories as category (category.id)}
							<tr class="border-b last:border-b-0">
								{#if editingCategoryId === category.id}
									<!-- Edit Mode -->
									<td class="px-4 py-3">
										<Input
											bind:value={editCategoryName}
											disabled={savingCategoryId === category.id}
										/>
									</td>
									<td class="px-4 py-3">
										<Input
											bind:value={editCategoryDescription}
											disabled={savingCategoryId === category.id}
										/>
									</td>
									<td class="px-4 py-3 text-center">
										<Input
											type="number"
											bind:value={editCategorySortOrder}
											disabled={savingCategoryId === category.id}
											class="w-20 text-center"
										/>
									</td>
									<td class="px-4 py-3">
										<div class="flex justify-end gap-2">
											<Button
												size="sm"
												variant="default"
												onclick={() => saveCategory(category.id)}
												disabled={savingCategoryId === category.id}
											>
												{#if savingCategoryId === category.id}
													<Loader2 class="h-4 w-4 animate-spin" />
												{:else}
													<Check class="h-4 w-4" />
												{/if}
											</Button>
											<Button
												size="sm"
												variant="outline"
												onclick={cancelEditCategory}
												disabled={savingCategoryId === category.id}
											>
												<X class="h-4 w-4" />
											</Button>
										</div>
									</td>
								{:else}
									<!-- View Mode -->
									<td class="px-4 py-3 font-medium">{category.name}</td>
									<td class="px-4 py-3 text-muted-foreground">{category.description || '-'}</td>
									<td class="px-4 py-3 text-center">{category.sortOrder}</td>
									<td class="px-4 py-3">
										<div class="flex justify-end gap-2">
											<Button
												size="sm"
												variant="ghost"
												onclick={() => startEditCategory(category)}
												disabled={editingCategoryId !== null}
											>
												<Pencil class="h-4 w-4" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												class="text-destructive hover:text-destructive"
												onclick={() =>
													(deleteTarget = {
														type: 'category',
														id: category.id,
														name: category.name
													})}
												disabled={editingCategoryId !== null}
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										</div>
									</td>
								{/if}
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="px-4 py-8 text-center text-muted-foreground">
									No categories yet. Add one above.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<!-- Tags Tab -->
		<div class="space-y-6">
			<!-- Add Tag Form -->
			<div class="rounded-lg border bg-card p-4">
				<h3 class="mb-3 text-sm font-semibold">Add New Tag</h3>
				<div class="flex gap-3">
					<Input
						placeholder="Tag name"
						bind:value={newTagName}
						disabled={isAddingTag}
						class="max-w-sm flex-1"
					/>
					<Button onclick={addTag} disabled={isAddingTag || !newTagName.trim()}>
						{#if isAddingTag}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<Plus class="mr-2 h-4 w-4" />
						{/if}
						Add
					</Button>
				</div>
			</div>

			<!-- Tags List -->
			<div class="rounded-lg border bg-card">
				<table class="w-full">
					<thead>
						<tr class="border-b bg-muted/50 text-left text-sm">
							<th class="px-4 py-3">Name</th>
							<th class="px-4 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each tags as tag (tag.id)}
							<tr class="border-b last:border-b-0">
								<td class="px-4 py-3 font-medium">{tag.name}</td>
								<td class="px-4 py-3 text-right">
									<Button
										size="sm"
										variant="ghost"
										class="text-destructive hover:text-destructive"
										onclick={() => (deleteTarget = { type: 'tag', id: tag.id, name: tag.name })}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="2" class="px-4 py-8 text-center text-muted-foreground">
									No tags yet. Add one above.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
	title="Delete {deleteTarget?.type === 'category' ? 'Category' : 'Tag'}"
	message={deleteTarget
		? `Are you sure you want to delete "${deleteTarget.name}"? ${
				deleteTarget.type === 'category'
					? 'This action cannot be undone if no snippets are using this category.'
					: 'This will also remove this tag from all snippets.'
			}`
		: ''}
	open={deleteTarget !== null}
	onconfirm={confirmDelete}
	oncancel={() => (deleteTarget = null)}
	confirmText="Delete"
	cancelText="Cancel"
	loading={isDeleting}
/>
