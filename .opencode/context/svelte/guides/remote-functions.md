<!-- Context: svelte/guides | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Guide: SvelteKit Remote Functions

**Purpose**: Data loading and mutations with built-in caching (experimental).
**Last Updated**: 2026-02-12

---

## Core Concept

Experimental feature for type-safe data loading and mutations. Replaces load functions and form actions with unified API. Enable in config first.

---

## Enable Remote Functions

```js
// svelte.config.js
export default {
	kit: {
		experimental: {
			remoteFunctions: true
		}
	}
};
```

---

## Function Types

| Function      | Purpose               | Cached                |
| ------------- | --------------------- | --------------------- |
| `query()`     | Read data             | Yes, auto-cached      |
| `form()`      | Write data via form   | No, invalidates cache |
| `command()`   | Actions without forms | No                    |
| `prerender()` | Build-time data       | Yes, at build         |

---

## Query Example

```svelte
<!-- +page.svelte -->
<script>
	import { query } from './api';

	const posts = query(async () => {
		const res = await fetch('/api/posts');
		return res.json();
	});
</script>

{#each await posts() as post}
	<article>{post.title}</article>
{/each}
```

---

## Form Example

```svelte
<script>
	import { form } from './api';
	import { z } from 'zod';

	const schema = z.object({
		email: z.string().email(),
		name: z.string().min(2)
	});

	const signup = form(schema, async (data) => {
		await createUser(data);
	});
</script>

<form action={signup}>
	<input name="email" type="email" />
	<input name="name" />
	<button type="submit">Sign Up</button>
</form>
```

---

## Command Example

```svelte
<script>
	import { command } from './api';

	const logout = command(async () => {
		await fetch('/api/logout', { method: 'POST' });
	});
</script>

<button onclick={logout}>Logout</button>
```

---

## Reference

- Official: https://svelte.dev/docs/kit/experimental-remote-functions
- Related: [form-handling.md](form-handling.md)
