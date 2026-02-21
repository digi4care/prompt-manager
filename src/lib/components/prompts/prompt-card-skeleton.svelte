<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		count?: number;
	}

	let { count = 1 }: Props = $props();
</script>

{#each Array(count) as _, i}
	<div class={cn('flex h-[220px] flex-col rounded-lg border bg-card p-4', 'animate-pulse')}>
		<div class="mb-3 flex items-start justify-between">
			<div class="h-5 w-3/4 rounded bg-muted"></div>
			<div class="h-8 w-8 rounded bg-muted"></div>
		</div>
		<div class="mb-4 space-y-2">
			<div class="h-4 w-full rounded bg-muted"></div>
			<div class="h-4 w-5/6 rounded bg-muted"></div>
		</div>
		<div class="mb-3 flex gap-2">
			<div class="h-5 w-16 rounded-full bg-muted"></div>
			<div class="h-5 w-20 rounded-full bg-muted"></div>
		</div>
		<div class="mt-auto flex items-center justify-between">
			<div class="h-3 w-24 rounded bg-muted"></div>
			<div class="h-3 w-20 rounded bg-muted"></div>
		</div>
	</div>
{/each}
