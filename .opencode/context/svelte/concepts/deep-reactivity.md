<!-- Context: svelte/concepts | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Concept: Deep Reactivity

**Purpose**: Automatic tracking of nested object/array mutations.
**Last Updated**: 2026-02-12

---

## Core Concept

Objects and arrays in `$state` become reactive proxies. Mutations are tracked automatically - no reassignment needed like `arr = [...arr, item]`.

---

## Key Points

- Proxies track mutations: `arr.push(item)` works directly
- Nested objects are also reactive
- Classes can use runes: `class Foo { x = $state(0) }`
- Shared state: `.svelte.js` / `.svelte.ts` files for cross-module state
- Reactive proxies available: URL, Map, Set, Date from `svelte/reactivity`

---

## Quick Example

```svelte
<script>
	let todos = $state([{ id: 1, text: 'Task', done: false }]);

	function toggle(id) {
		todos.find((t) => t.id === id).done = !todos.find((t) => t.id === id).done;
	}

	function add(text) {
		todos.push({ id: Date.now(), text, done: false });
	}
</script>
```

---

## Classes with Runes

```ts
// Counter.svelte.ts
export class Counter {
	count = $state(0);

	increment() {
		this.count++;
	}

	get doubled() {
		return this.count * 2;
	}
}
```

---

## Shared State Across Modules

```ts
// store.svelte.ts
export const session = $state({
	user: null,
	authenticated: false
});

// Any component can import and mutate
import { session } from './store.svelte.ts';
session.user = { name: 'John' }; // Reactive everywhere
```

---

## Reference

- Official: https://svelte.dev/docs/svelte/$state#Deep-reactivity
- Related: [runes.md](runes.md)
