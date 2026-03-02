<script lang="ts">
	import { TestRunnerPanel } from '$lib/components/prompts';
	import { FlaskConical, ChevronUp, ChevronDown } from 'lucide-svelte';
	import type { PromptEditController } from '$lib/composables/usePromptEdit.svelte';

	interface Props {
		controller: PromptEditController;
		promptId: number;
	}

	let { controller, promptId }: Props = $props();
</script>

<section id="test-runner-section" class="rounded-lg border bg-card p-4">
	<button
		type="button"
		onclick={() => (controller.showTestRunner = !controller.showTestRunner)}
		class="flex w-full items-center justify-between text-left"
	>
		<div class="flex items-center gap-2">
			<FlaskConical class="h-4 w-4 text-muted-foreground" />
			<h2 class="font-semibold">Test Runner</h2>
		</div>
		{#if controller.showTestRunner}
			<ChevronUp class="h-4 w-4 text-muted-foreground" />
		{:else}
			<ChevronDown class="h-4 w-4 text-muted-foreground" />
		{/if}
	</button>

	{#if controller.showTestRunner}
		<div class="mt-4">
			<TestRunnerPanel
				{promptId}
				template={controller.content}
				variables={controller.snippetVariables}
				functionType="executor"
			/>
		</div>
	{/if}
</section>
