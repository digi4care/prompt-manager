<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { SnippetPicker } from '$lib/components/snippets';
	import { usePromptEdit } from '$lib/composables/usePromptEdit.svelte';
	import { PromptExecutor } from '$lib/components/prompts';
	import {
		EditPromptHeader,
		PromptContentEditor,
		VersionControlSection,
		EditPromptSidebar,
		VariantSelectionModal
	} from './_components';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Create controller with composable
	const controller = usePromptEdit({
		data: {
			prompt: data.prompt,
			currentVersion: data.currentVersion
		},
		onSaveSuccess: () => goto(`/prompts/${data.prompt.id}`),
		onCancel: () => goto(`/prompts/${data.prompt.id}`)
	});

	// Lifecycle: mount and setup unsaved changes warning
	onMount(() => {
		return controller.mount();
	});
</script>

<svelte:window onkeydown={controller.handleKeydown} />

<svelte:head>
	<title>Edit: {data.prompt.title} | Prompt Management</title>
	<meta name="description" content="Edit {data.prompt.title}" />
</svelte:head>

<div id="edit-prompt-page-section" class="space-y-6">
	<!-- Page Header -->
	<EditPromptHeader {controller} promptId={data.prompt.id} promptTitle={data.prompt.title} />

	<!-- Error Message -->
	{#if controller.errorMessage}
		<div
			class="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive"
		>
			{controller.errorMessage}
		</div>
	{/if}

	<!-- Main Content -->
	<div id="edit-prompt-layout" class="grid gap-6 lg:grid-cols-3">
		<!-- Main Editor Area (spans full width on mobile, 2 cols on desktop) -->
		<div id="edit-prompt-main-content" class="space-y-6 lg:col-span-2">
			<!-- Prompt Content with Improve Button -->
			<PromptContentEditor {controller} />

			<!-- Test Runner Section -->
			<PromptExecutor promptId={data.prompt.id} template={controller.content} />

			<!-- Version Control -->
			<VersionControlSection {controller} />
		</div>

		<!-- Sidebar -->
		<EditPromptSidebar
			{controller}
			data={{ prompt: data.prompt, currentVersion: data.currentVersion }}
		/>
	</div>

	<!-- Form dirty indicator -->
	{#if controller.isDirty && !controller.saving}
		<div class="fixed right-4 bottom-4 text-sm text-muted-foreground">
			Press <kbd class="rounded border bg-background px-2 py-0.5 text-xs">⌘S</kbd> to save
		</div>
	{/if}
</div>

<!-- Variant Selection Modal -->
<VariantSelectionModal {controller} />

<!-- Snippet Picker -->
<SnippetPicker
	open={controller.showSnippetPicker}
	onclose={() => (controller.showSnippetPicker = false)}
	onselect={controller.handleSnippetSelect}
/>
