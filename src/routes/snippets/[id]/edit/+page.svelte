<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeft, Save, Trash2 } from 'lucide-svelte';
	import type { Snippet } from '$lib/server/db/schema';

	interface SnippetWithTags extends Omit<Snippet, 'tags'> {
		tags: string[];
	}

	interface FormErrors {
		title?: { _errors?: string[] };
		description?: { _errors?: string[] };
		content?: { _errors?: string[] };
		category?: { _errors?: string[] };
		tags?: { _errors?: string[] };
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
	let category = $state(snippet.category || '');
	let tags = $state(snippet.tags.join(', '));
	let isSubmitting = $state(false);
	let isDeleting = $state(false);
	let showDeleteConfirm = $state(false);
	let errors = $state<FormErrors | null>(null);

	// Handle form errors from server
	$effect(() => {
		if (data.errors) {
			errors = data.errors as FormErrors;
		}
		if (data.values) {
			title = (data.values.title as string) || title;
			description = (data.values.description as string) || description;
			content = (data.values.content as string) || content;
			category = (data.values.category as string) || category;
			tags = (data.values.tags as string) || tags;
		}
	});

	function handleCancel() {
		goto(`/snippets/${snippet.id}`);
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;
		errors = null;

		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);

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
				{#if errors?.title?._errors}
					<p class="text-sm text-destructive">{errors.title._errors?.join(', ')}</p>
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
				{#if errors?.description?._errors}
					<p class="text-sm text-destructive">{errors.description._errors?.join(', ')}</p>
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
				{#if errors?.content?._errors}
					<p class="text-sm text-destructive">{errors.content._errors?.join(', ')}</p>
				{/if}
			</div>

			<!-- Category -->
			<div class="space-y-2">
				<label for="category" class="text-sm font-medium">Category</label>
				<Input
					id="category"
					name="category"
					bind:value={category}
					placeholder="e.g., greeting, signature, code"
					class="max-w-xs"
				/>
				{#if errors?.category?._errors}
					<p class="text-sm text-destructive">{errors.category._errors?.join(', ')}</p>
				{/if}
			</div>

			<!-- Tags -->
			<div class="space-y-2">
				<label for="tags" class="text-sm font-medium">Tags</label>
				<Input
					id="tags"
					name="tags"
					bind:value={tags}
					placeholder="Comma-separated tags (e.g., email, business)"
					class="max-w-md"
				/>
				<p class="text-xs text-muted-foreground">Separate multiple tags with commas</p>
				{#if errors?.tags?._errors}
					<p class="text-sm text-destructive">{errors.tags._errors?.join(', ')}</p>
				{/if}
			</div>

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
			<div class="mb-4">
				<h3 class="text-lg font-semibold">Delete Snippet</h3>
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
