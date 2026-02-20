<script lang="ts">
	import { cn } from '$lib/utils';

	let {
		class: className = '',
		variant = 'default',
		children,
		...restProps
	} = $props<{
		class?: string;
		variant?: 'default' | 'bordered' | 'elevated' | 'interactive' | 'selectable';
		children?: any;
		[key: string]: any;
	}>();

	const variantStyles: Record<string, string> = {
		default: 'border bg-card text-card-foreground shadow-sm',
		bordered: 'border-2 border-border bg-card text-card-foreground',
		elevated: 'border bg-card text-card-foreground shadow-lg',
		interactive:
			'border bg-card text-card-foreground shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		selectable:
			'border bg-card text-card-foreground shadow-sm cursor-pointer transition-all duration-200 ring-2 ring-transparent hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 selected:ring-primary selected:border-primary'
	};
</script>

<div
	class={cn('rounded-lg', variantStyles[variant] || variantStyles.default, className)}
	{...restProps}
>
	{@render children?.()}
</div>
