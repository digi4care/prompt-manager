<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		value?: number;
		max?: number;
		class?: string;
	}

	let { value = 0, max = 100, class: className = '' }: Props = $props();

	// Calculate percentage (clamped between 0 and 100)
	let percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div
	class={cn(
		'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
		className
	)}
	role="progressbar"
	aria-valuenow={value}
	aria-valuemin={0}
	aria-valuemax={max}
	aria-label="Progress"
>
	<div
		class="h-full bg-primary transition-all duration-300 ease-in-out"
		style="width: {percentage}%"
	></div>
</div>
