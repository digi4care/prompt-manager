<script lang="ts">
	import type { SnippetCategory, SnippetTag } from '$lib/server/db/schema';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { showSuccess, showError } from '$lib/stores/toast';
	import { Save, Loader2 } from 'lucide-svelte';

	export interface SnippetFormData {
		title: string;
		description?: string;
		content: string;
		categoryId?: number;
		tagIds: number[];
	}

	interface Props {
		/** Initial data for edit mode */
		initialData?: {
			title: string;
			description?: string | null;
			content: string;
			categoryId?: number | null;
			tagIds?: number[];
		};
		/** Submit handler - should throw on error, return new data on success */
		onSubmit: (data: SnippetFormData) => Promise<SnippetFormData | void>;
		/** Whether in edit mode */
		isEditMode?: boolean;
		/** Available categories */
		categories: SnippetCategory[];
		/** Available tags */
		tags: SnippetTag[];
		/** Callback when save succeeds (receives updated data) */
		onsuccess?: (data: SnippetFormData) => void;
		/** Callback when cancel clicked */
		oncancel?: () => void;
	}

	let {
		initialData,
		onSubmit,
		isEditMode = false,
		categories,
		tags,
		onsuccess,
		oncancel
	}: Props = $props();

	// Form state
	let title = $state(initialData?.title || '');
	let description = $state(initialData?.description || '');
	let content = $state(initialData?.content || '');
	let categoryId = $state(initialData?.categoryId?.toString() || '');
	let selectedTagIds = $state<number[]>(initialData?.tagIds || []);
	let isSaving = $state(false);
	let titleError = $state<string | null>(null);
	let formError = $state<string | null>(null);

	// Change detection - compare current form state to initial
	let hasChanges = $derived(() => {
		const current = JSON.stringify({
			title,
			description,
			content,
			categoryId,
			tagIds: [...selectedTagIds].sort()
		});
		const initial = JSON.stringify({
			title: initialData?.title || '',
			description: initialData?.description || '',
			content: initialData?.content || '',
			categoryId: initialData?.categoryId?.toString() || '',
			tagIds: [...(initialData?.tagIds || [])].sort()
		});
		return current !== initial;
	});

	// Validate title on blur
	function validateTitle() {
		if (!title.trim()) {
			titleError = 'Title is required';
		} else {
			titleError = null;
		}
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

		// Validate
		validateTitle();
		if (!title.trim()) {
			return;
		}

		isSaving = true;
		formError = null;

		try {
			const formData: SnippetFormData = {
				title: title.trim(),
				description: description.trim() || undefined,
				content: content.trim(),
				categoryId: categoryId ? parseInt(categoryId) : undefined,
				tagIds: selectedTagIds
			};

			const result = await onSubmit(formData);
			showSuccess(isEditMode ? 'Snippet updated!' : 'Snippet created!');

			// Update initial data to reset hasChanges
			if (result) {
				initialData = {
					title: result.title,
					description: result.description,
					content: result.content,
					categoryId: result.categoryId,
					tagIds: result.tagIds
				};
				// Update local state too
				title = result.title;
				description = result.description || '';
				content = result.content;
				categoryId = result.categoryId?.toString() || '';
				selectedTagIds = result.tagIds;
			}

			onsuccess?.(formData);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to save snippet';
			formError = errorMessage;
			showError(errorMessage);
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		oncancel?.();
	}
</script>

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
			onblur={validateTitle}
			placeholder="Enter snippet title"
			class="max-w-xl"
			disabled={isSaving}
			required
		/>
		{#if titleError}
			<p class="text-sm text-destructive">{titleError}</p>
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
			disabled={isSaving}
		/>
	</div>

	<!-- Content -->
	<div class="space-y-2">
		<label for="content" class="text-sm font-medium">
			Content <span class="text-destructive">*</span>
		</label>
		<p class="text-xs text-muted-foreground">
			Use {'{{'}VARIABLE_NAME{'}}'} for placeholders that will be replaced at runtime
		</p>
		<textarea
			id="content"
			name="content"
			bind:value={content}
			placeholder="Enter snippet content with {'{{'}VARIABLES{'}}'}..."
			rows="12"
			class="flex min-h-[200px] w-full max-w-2xl rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			disabled={isSaving}
			required
		></textarea>
	</div>

	<!-- Category -->
	<div class="space-y-2">
		<label for="categoryId" class="text-sm font-medium">Category</label>
		<select
			id="categoryId"
			name="categoryId"
			bind:value={categoryId}
			class="flex h-10 max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			disabled={isSaving}
		>
			<option value="">Select a category</option>
			{#each categories as category}
				<option value={category.id}>{category.name}</option>
			{/each}
		</select>
	</div>

	<!-- Tags -->
	<div class="space-y-2">
		<label class="text-sm font-medium">Tags</label>
		<div class="flex flex-wrap gap-2">
			{#each tags as tag}
				<label
					class="inline-flex cursor-pointer items-center gap-1.5 {isSaving
						? 'cursor-not-allowed opacity-50'
						: ''}"
				>
					<input
						type="checkbox"
						name="tagIds"
						value={tag.id}
						checked={selectedTagIds.includes(tag.id)}
						onchange={() => toggleTag(tag.id)}
						class="rounded border-input"
						disabled={isSaving}
					/>
					<span class="text-sm">{tag.name}</span>
				</label>
			{/each}
		</div>
		<p class="text-xs text-muted-foreground">Select one or more tags</p>
	</div>

	<!-- Form-level errors -->
	{#if formError}
		<div class="rounded-md bg-destructive/10 p-3">
			<p class="text-sm text-destructive">{formError}</p>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex items-center gap-3 pt-4">
		<Button type="submit" disabled={!hasChanges() || isSaving}>
			{#if isSaving}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Saving...
			{:else}
				<Save class="mr-2 h-4 w-4" />
				{isEditMode ? 'Update Snippet' : 'Create Snippet'}
			{/if}
		</Button>
		<Button type="button" variant="outline" onclick={handleCancel} disabled={isSaving}
			>Cancel</Button
		>
	</div>
</form>
