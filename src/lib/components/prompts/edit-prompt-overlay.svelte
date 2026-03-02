<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { SnippetPicker } from '$lib/components/snippets';
	import { usePromptEdit } from '$lib/composables/usePromptEdit.svelte';
	import { X } from 'lucide-svelte';
	import {
		PromptContentEditor,
		VersionControlSection,
		EditPromptSidebar,
		VariantSelectionModal
	} from '../../../routes/prompts/[id]/edit/_components';

	interface Props {
		prompt: {
			id: number;
			title: string;
			description?: string | null;
			purpose?: string | null;
			tags?: string[];
		} & Record<string, unknown>;
		currentVersion?:
			| ({
					id: number;
					content: string;
					version: string | number;
					changeType: string;
					changeNotes?: string | null;
					frontmatterYaml?: string | null;
			  } & Record<string, unknown>)
			| null;
		onclose: () => void;
		onsaved?: () => void;
	}

	let { prompt, currentVersion, onclose, onsaved }: Props = $props();

	// Create controller with composable
	const controller = usePromptEdit({
		data: {
			prompt,
			currentVersion
		},
		onSaveSuccess: () => {
			onsaved?.();
			onclose();
		},
		onCancel: onclose
	});

	// Lifecycle: mount and setup
	onMount(() => {
		return controller.mount();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
		controller.handleKeydown(e);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Overlay Header -->
<div class="flex items-center justify-between border-b p-4">
	<div>
		<h2 class="text-lg font-semibold">Edit: {prompt.title}</h2>
		<p class="text-sm text-muted-foreground">Update prompt content and metadata</p>
	</div>
	<Button variant="ghost" size="icon" onclick={onclose} aria-label="Close">
		<X class="h-5 w-5" />
	</Button>
</div>

<!-- Error Message -->
{#if controller.errorMessage}
	<div
		class="mx-4 mt-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
	>
		{controller.errorMessage}
	</div>
{/if}

<!-- Main Content -->
<div class="flex-1 overflow-auto p-4">
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Main Editor Area -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Prompt Content -->
			<PromptContentEditor {controller} />

			<!-- Version Control -->
			<VersionControlSection {controller} />
		</div>

		<!-- Sidebar -->
		<EditPromptSidebar {controller} data={{ prompt, currentVersion }} />
	</div>
</div>

<!-- Footer with Save/Cancel -->
<div class="flex items-center justify-between border-t bg-muted/30 p-4">
	<div class="flex items-center gap-2 text-sm text-muted-foreground">
		{#if controller.isDirty}
			<span class="text-amber-500">Unsaved changes</span>
		{:else}
			<span>No changes</span>
		{/if}
	</div>
	<div class="flex items-center gap-2">
		<Button variant="outline" onclick={onclose} disabled={controller.saving}>Cancel</Button>
		<Button
			onclick={controller.handleSave}
			loading={controller.saving}
			disabled={controller.saving || !controller.isDirty}
		>
			Save Changes
		</Button>
	</div>
</div>

<!-- Variant Selection Modal -->
<VariantSelectionModal {controller} />

<!-- Snippet Picker -->
<SnippetPicker
	open={controller.showSnippetPicker}
	onclose={() => (controller.showSnippetPicker = false)}
	onselect={controller.handleSnippetSelect}
/>
