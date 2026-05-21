<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ChevronRight, Save, CheckCircle2 } from 'lucide-svelte';
	import type { PromptEditController } from '$lib/composables/usePromptEdit.svelte';

	interface Props {
		controller: PromptEditController;
		promptId: number;
		promptTitle: string;
	}

	let { controller, promptId, promptTitle }: Props = $props();
</script>

<header
	id="edit-prompt-header"
	class="sticky top-0 z-10 flex flex-col gap-4 border-b bg-background/95 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:flex-row sm:items-center sm:justify-between"
>
	<div>
		<!-- Breadcrumb -->
		<nav
			id="edit-prompt-breadcrumb"
			class="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground"
		>
			<a href="/prompts" class="transition-colors hover:text-foreground">Prompts</a>
			<ChevronRight size={14} />
			<a href="/prompts/{promptId}" class="transition-colors hover:text-foreground">
				{promptTitle}
			</a>
			<ChevronRight size={14} />
			<span class="font-medium text-foreground">Edit</span>
		</nav>

		<h1 class="text-2xl font-bold tracking-tight">Edit Prompt</h1>
		<p class="mt-1 text-sm text-muted-foreground">Update prompt content and metadata</p>
	</div>
	<div class="flex items-center gap-3">
		<!-- Save Status Indicator -->
		{#if controller.saveStatus === 'saving'}
			<div class="flex items-center gap-1.5 text-sm text-blue-500">
				<div
					class="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
				></div>
				<span>Saving...</span>
			</div>
		{:else if controller.saveStatus === 'unsaved'}
			<div class="flex items-center gap-1.5 text-sm text-amber-500">
				<div class="h-2 w-2 rounded-full bg-amber-500"></div>
				<span>Unsaved changes</span>
			</div>
		{:else if controller.saveStatus === 'saved'}
			<div class="flex items-center gap-1.5 text-sm text-green-500">
				<CheckCircle2 size={14} />
				<span>Saved</span>
			</div>
		{/if}

		<Button
			id="cancel-button"
			variant="outline"
			onclick={controller.handleCancel}
			disabled={controller.saving}
		>
			Cancel
		</Button>
		<Button
			id="save-changes-button"
			onclick={controller.handleSave}
			loading={controller.saving}
			disabled={controller.saving || !controller.isDirty}
			class="gap-2"
		>
			<Save size={16} />
			Save Changes
		</Button>
	</div>
</header>
