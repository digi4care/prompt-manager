<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { SnippetForm } from '$lib/components/snippets';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import type { SnippetFormData } from '$lib/components/snippets/snippet-form.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	async function handleSubmit(formData: SnippetFormData): Promise<SnippetFormData> {
		const response = await fetch('/api/snippets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(formData)
		});

		if (!response.ok) {
			if (response.status === 409) {
				throw new Error('A snippet with this title already exists');
			}
			const error = await response.text();
			throw new Error(error || 'Failed to create snippet');
		}

		const snippet = await response.json();
		// Navigate to the new snippet after a short delay
		setTimeout(() => goto(`/snippets/${snippet.id}`), 500);
		return formData;
	}

	function handleSuccess(formData: SnippetFormData) {
		// Navigation is handled in handleSubmit
	}

	function handleCancel() {
		goto('/snippets');
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
		<SnippetForm
			onSubmit={handleSubmit}
			onsuccess={handleSuccess}
			oncancel={handleCancel}
			isEditMode={false}
			categories={data.categories}
			tags={data.tags}
		/>
	</div>
</div>
