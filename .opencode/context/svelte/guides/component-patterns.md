<!-- Context: svelte/guides | Priority: critical | Version: 1.0 | Updated: 2026-02-12 -->

# Guide: Svelte 5 Component Patterns

**Purpose**: Best practices for Svelte 5 components.
**Last Updated**: 2026-02-12

---

## Core Concept

Use runes for state, TypeScript for props, keep components focused on one responsibility. Follow consistent patterns.

---

## Component Template

```svelte
<script>
	// 1. Props interface
	interface Props {
		value: string;
		placeholder?: string;
		onchange?: (value: string) => void;
	}

	// 2. Destructure props
	let { value = $bindable(''), placeholder = 'Enter text...', onchange }: Props = $props();

	// 3. Local state
	let focused = $state(false);

	// 4. Derived values
	let hasValue = $derived(value.length > 0);

	// 5. Effects
	$effect(() => {
		if (focused) console.log('Input focused');
	});
</script>

<!-- Template -->
<input
	type="text"
	bind:value
	{placeholder}
	class={cn('rounded-md border px-3 py-2', focused && 'ring-2 ring-primary')}
	onfocus={() => (focused = true)}
	onblur={() => (focused = false)}
/>

<!-- Styles -->
<style>
	/* Component-specific styles only */
</style>
```

---

## Key Patterns

### Optional Callbacks

```svelte
<script>
	interface Props {
		onsave?: (data: FormData) => void;
	}
	let { onsave }: Props = $props();
</script>

<button onclick={() => onsave?.(formData)}> Save </button>
```

### Event Handlers (lowercase)

```svelte
<!-- ✅ Correct: lowercase in template -->
<button onclick={handleClick}>Click</button>
<input onkeydown={handleKey} />

<!-- ❌ Wrong: camelCase (only in script) -->
<button onClick={handleClick}>Click</button>
```

### Styling with cn()

```svelte
<script>
	import { cn } from '$lib/utils';
	interface Props {
		variant?: 'default' | 'destructive';
	}
	let { variant = 'default' }: Props = $props();
</script>

<button
	class={cn(
		'rounded-md px-4 py-2',
		variant === 'destructive' && 'bg-red-500 text-white',
		variant === 'default' && 'bg-primary text-primary-foreground'
	)}
>
	<slot />
</button>
```

---

## Component Structure

1. Props interface at top
2. Destructure with $props()
3. Local state with $state()
4. Derived with $derived()
5. Effects with $effect()
6. Template
7. Styles (if needed)

---

## Reference

- Related: [runes.md](../concepts/runes.md), [props.md](../concepts/props.md)
