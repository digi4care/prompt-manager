<!-- Context: svelte/concepts | Priority: critical | Version: 1.0 | Updated: 2026-02-12 -->

# Concept: Props in Svelte 5

**Purpose**: Component props using $props() rune.
**Last Updated**: 2026-02-12

---

## Core Concept

Use `$props()` rune to receive component props. Destructure with defaults. Supports bindable props with `$bindable()`.

---

## Key Points

- `let { name, age = 18 } = $props()` - Destructure with defaults
- `let { value = $bindable('') } = $props()` - Two-way binding
- `let { x, ...rest } = $props()` - Spread rest props
- TypeScript: Define `interface Props { ... }` for type safety
- Optional callbacks: `onchange?: (value: string) => void`

---

## Quick Example

```svelte
<script>
	interface Props {
		name: string;
		count?: number;
		onchange?: (value: number) => void;
	}

	let { name, count = 0, onchange }: Props = $props();
</script>

<p>{name}: {count}</p>
<button onclick={() => onchange?.(count + 1)}>Increment</button>
```

---

## Bindable Props

```svelte
<!-- Child.svelte -->
<script>
  interface Props {
    value?: string;
  }
  let { value = $bindable('') }: Props = $props();
</script>
<input bind:value />

<!-- Parent.svelte -->
<script>
  import Child from './Child.svelte';
  let text = $state('hello');
</script>
<Child bind:value={text} />
```

---

## Spread Props

```svelte
<script>
	interface Props {
		id: string;
		[key: string]: any;
	}
	let { id, ...rest }: Props = $props();
</script>

<div {id} {...rest}></div>
```

---

## Reference

- Official: https://svelte.dev/docs/svelte/$props
- Related: [runes.md](runes.md), [component-patterns.md](../guides/component-patterns.md)
