<!-- Context: development/frameworks/sveltekit | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# SvelteKit Anti-Patterns

Common mistakes to avoid when building SvelteKit apps.

---

## Server vs Client Confusion

### ❌ WRONG: Using server code in client

```svelte
<script>
	// This will fail - $lib/server is server-only
	import { db } from '$lib/server/db';

	let users = $state([]);
	$effect(() => {
		db.select().from(users); // ❌ Runs in browser!
	});
</script>
```

### ✅ RIGHT: Use server functions or endpoints

```svelte
<script>
	import { browser } from '$app/environment';
	// Fetch from API endpoint
	let users = $state([]);

	$effect(() => {
		if (browser) {
			fetch('/api/users')
				.then((r) => r.json())
				.then((data) => (users = data));
		}
	});
</script>
```

**Rule**: `$lib/server/*` imports only in `+page.server.ts`, `+layout.server.ts`, `+server.ts`, or `.server.ts` files.

---

## Form Handling

### ❌ WRONG: Client-only form submission

```svelte
<script>
	let email = $state('');

	async function handleSubmit() {
		await fetch('/api/login', {
			method: 'POST',
			body: JSON.stringify({ email }) // ❌ No progressive enhancement
		});
	}
</script>

<form onsubmit={handleSubmit}>
	<input bind:value={email} />
</form>
```

### ✅ RIGHT: Server actions + enhance

```svelte
<script>
	import { enhance } from '$app/forms';
</script>

<form method="POST" action="?/login" use:enhance>
	<input name="email" />
	<button type="submit">Login</button>
</form>
```

```ts
// +page.server.ts
export const actions = {
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		// Server-side validation & auth
		cookies.set('session_id', token, { httpOnly: true });
		throw redirect(303, '/dashboard');
	}
};
```

**Rule**: Forms ALWAYS use server actions + `use:enhance` for progressive enhancement.

---

## Load Function Mistakes

### ❌ WRONG: Fetching in component

```svelte
<script>
	let data = $state(null);
	$effect(() => {
		fetch('/api/user')
			.then((r) => r.json())
			.then((d) => (data = d));
	});
</script>
```

### ✅ RIGHT: Use load function

```ts
// +page.server.ts
export async function load({ parent, fetch }) {
	const { user } = await parent();
	const posts = await fetch('/api/posts').then((r) => r.json());
	return { user, posts };
}
```

```svelte
<script>
	let { data } = $props(); // Data from load
</script>
```

**Rule**: Data fetching belongs in `load` functions, not `$effect`.

---

## URL/Navigation Anti-Patterns

### ❌ WRONG: Hardcoded links

```svelte
<a href="/dashboard">Dashboard</a> <!-- ❌ Breaks if base path changes -->
```

### ✅ RIGHT: Use $app/paths

```svelte
<script>
	import { base } from '$app/paths';
</script>

<a href="{base}/dashboard">Dashboard</a>
```

### ❌ WRONG: Client-side redirect in load

```ts
export function load() {
	throw redirect(302, '/login'); // ❌ Wrong in server load
}
```

### ✅ RIGHT: Correct redirect

```ts
import { redirect } from '@sveltejs/kit';

export async function load() {
	throw redirect(303, '/login'); // ✅ 303 for post-load redirect
}
```

---

## Session/Auth Anti-Patterns

### ❌ WRONG: localStorage for auth tokens

```ts
// ❌ XSS vulnerable!
localStorage.setItem('token', authToken);
```

### ✅ RIGHT: HttpOnly cookies

```ts
// In server action/endpoint
cookies.set('session_id', token, {
	httpOnly: true,
	secure: true,
	sameSite: 'lax',
	path: '/',
	maxAge: 60 * 60 * 24 * 7
});
```

**Rule**: Auth ALWAYS uses HttpOnly cookies. localStorage only for UI state.

---

## Error Handling

### ❌ WRONG: Swallowing errors

```ts
export async function load() {
	try {
		const data = await fetchData();
		return data;
	} catch (e) {
		return null; // ❌ Silent failure, hard to debug
	}
}
```

### ✅ RIGHT: Proper error handling

```ts
import { error } from '@sveltejs/kit';

export async function load() {
	try {
		const data = await fetchData();
		return data;
	} catch (e) {
		throw error(500, 'Failed to load data');
	}
}
```

---

## Quick Reference

| ❌ Wrong                | ✅ Right                          |
| ----------------------- | --------------------------------- |
| `$lib/server` in client | Server-only in `.server.ts` files |
| `fetch()` in `$effect`  | `load()` function                 |
| Client-only forms       | Server actions + `enhance`        |
| localStorage for auth   | HttpOnly cookies                  |
| Hardcoded `/links`      | `{base}/links`                    |
| Silent error catching   | `throw error()`                   |

---

## Related

- `../svelte/anti-patterns.md` - Svelte 5 runes anti-patterns
- `../../security/auth/patterns.md` - Auth patterns
- `../../../testing/philosophy.md` - Testing philosophy
