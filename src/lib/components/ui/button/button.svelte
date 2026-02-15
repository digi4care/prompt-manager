<script lang="ts">
	import { cn } from '$lib/utils';

	const props = $props<{
		children?: any;
		class?: string;
		variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		size?: 'default' | 'sm' | 'lg' | 'icon';
		disabled?: boolean;
		loading?: boolean;
		type?: 'button' | 'submit' | 'reset';
		href?: string;
		[key: string]: any;
	}>();

	const baseStyles =
		'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

	const variantStyles: Record<string, string> = {
		default: 'bg-primary text-primary-foreground hover:bg-primary/90',
		destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
		outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
		ghost: 'hover:bg-accent hover:text-accent-foreground',
		link: 'text-primary underline-offset-4 hover:underline'
	};

	const sizeStyles: Record<string, string> = {
		default: 'h-10 px-4 py-2',
		sm: 'h-9 rounded-md px-3',
		lg: 'h-11 rounded-md px-8',
		icon: 'h-10 w-10'
	};

	let buttonClass = $derived(
		cn(
			baseStyles,
			variantStyles[props.variant ?? 'default'] || variantStyles.default,
			sizeStyles[props.size ?? 'default'] || sizeStyles.default,
			props.class ?? ''
		)
	);

	let isDisabled = $derived(!!props.disabled || !!props.loading);
	let buttonType = $derived((props.type ?? 'button') as 'button' | 'submit' | 'reset');
	let href = $derived(props.href);
	let children = $derived(props.children);

	// Note: rest props must remain reactive (e.g. aria-expanded)
	let restProps = $derived.by(() => {
		const {
			children: _children,
			class: _class,
			variant: _variant,
			size: _size,
			disabled: _disabled,
			loading: _loading,
			type: _type,
			href: _href,
			...rest
		} = props;
		return rest;
	});
</script>

{#if href}
	<a
		class={buttonClass}
		href={isDisabled ? undefined : href}
		aria-disabled={isDisabled}
		role={href ? 'link' : undefined}
		tabindex={isDisabled ? -1 : 0}
		{...restProps}
	>
		{#if props.loading}
			<svg
				class="mr-2 h-4 w-4 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{/if}
		{@render children?.()}
	</a>
{:else}
	<button
		class={buttonClass}
		type={buttonType}
		disabled={isDisabled}
		aria-busy={props.loading}
		{...restProps}
	>
		{#if props.loading}
			<svg
				class="mr-2 h-4 w-4 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{/if}
		{@render children?.()}
	</button>
{/if}
