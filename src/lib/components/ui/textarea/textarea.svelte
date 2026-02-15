<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		value = $bindable(),
		placeholder,
		error,
		rows = 3,
		disabled,
		required,
		...restProps
	} = $props<{
		class?: string;
		value?: any;
		placeholder?: string;
		error?: boolean;
		rows?: number;
		disabled?: boolean;
		required?: boolean;
		[key: string]: any;
	}>();
</script>

<textarea
	class={cn(
		'flex min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
		error && 'border-destructive focus-visible:ring-destructive',
		className
	)}
	{placeholder}
	{rows}
	{disabled}
	{required}
	bind:value
	{...restProps}
></textarea>
