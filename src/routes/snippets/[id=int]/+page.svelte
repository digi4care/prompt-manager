<script lang="ts">
	import type { PageData } from './$types';
	import type { SnippetWithTags } from '$lib/server/services/snippets.service';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { extractVariables } from '$lib/utils/snippet-variables';
	import { dateFormatStore } from '$lib/stores/date-format.svelte';
	import { formatDateString } from '$lib/utils/date';
	import { showSuccess, showError } from '$lib/stores/toast';
	import {
		ArrowLeft,
		Pencil,
		Trash2,
		Copy,
		Check,
		Code,
		Tag,
		Clock,
		Info,
		ListOrdered
	} from 'lucide-svelte';

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
			showSuccess('Content copied to clipboard');
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
			showError('Failed to copy to clipboard');
		}
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
				showSuccess('Snippet deleted successfully');
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
			<Button variant="destructive" onclick={openDeleteConfirm}>
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
			<!-- How to use this snippet -->
			<div
				class="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
			>
				<div class="border-b border-blue-200 px-4 py-3 dark:border-blue-800">
					<div class="flex items-center gap-2">
						<Info class="h-4 w-4 text-blue-600 dark:text-blue-400" />
						<h2 class="font-medium text-blue-900 dark:text-blue-100">How to use</h2>
					</div>
				</div>
				<div class="p-4">
					<ol class="list-inside list-decimal space-y-2 text-sm text-blue-700 dark:text-blue-300">
						<li>Click <strong>Copy</strong> to copy the content</li>
						<li>Paste it into any prompt</li>
						<li>
							Replace <code class="rounded bg-blue-100 px-1 font-mono text-xs dark:bg-blue-900"
								>{'{{'}VARIABLE{'}}'}</code
							>
							with your values
						</li>
					</ol>
					{#if variableCount > 0}
						<p class="mt-3 text-xs text-blue-600 dark:text-blue-400">
							This snippet has {variableCount} variable{variableCount > 1 ? 's' : ''}:
							{#each variables as variable, i}
								<code class="rounded bg-blue-100 px-1 font-mono dark:bg-blue-900"
									>{'{{'}{variable.name}{'}}'}</code
								>{i < variables.length - 1 ? ', ' : ''}
							{/each}
						</p>
					{/if}
				</div>
			</div>

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
