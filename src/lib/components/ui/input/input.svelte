<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		value = $bindable(''),
		type = 'text',
		error,
		...restProps
	} = $props<{
		class?: string;
		value?: any;
		type?: string;
		error?: boolean;
		[key: string]: any;
	}>();
</script>

<input
	class={cn(
		'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		error && 'border-destructive focus-visible:ring-destructive',
		className
	)}
	{type}
	bind:value
	{...restProps}
/>
