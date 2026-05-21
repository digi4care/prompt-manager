<script lang="ts">
	import type { PageData } from './$types';
	import type { SnippetWithTags } from '$lib/server/services/snippets.service';
	import { goto } from '$app/navigation';
	import { SnippetForm } from '$lib/components/snippets';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Trash2 } from 'lucide-svelte';
	import { showSuccess, showError } from '$lib/stores/toast';
	import type { SnippetFormData } from '$lib/components/snippets/snippet-form.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let snippet: SnippetWithTags = $derived(data.snippet);

	// Delete confirmation state
	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);

	// Initial form data from snippet
	let initialFormData = $derived({
		title: snippet.title,
		description: snippet.description,
		content: snippet.content,
		categoryId: snippet.categoryId,
		tagIds: data.tags
			.filter((t: { name: string; id: number }) => snippet.tagsList.includes(t.name))
			.map((t: { id: number }) => t.id)
	});

	async function handleSubmit(formData: SnippetFormData): Promise<SnippetFormData> {
		const response = await fetch(`/api/snippets/${snippet.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(formData)
		});

		if (!response.ok) {
			if (response.status === 409) {
				throw new Error('A snippet with this title already exists');
			}
			const error = await response.text();
			throw new Error(error || 'Failed to update snippet');
		}

		return formData;
	}

	function handleSuccess(formData: SnippetFormData) {
		// Stay on page, show toast already handled by SnippetForm
		// Update the snippet reference for reactivity
	}

	function handleCancel() {
		goto(`/snippets/${snippet.id}`);
	}

	function openDeleteConfirm() {
		showDeleteConfirm = true;
	}

	function closeDeleteConfirm() {
		showDeleteConfirm = false;
	}

	async function confirmDelete() {
		isDeleting = true;
		try {
			const response = await fetch(`/api/snippets/${snippet.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' }
			});

			if (response.ok) {
				showSuccess('Snippet deleted');
				goto('/snippets');
			} else {
				const error = await response.text();
				showError(error || 'Failed to delete snippet');
			}
		} catch (error) {
			console.error('Error deleting snippet:', error);
			showError('Error deleting snippet');
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
		<Button variant="destructive" onclick={openDeleteConfirm}>
			<Trash2 class="mr-2 h-4 w-4" />
			Delete
		</Button>
	</div>

	<!-- Form -->
	<div class="mx-auto w-full max-w-3xl">
		<SnippetForm
			initialData={initialFormData}
			onSubmit={handleSubmit}
			onsuccess={handleSuccess}
			oncancel={handleCancel}
			isEditMode={true}
			categories={data.categories}
			tags={data.tags}
		/>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<ConfirmDialog
	title="Delete Snippet"
	message="Are you sure you want to delete '{snippet.title}'? This action cannot be undone."
	open={showDeleteConfirm}
	confirmText={isDeleting ? 'Deleting...' : 'Delete'}
	loading={isDeleting}
	onconfirm={confirmDelete}
	oncancel={closeDeleteConfirm}
/>
