<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		title,
		children,
		defaultOpen = false,
		class: className = ''
	}: {
		title: string;
		children: import('svelte').Snippet;
		defaultOpen?: boolean;
		class?: string;
	} = $props();

	let isOpen = $state(false);

	$effect(() => {
		if (!isOpen && defaultOpen) {
			isOpen = true;
		}
	});

	function toggle() {
		isOpen = !isOpen;
	}
</script>

<div class={cn('collapsible', className)}>
	<button
		type="button"
		class="flex w-full items-center justify-between rounded px-4 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
		onclick={toggle}
		aria-expanded={isOpen}
	>
		<span>{title}</span>
		<span class={cn('transform transition-transform', isOpen ? 'rotate-90' : 'rotate-0')}>▶</span>
	</button>

	{#if isOpen}
		<div class="mt-2 px-4 pb-2">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.collapsible button {
		user-select: none;
	}
</style>
