<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeft, Save } from 'lucide-svelte';

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

	// Form state
	let title = $state('');
	let description = $state('');
	let content = $state('');
	let categoryId = $state('');
	let tagIds = $state('');
	let isSubmitting = $state(false);
	let errors = $state<FormErrors | null>(null);

	// Handle form errors from server
	$effect(() => {
		if (data.errors) {
			errors = data.errors as FormErrors;
		}
		if (data.values) {
			title = (data.values.title as string) || '';
			description = (data.values.description as string) || '';
			content = (data.values.content as string) || '';
			categoryId = (data.values.categoryId as string) || '';
			tagIds = (data.values.tagIds as string) || '';
		}
	});

	function handleCancel() {
		goto('/snippets');
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;
		errors = null;

		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);

		try {
			const response = await fetch('/snippets/new', {
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
			console.error('Failed to create snippet:', error);
			alert('Failed to create snippet');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>New Snippet - Prompt Wallet</title>
</svelte:head>

<div class="flex h-full flex-col p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleCancel}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-2xl font-semibold">New Snippet</h1>
			<p class="text-sm text-muted-foreground">Create a reusable template fragment</p>
		</div>
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
							<input type="checkbox" name="tagIds" value={tag.id} class="rounded border-input" />
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
					{isSubmitting ? 'Creating...' : 'Create Snippet'}
				</Button>
				<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
			</div>
		</form>
	</div>
</div>
