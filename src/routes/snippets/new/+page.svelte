<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeft, Save } from 'lucide-svelte';

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

	// Form state
	let title = $state('');
	let description = $state('');
	let content = $state('');
	let category = $state('');
	let tags = $state('');
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
			category = (data.values.category as string) || '';
			tags = (data.values.tags as string) || '';
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
					Use {{ VARIABLE_NAME }} for placeholders that will be replaced at runtime
				</p>
				<textarea
					id="content"
					name="content"
					bind:value={content}
					placeholder="Enter snippet content with {{ VARIABLES }}..."
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
					{isSubmitting ? 'Creating...' : 'Create Snippet'}
				</Button>
				<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
			</div>
		</form>
	</div>
</div>
