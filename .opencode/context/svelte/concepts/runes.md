<!-- Context: svelte/concepts | Priority: critical | Version: 1.0 | Updated: 2026-02-12 -->

# Concept: Svelte 5 Runes

**Purpose**: Reactivity system in Svelte 5 using compiler instructions.
**Last Updated**: 2026-02-12

---

## Core Concept

Runes are compiler instructions that tell Svelte how to handle reactivity. They replace the old reactive declarations ($:, reactive stores) with explicit, fine-grained reactivity.

---

## Key Points

- `$state(initial)` - Mutable reactive state
- `$derived(expr)` - Computed values, no side effects
- `$effect(fn)` - Side effects (DOM, fetch, timers). Returns cleanup fn.
- `$props()` - Component props interface
- Runes auto-track dependencies - no dependency arrays needed

---

## Quick Example

```svelte
<script>
	let count = $state(0);
	let doubled = $derived(count * 2);

	$effect(() => {
		console.log('Count changed:', count);
		return () => console.log('Cleanup');
	});
</script>

<button onclick={() => count++}>{count}</button><p>Doubled: {doubled}</p>
```

---

## Rules

1. **$state**: Use for values that change
2. **$derived**: Use for computed values (no side effects)
3. **$effect**: Use for side effects only (DOM, fetch, subscriptions)
4. Don't use $effect to derive state - use $derived instead

---

## Common Mistakes

```svelte
<!-- ❌ WRONG: Effect to derive state -->
$effect(() => { doubled = count * 2; });

<!-- ✅ CORRECT: Derived for computed values -->
let doubled = $derived(count * 2);
```

---

## Reference

- Official: https://svelte.dev/docs/svelte/$state
- Related: [deep-reactivity.md](deep-reactivity.md), [props.md](props.md)
