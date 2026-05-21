<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { PromptMetadata, PromptFunctionSettings } from '$lib/components/prompts';
	import { Sparkles, Keyboard } from 'lucide-svelte';
	import type { PromptEditController } from '$lib/composables/usePromptEdit.svelte';
	import type { PromptEditData } from '$lib/composables/usePromptEdit.svelte';

	interface Props {
		controller: PromptEditController;
		data: PromptEditData;
	}

	let { controller, data }: Props = $props();

	// Local state for two-way binding with PromptMetadata fields
	// Note: These capture initial values - updates sync via $effect below
	let localTitle = $state(controller.title);
	let localPurpose = $state(controller.purpose);
	let localTags = $state<string[]>([...controller.tags]);
	let tagInput = $state('');

	// Sync local state back to controller
	$effect(() => {
		controller.title = localTitle;
	});
	$effect(() => {
		controller.purpose = localPurpose;
	});
	$effect(() => {
		controller.tags = localTags;
	});

	function addTag() {
		const trimmed = tagInput.trim();
		if (trimmed && !localTags.includes(trimmed)) {
			localTags = [...localTags, trimmed];
			tagInput = '';
		}
	}

	function removeTag(tag: string) {
		localTags = localTags.filter((t) => t !== tag);
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		}
	}

	function handleDescriptionChange(e: Event) {
		const target = e.currentTarget as HTMLTextAreaElement;
		controller.description = target.value;
	}
</script>

<aside id="edit-prompt-sidebar" class="space-y-4">
	<!-- Prompt Details -->
	<div id="edit-prompt-metadata-form" class="space-y-4 rounded-lg border bg-card p-4">
		<h2 class="mb-3 text-sm font-semibold">Prompt Details</h2>

		<!-- Title, Purpose, Tags -->
		<PromptMetadata
			bind:title={localTitle}
			bind:purpose={localPurpose}
			bind:tags={localTags}
			showDescription={false}
			errors={{ title: controller.titleError }}
		/>

		<!-- Description with AI button -->
		<div>
			<div class="mb-2 flex items-center justify-between">
				<label for="description" class="text-sm font-medium">Description</label>
				<button
					type="button"
					onclick={controller.handleGenerateDescription}
					disabled={controller.isGeneratingDescription || !controller.content}
					class="text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
					title="Generate description with AI"
				>
					<Sparkles size={14} class={controller.isGeneratingDescription ? 'animate-spin' : ''} />
				</button>
			</div>
			<Textarea
				id="description"
				value={controller.description}
				onchange={handleDescriptionChange}
				placeholder="Enter a brief description of this prompt"
				rows={3}
				class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			/>
			<p class="mt-1 text-xs text-muted-foreground">
				{controller.description.length}/500 characters
			</p>
		</div>
	</div>

	<!-- Current Version Info -->
	<div id="current-version-section" class="rounded-lg border bg-muted/50 p-4">
		<h3 class="mb-3 text-sm font-semibold">Current Version</h3>
		<div class="space-y-2 text-sm">
			<div class="flex justify-between">
				<span class="text-muted-foreground">Version</span>
				<span class="font-medium">v{data.currentVersion?.version || 'N/A'}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-muted-foreground">Type</span>
				<span class="font-medium capitalize">{data.currentVersion?.changeType || 'N/A'}</span>
			</div>
			<div class="flex justify-between">
				<span class="text-muted-foreground">Notes</span>
				<span class="ml-4 line-clamp-2 text-right font-medium">
					{data.currentVersion?.changeNotes || 'N/A'}
				</span>
			</div>
		</div>
	</div>

	<!-- Function Settings Overrides -->
	<PromptFunctionSettings promptId={data.prompt.id} />

	<!-- Tips -->
	<div id="edit-tips-section" class="rounded-lg border bg-muted/50 p-4">
		<h3 class="mb-3 text-sm font-semibold">Tips</h3>
		<div class="flex items-start gap-2 text-sm">
			<Sparkles size={16} class="mt-0.5 text-muted-foreground" />
			<p class="text-muted-foreground">
				Use Version Notes for meaningful changes. Cmd+S saves from anywhere.
			</p>
		</div>
	</div>

	<!-- Keyboard Shortcuts -->
	<div id="edit-keyboard-shortcuts-section" class="rounded-lg border bg-muted/50 p-4">
		<h3 class="mb-3 flex items-center gap-2 text-sm font-semibold">
			<Keyboard class="h-4 w-4 text-muted-foreground" />
			Shortcuts
		</h3>
		<div id="edit-shortcuts-list" class="space-y-2 text-sm">
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground">Save</span>
				<kbd class="rounded border bg-background px-2 py-0.5 text-xs">⌘S</kbd>
			</div>
			<div class="flex items-center justify-between">
				<span class="text-muted-foreground">Cancel</span>
				<kbd class="rounded border bg-background px-2 py-0.5 text-xs">Esc</kbd>
			</div>
		</div>
	</div>
</aside>
