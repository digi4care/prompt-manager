<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Sparkles, ChevronUp, ChevronDown } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { PromptEditController } from '$lib/composables/usePromptEdit.svelte';

	interface Props {
		controller: PromptEditController;
	}

	let { controller }: Props = $props();
</script>

<section id="version-info-section" class="rounded-lg border bg-card p-4">
	<h2 class="mb-1 font-semibold">Version Information</h2>
	<p class="mb-4 text-xs text-muted-foreground">Describe what changed in this version</p>

	<!-- Change Type Selector -->
	<div id="change-type" class="mb-4">
		<p class="mb-2 block text-sm font-medium">Change Type</p>
		<div class="grid grid-cols-3 gap-2">
			<button
				type="button"
				class={cn(
					'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
					controller.changeType === 'patch'
						? 'border-primary bg-primary text-primary-foreground'
						: 'bg-background hover:bg-muted'
				)}
				onclick={() => (controller.changeType = 'patch')}
			>
				Patch
				<span class="block text-xs opacity-70">Bug fixes</span>
			</button>
			<button
				type="button"
				class={cn(
					'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
					controller.changeType === 'minor'
						? 'border-primary bg-primary text-primary-foreground'
						: 'bg-background hover:bg-muted'
				)}
				onclick={() => (controller.changeType = 'minor')}
			>
				Minor
				<span class="block text-xs opacity-70">New features</span>
			</button>
			<button
				type="button"
				class={cn(
					'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
					controller.changeType === 'major'
						? 'border-primary bg-primary text-primary-foreground'
						: 'bg-background hover:bg-muted'
				)}
				onclick={() => (controller.changeType = 'major')}
			>
				Major
				<span class="block text-xs opacity-70">Breaking changes</span>
			</button>
		</div>
	</div>

	<!-- Change Notes with AI button -->
	<div>
		<div class="mb-2 flex items-center justify-between">
			<p id="change-notes-label" class="text-sm font-medium">
				Change Notes
				{#if controller.contentChangeSignificance() === 'significant'}
					<span class="ml-1 text-destructive">*</span>
				{/if}
			</p>
			<button
				type="button"
				onclick={controller.handleGenerateChangeNotes}
				disabled={controller.isGeneratingChangeNotes || !controller.content}
				class="text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
				title="Generate change notes with AI"
			>
				<Sparkles size={14} class={controller.isGeneratingChangeNotes ? 'animate-spin' : ''} />
			</button>
		</div>
		<textarea
			id="change-notes-textarea"
			aria-labelledby="change-notes-label"
			bind:value={controller.changeNotes}
			placeholder={controller.contentChangeSignificance() === 'none'
				? 'Optional: Add notes about metadata changes...'
				: controller.contentChangeSignificance() === 'significant'
					? 'Describe what you changed and why...'
					: 'Optional: Add notes (e.g., "fixed typo")'}
			class={cn(
				'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
				'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
				controller.changeNotesError && 'border-destructive'
			)}
			disabled={controller.saving}
		></textarea>
		{#if controller.changeNotesError}
			<p class="mt-1 text-xs text-destructive">{controller.changeNotesError}</p>
		{/if}
	</div>
</section>
