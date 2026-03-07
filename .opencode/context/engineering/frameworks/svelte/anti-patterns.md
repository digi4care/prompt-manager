<!-- Context: development/frameworks/svelte | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Svelte 5 Anti-Patterns

Common mistakes with Svelte 5 runes reactivity system.

---

## $derived Anti-Patterns

### ❌ WRONG: Side effects in $derived

```ts
// ❌ $derived must be PURE - no side effects!
let count = $state(0);
let doubled = $derived(() => {
	console.log('computing'); // Side effect!
	document.title = `Count: ${count}`; // Side effect!
	return count * 2;
});
```

### ✅ RIGHT: Pure computation + separate effect

```ts
let count = $state(0);
let doubled = $derived(count * 2); // Pure

$effect(() => {
	document.title = `Count: ${count}`; // Side effect in $effect
});
```

**Rule**: `$derived` = pure computation only. No mutations, no I/O, no async.

---

### ❌ WRONG: Async in $derived

```ts
// ❌ $derived cannot be async!
let userId = $state(1);
let user = $derived(await fetchUser(userId)); // Doesn't work!
```

### ✅ RIGHT: Use $effect for async

```ts
let userId = $state(1);
let user = $state(null);

$effect(() => {
	const controller = new AbortController();
	fetchUser(userId, controller.signal).then((u) => (user = u));
	return () => controller.abort(); // Cleanup!
});
```

---

## $effect Anti-Patterns

### ❌ WRONG: No cleanup for async

```ts
// ❌ Race condition + memory leak!
$effect(() => {
	fetch('/api/data')
		.then((r) => r.json())
		.then(setData);
});
```

### ✅ RIGHT: Proper cleanup with AbortController

```ts
$effect(() => {
	const controller = new AbortController();
	fetch('/api/data', { signal: controller.signal })
		.then((r) => r.json())
		.then(setData);
	return () => controller.abort(); // Cleanup on re-run/unmount
});
```

---

### ❌ WRONG: Reading $state in async callback

```ts
// ❌ Stale closure problem!
let count = $state(0);

$effect(() => {
	setTimeout(() => {
		console.log(count); // Might be stale!
	}, 1000);
});
```

### ✅ RIGHT: Capture value or use sync

```ts
let count = $state(0);

$effect(() => {
	const currentCount = count; // Capture
	setTimeout(() => {
		console.log(currentCount); // Correct value
	}, 1000);
});
```

---

## $state Anti-Patterns

### ❌ WRONG: Class fields without initializer

```ts
class Counter {
	count = $state(); // ❌ Undefined initial value
}
```

### ✅ RIGHT: Always initialize

```ts
class Counter {
	count = $state(0); // ✅ Explicit initial value
}
```

---

### ❌ WRONG: Nested reactive objects

```ts
// ❌ Deep reactivity is tricky
let state = $state({
	user: {
		profile: {
			name: 'John'
		}
	}
});

state.user.profile.name = 'Jane'; // Works but...
```

### ✅ RIGHT: Use $state.raw for deep structures or update immutably

```ts
let state = $state.raw({
	user: { profile: { name: 'John' } }
});

// Update immutably
state = {
	...state,
	user: {
		...state.user,
		profile: { ...state.user.profile, name: 'Jane' }
	}
};
```

---

## Module Scope Anti-Patterns

### ❌ WRONG: Runes in module scope

```ts
// ❌ Runes DON'T work at module level!
let globalCount = $state(0); // This is NOT reactive

export function getCount() {
	return globalCount;
}
```

### ✅ RIGHT: Use a class or context

```ts
// counter.svelte.ts
export class Counter {
	count = $state(0);

	increment() {
		this.count++;
	}
}

// In component
import { Counter } from './counter.svelte.ts';
const counter = new Counter();
```

---

## Prop Drilling Anti-Pattern

### ❌ WRONG: Deep prop drilling (>3 levels)

```svelte
<!-- GrandParent.svelte -->
<script>
  let user = $state({ name: 'John' });
</script>
<Parent {user} />

<!-- Parent.svelte -->
<script>
  let { user } = $props();
</script>
<Child {user} />

<!-- Child.svelte -->
<script>
  let { user } = $props();
</script>
<Grandchild {user} /> <!-- This is getting deep... -->
```

### ✅ RIGHT: Use Svelte context

```svelte
<!-- GrandParent.svelte -->
<script>
  import { setContext } from 'svelte';

  let user = $state({ name: 'John' });
  setContext('user', () => user); // Pass reactive getter
</script>
<Parent />

<!-- Grandchild.svelte -->
<script>
  import { getContext } from 'svelte';

  const getUser = getContext('user');
  let user = $derived(getUser());
</script>

<p>Hello, {user.name}</p>
```

**Rule**: Prop drilling > 3 levels → Use Svelte context + runes.

---

## Quick Reference

| ❌ Wrong                   | ✅ Right                      |
| -------------------------- | ----------------------------- |
| Side effects in `$derived` | Pure computation only         |
| Async in `$derived`        | Use `$effect`                 |
| No cleanup in `$effect`    | Return cleanup function       |
| Uninitialized `$state`     | Always provide initial value  |
| Runes at module scope      | Use class with `.svelte.ts`   |
| Prop drilling > 3 levels   | Use `setContext`/`getContext` |
| Stale closure in async     | Capture value before async    |

---

## Related

- `../sveltekit/anti-patterns.md` - SvelteKit anti-patterns
- `../../security/auth/patterns.md` - Auth patterns
- `../../../testing/philosophy.md` - Testing philosophy
