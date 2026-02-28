<script lang="ts">
	import type { PageData } from './$types';
	import type { SnippetWithTags } from '$lib/server/services/snippets.service';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { extractVariables } from '$lib/utils/snippet-variables';
	import { dateFormatStore } from '$lib/stores/date-format.svelte';
	import { formatDateString } from '$lib/utils/date';
	import { ArrowLeft, Pencil, Trash2, Copy, Check, Code, Tag, Clock, X } from 'lucide-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let snippet: SnippetWithTags = $derived(data.snippet);

	// State
	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);
	let copySuccess = $state(false);

	// Extract variables from content
	let variables = $derived(extractVariables(snippet.content));
	let variableCount = $derived(variables.length);

	// Format dates
	let createdDate = $derived(
		snippet.createdAt
			? formatDateString(new Date(snippet.createdAt), dateFormatStore.format)
			: 'Unknown'
	);
	let updatedDate = $derived(
		snippet.updatedAt
			? formatDateString(new Date(snippet.updatedAt), dateFormatStore.format)
			: 'Unknown'
	);

	function handleEdit() {
		goto(`/snippets/${snippet.id}/edit`);
	}

	function handleBack() {
		goto('/snippets');
	}

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(snippet.content);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function handleDelete() {
		showDeleteConfirm = true;
	}

	function cancelDelete() {
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
				goto('/snippets');
			} else {
				console.error('Failed to delete snippet:', await response.text());
				alert('Failed to delete snippet');
			}
		} catch (error) {
			console.error('Error deleting snippet:', error);
			alert('Error deleting snippet');
		} finally {
			isDeleting = false;
			showDeleteConfirm = false;
		}
	}
</script>

<svelte:head>
	<title>{snippet.title} - Snippets - Prompt Wallet</title>
</svelte:head>

<div class="flex h-full flex-col p-6">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="ghost" size="icon" onclick={handleBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<h1 class="text-2xl font-semibold">{snippet.title}</h1>
				{#if snippet.description}
					<p class="text-sm text-muted-foreground">{snippet.description}</p>
				{/if}
			</div>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={handleCopy}>
				{#if copySuccess}
					<Check class="mr-2 h-4 w-4" />
					Copied!
				{:else}
					<Copy class="mr-2 h-4 w-4" />
					Copy
				{/if}
			</Button>
			<Button variant="outline" onclick={handleEdit}>
				<Pencil class="mr-2 h-4 w-4" />
				Edit
			</Button>
			<Button variant="destructive" onclick={handleDelete}>
				<Trash2 class="mr-2 h-4 w-4" />
				Delete
			</Button>
		</div>
	</div>

	<!-- Content -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main content -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Content block -->
			<div class="rounded-lg border bg-card">
				<div class="border-b px-4 py-3">
					<h2 class="font-medium">Content</h2>
				</div>
				<div class="p-4">
					<pre
						class="max-h-[500px] overflow-auto rounded bg-muted p-4 text-sm whitespace-pre-wrap">{snippet.content}</pre>
				</div>
			</div>

			<!-- Variables block -->
			{#if variableCount > 0}
				<div class="rounded-lg border bg-card">
					<div class="border-b px-4 py-3">
						<div class="flex items-center gap-2">
							<Code class="h-4 w-4" />
							<h2 class="font-medium">Variables ({variableCount})</h2>
						</div>
					</div>
					<div class="p-4">
						<div class="flex flex-wrap gap-2">
							{#each variables as variable}
								<span
									class="inline-flex items-center rounded bg-secondary px-2 py-1 font-mono text-xs text-secondary-foreground"
								>
									{variable.name}
								</span>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Metadata -->
			<div class="rounded-lg border bg-card">
				<div class="border-b px-4 py-3">
					<h2 class="font-medium">Details</h2>
				</div>
				<div class="space-y-4 p-4">
					{#if snippet.categoryName}
						<div>
							<label class="text-xs text-muted-foreground">Category</label>
							<p class="font-medium capitalize">{snippet.categoryName}</p>
						</div>
					{/if}

					<div>
						<label class="text-xs text-muted-foreground">Created</label>
						<p class="flex items-center gap-1 text-sm">
							<Clock class="h-3.5 w-3.5" />
							{createdDate}
						</p>
					</div>

					<div>
						<label class="text-xs text-muted-foreground">Updated</label>
						<p class="flex items-center gap-1 text-sm">
							<Clock class="h-3.5 w-3.5" />
							{updatedDate}
						</p>
					</div>
				</div>
			</div>

			<!-- Tags -->
			{#if snippet.tagsList && snippet.tagsList.length > 0}
				<div class="rounded-lg border bg-card">
					<div class="border-b px-4 py-3">
						<div class="flex items-center gap-2">
							<Tag class="h-4 w-4" />
							<h2 class="font-medium">Tags</h2>
						</div>
					</div>
					<div class="p-4">
						<div class="flex flex-wrap gap-2">
							{#each snippet.tagsList as tag}
								<span
									class="inline-flex items-center rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground"
								>
									{tag}
								</span>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
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
