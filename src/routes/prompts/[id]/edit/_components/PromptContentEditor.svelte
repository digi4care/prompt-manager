<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { PromptEditor } from '$lib/components/prompts';
	import { Sparkles, ClipboardPaste } from 'lucide-svelte';
	import type { PromptEditController } from '$lib/composables/usePromptEdit.svelte';

	interface Props {
		controller: PromptEditController;
	}

	let { controller }: Props = $props();
</script>

<section id="edit-prompt-content-editor" class="rounded-lg border bg-card p-4">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h2 class="font-semibold">Prompt Content</h2>
			<p class="text-xs text-muted-foreground">Edit directly or use AI to improve</p>
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				onclick={() => (controller.showSnippetPicker = true)}
				class="gap-1.5"
			>
				<ClipboardPaste size={14} />
				Insert Snippet
			</Button>
			<Button
				variant="outline"
				size="sm"
				onclick={controller.handleImprove}
				disabled={controller.isImproving}
				class="gap-1.5"
			>
				<Sparkles size={14} />
				{controller.isImproving ? 'Improving...' : 'Improve'}
			</Button>
		</div>
	</div>

	{#if controller.improvementError}
		<div
			class="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
		>
			{controller.improvementError}
		</div>
	{/if}

	<PromptEditor
		value={controller.content}
		onchange={(v) => (controller.content = v)}
		placeholder="Enter your prompt here..."
		class="w-full"
		insertText={controller.snippetInsertText}
		onInsertComplete={controller.handleSnippetInsertComplete}
	/>
	{#if controller.contentError}
		<p class="mt-2 text-xs text-destructive">{controller.contentError}</p>
	{/if}
</section>
