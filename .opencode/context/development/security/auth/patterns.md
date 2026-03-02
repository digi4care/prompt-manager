<!-- Context: development/security/auth | Priority: critical | Version: 1.0 | Updated: 2026-02-27 -->

# Auth Patterns

Cookie-based authentication for SvelteKit. **NEVER use localStorage for auth tokens.**

---

## Core Principle

```
Auth tokens → HttpOnly cookies (XSS-safe)
UI state   → localStorage (theme, preferences, sidebar)
```

---

## Cookie Setup

### ✅ RIGHT: HttpOnly cookies

```ts
// src/lib/server/auth.ts
import { dev } from '$app/environment';

export function setSessionCookie(cookies: Cookies, sessionId: string) {
	cookies.set('session_id', sessionId, {
		path: '/',
		httpOnly: true, // ✅ Not accessible to JS
		sameSite: 'lax', // ✅ CSRF protection
		secure: !dev, // ✅ HTTPS only in production
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete('session_id', { path: '/' });
}
```

### ❌ WRONG: localStorage for tokens

```ts
// ❌ NEVER do this!
localStorage.setItem('token', authToken);
```

---

## Session Validation

### Server-side middleware pattern

```ts
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

const authGuard: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');

	if (sessionId) {
		const session = await validateSession(sessionId);
		if (session) {
			event.locals.user = session.user;
			event.locals.session = session;
		}
	}

	return resolve(event);
};

export const handle = sequence(authGuard);
```

---

## Protected Routes

### Load function protection

```ts
// src/routes/dashboard/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		user: locals.user
	};
};
```

### API endpoint protection

```ts
// src/routes/api/user/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    throw error(401, 'Unauthorized');
  }

  return json({ user: locals.user });
});
```

---

## Login Flow

### Form action with cookies

```ts
// src/routes/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { setSessionCookie } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		// Validate credentials
		const user = await authenticateUser(email, password);

		if (!user) {
			return fail(401, { error: 'Invalid credentials' });
		}

		// Create session
		const sessionId = await createSession(user.id);

		// Set cookie
		setSessionCookie(cookies, sessionId);

		throw redirect(303, '/dashboard');
	}
};
```

### Login form with enhance

```svelte
<!-- src/routes/login/+page.svelte -->
<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();
</script>

{#if form?.error}
	<p class="text-red-500">{form.error}</p>
{/if}

<form method="POST" use:enhance>
	<input name="email" type="email" required />
	<input name="password" type="password" required />
	<button type="submit">Login</button>
</form>
```

---

## Logout Flow

```ts
// src/routes/logout/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { clearSessionCookie } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		// Invalidate session in DB
		if (locals.session) {
			await invalidateSession(locals.session.id);
		}

		// Clear cookie
		clearSessionCookie(cookies);

		throw redirect(303, '/login');
	}
};
```

---

## Actor Types

### Admin vs Customer cookies

```ts
// Different cookies for different actors
const COOKIES = {
	customer: 'session_id',
	admin: 'admin_session'
} as const;

export function setAuthCookie(
	cookies: Cookies,
	actorType: 'customer' | 'admin',
	sessionId: string
) {
	const name = COOKIES[actorType];
	cookies.set(name, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: 60 * 60 * 24 * 7
	});
}
```

### Admin route protection

```ts
// src/routes/admin/+layout.server.ts
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, locals }) => {
	// Check admin-specific cookie
	const adminSession = cookies.get('admin_session');

	if (!adminSession || !locals.isAdmin) {
		throw redirect(303, '/admin/login');
	}

	return {};
};
```

---

## CSRF Protection

### SameSite=Lax (built-in)

```ts
// SameSite=Lax prevents CSRF for most cases
cookies.set('session_id', token, {
	sameSite: 'lax' // ✅ Prevents cross-site requests
});
```

### For stricter protection

```ts
// Double-submit cookie pattern for sensitive actions
export const actions: Actions = {
	deleteUser: async ({ request, cookies }) => {
		const csrfToken = request.headers.get('x-csrf-token');
		const cookieToken = cookies.get('csrf_token');

		if (csrfToken !== cookieToken) {
			return fail(403, { error: 'Invalid CSRF token' });
		}

		// Proceed with action
	}
};
```

---

## What Goes in localStorage

### ✅ ALLOWED: UI state only

```ts
// ✅ These are fine in localStorage
localStorage.setItem('theme', 'dark');
localStorage.setItem('sidebar_collapsed', 'true');
localStorage.setItem('preferred_language', 'nl');
localStorage.setItem('toast_dismissed', 'true');
```

### ❌ FORBIDDEN: Auth data

```ts
// ❌ NEVER store these in localStorage
localStorage.setItem('token', jwt);
localStorage.setItem('refresh_token', refreshToken);
localStorage.setItem('user_id', userId);
localStorage.setItem('session_id', sessionId);
```

---

## Quick Reference

| Data             | Storage         | Why            |
| ---------------- | --------------- | -------------- |
| Session token    | HttpOnly cookie | XSS protection |
| User ID          | HttpOnly cookie | XSS protection |
| Theme preference | localStorage    | UI state       |
| Sidebar state    | localStorage    | UI state       |
| Language         | localStorage    | UI state       |

---

## Actor Matrix

| Actor    | Cookie          | Login          | Landing      |
| -------- | --------------- | -------------- | ------------ |
| Customer | `session_id`    | `/login`       | `/dashboard` |
| Admin    | `admin_session` | `/admin/login` | `/admin`     |
| System   | API Key         | N/A            | N/A          |

---

## Related

- `better-auth-anti-patterns.md` - Better Auth pitfalls
- `../../frameworks/sveltekit/anti-patterns.md` - SvelteKit patterns
- `../../../testing/philosophy.md` - Testing philosophy
