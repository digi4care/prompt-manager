<script lang="ts">
	import type { PageData } from './$types';
	import type { SnippetWithTags } from '$lib/server/services/snippets.service';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeft, Save, Trash2, X } from 'lucide-svelte';

	interface FormErrors {
		formErrors?: string[];
		fieldErrors: {
			title?: string[];
			description?: string[];
			content?: string[];
			categoryId?: string[];
			tagIds?: string[];
		};
	}

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let snippet: SnippetWithTags = $derived(data.snippet);

	// Form state
	let title = $state(snippet.title);
	let description = $state(snippet.description || '');
	let content = $state(snippet.content);
	let categoryId = $state(snippet.categoryId?.toString() || '');
	let selectedTagIds = $state<number[]>(snippet.tagsList.map(() => 0)); // Will be populated from tags
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let showDeleteConfirm = $state(false);
	let errors = $state<FormErrors | null>(null);

	// Initialize selected tag IDs from data
	$effect(() => {
		const tagNames = snippet.tagsList;
		const tagIds = data.tags
			.filter((t: { name: string }) => tagNames.includes(t.name))
			.map((t: { id: number }) => t.id);
		selectedTagIds = tagIds;
	});

	// Handle form errors from server
	$effect(() => {
		if (data.errors) {
			errors = data.errors as FormErrors;
		}
		if (data.values) {
			title = (data.values.title as string) || title;
			description = (data.values.description as string) || description;
			content = (data.values.content as string) || content;
			categoryId = (data.values.categoryId as string) || categoryId;
		}
	});

	function handleCancel() {
		goto(`/snippets/${snippet.id}`);
	}

	function toggleTag(tagId: number) {
		if (selectedTagIds.includes(tagId)) {
			selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
		} else {
			selectedTagIds = [...selectedTagIds, tagId];
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;
		errors = null;

		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);

		// Add selected tag IDs
		selectedTagIds.forEach((tagId) => {
			formData.append('tagIds', tagId.toString());
		});

		try {
			const response = await fetch(`/snippets/${snippet.id}/edit`, {
				method: 'POST',
				body: formData
			});

			if (response.redirected) {
				goto(response.url);
			} else if (!response.ok) {
				const result = await response.json();
				if (result.errors) {
					errors = result.errors;
				}
			}
		} catch (error) {
			console.error('Failed to update snippet:', error);
			alert('Failed to update snippet');
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		showDeleteConfirm = true;
	}

	function cancelDelete() {
		showDeleteConfirm = false;
	}

	async function confirmDelete() {
		isDeleting = true;
		try {
			const formData = new FormData();
			formData.append('_action', 'delete');

			const response = await fetch(`/snippets/${snippet.id}/edit?/delete`, {
				method: 'POST',
				body: formData
			});

			if (response.redirected) {
				goto(response.url);
			}
		} catch (error) {
			console.error('Failed to delete snippet:', error);
			alert('Failed to delete snippet');
		} finally {
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}
</script>

<svelte:head>
	<title>Edit Snippet - Prompt Wallet</title>
</svelte:head>

<div class="flex h-full flex-col p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={handleCancel}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-2xl font-semibold">Edit Snippet</h1>
				<p class="text-sm text-muted-foreground">Update snippet content and settings</p>
			</div>
		</div>
		<Button variant="destructive" onclick={handleDelete}>
			<Trash2 class="mr-2 h-4 w-4" />
			Delete
		</Button>
	</div>

	<!-- Form -->
	<div class="mx-auto w-full max-w-3xl">
		<form onsubmit={handleSubmit} class="space-y-6">
			<!-- Title -->
			<div class="space-y-2">
				<label for="title" class="text-sm font-medium">
					Title <span class="text-destructive">*</span>
				</label>
				<Input
					id="title"
					name="title"
					bind:value={title}
					placeholder="Enter snippet title"
					class="max-w-xl"
					required
				/>
				{#if errors?.fieldErrors?.title}
					<p class="text-sm text-destructive">{errors.fieldErrors.title?.join(', ')}</p>
				{/if}
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<label for="description" class="text-sm font-medium">Description</label>
				<Input
					id="description"
					name="description"
					bind:value={description}
					placeholder="Brief description of this snippet"
					class="max-w-xl"
				/>
				{#if errors?.fieldErrors?.description}
					<p class="text-sm text-destructive">{errors.fieldErrors.description?.join(', ')}</p>
				{/if}
			</div>

			<!-- Content -->
			<div class="space-y-2">
				<label for="content" class="text-sm font-medium">
					Content <span class="text-destructive">*</span>
				</label>
				<p class="text-xs text-muted-foreground">
					Use {'{{'}VARIABLE_NAME{'}'} } for placeholders that will be replaced at runtime
				</p>
				<textarea
					id="content"
					name="content"
					bind:value={content}
					placeholder="Enter snippet content with {'{{'}VARIABLES{'}}'}..."
					rows="12"
					class="flex min-h-[200px] w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					required
				></textarea>
				{#if errors?.fieldErrors?.content}
					<p class="text-sm text-destructive">{errors.fieldErrors.content?.join(', ')}</p>
				{/if}
			</div>

			<!-- Category -->
			<div class="space-y-2">
				<label for="categoryId" class="text-sm font-medium">Category</label>
				<select
					id="categoryId"
					name="categoryId"
					bind:value={categoryId}
					class="flex h-10 max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					<option value="">Select a category</option>
					{#each data.categories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
				{#if errors?.fieldErrors?.categoryId}
					<p class="text-sm text-destructive">{errors.fieldErrors.categoryId?.join(', ')}</p>
				{/if}
			</div>

			<!-- Tags -->
			<div class="space-y-2">
				<label class="text-sm font-medium">Tags</label>
				<div class="flex flex-wrap gap-2">
					{#each data.tags as tag}
						<label class="inline-flex items-center gap-1.5">
							<input
								type="checkbox"
								name="tagIds"
								value={tag.id}
								checked={selectedTagIds.includes(tag.id)}
								onchange={() => toggleTag(tag.id)}
								class="rounded border-input"
							/>
							<span class="text-sm">{tag.name}</span>
						</label>
					{/each}
				</div>
				<p class="text-xs text-muted-foreground">Select one or more tags</p>
				{#if errors?.fieldErrors?.tagIds}
					<p class="text-sm text-destructive">{errors.fieldErrors.tagIds?.join(', ')}</p>
				{/if}
			</div>

			<!-- Form-level errors -->
			{#if errors?.formErrors && errors.formErrors.length > 0}
				<div class="rounded-md bg-destructive/10 p-3">
					{#each errors.formErrors as error}
						<p class="text-sm text-destructive">{error}</p>
					{/each}
				</div>
			{/if}

			<!-- Actions -->
			<div class="flex items-center gap-3 pt-4">
				<Button type="submit" disabled={isSubmitting}>
					<Save class="mr-2 h-4 w-4" />
					{isSubmitting ? 'Saving...' : 'Save Changes'}
				</Button>
				<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
			</div>
		</form>
	</div>
</div>

<!-- Delete Confirmation -->
{#if showDeleteConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-semibold">Delete Snippet</h3>
				<button onclick={cancelDelete} class="rounded p-1 hover:bg-muted">
					<X class="h-4 w-4" />
				</button>
			</div>
			<p class="mb-6 text-sm text-muted-foreground">
				Are you sure you want to delete "{snippet.title}"? This action cannot be undone.
			</p>
			<div class="flex justify-end gap-2">
				<Button variant="outline" onclick={cancelDelete} disabled={isDeleting}>Cancel</Button>
				<Button variant="destructive" onclick={confirmDelete} disabled={isDeleting}>
					{isDeleting ? 'Deleting...' : 'Delete'}
				</Button>
			</div>
		</div>
	</div>
{/if}
