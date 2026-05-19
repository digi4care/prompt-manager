<!-- Context: development/security/auth | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Better Auth Anti-Patterns

Common mistakes when using Better Auth with SvelteKit.

---

## Installation & Setup

### ❌ WRONG: Missing SvelteKit adapter

```ts
// ❌ Generic setup without SvelteKit integration
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
	// Missing SvelteKit adapter!
});
```

### ✅ RIGHT: Use SvelteKit adapter

```ts
// src/lib/server/auth.ts
import { betterAuth } from 'better-auth';
import { svelteKit } from 'better-auth/svelte-kit';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),

	plugins: [
		svelteKit() // ✅ SvelteKit integration
	],

	session: {
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60 // 5 minutes
		}
	}
});

export type Auth = typeof auth;
```

---

## Hooks Integration

### ❌ WRONG: Manual cookie handling

```ts
// ❌ Don't manually handle Better Auth cookies
export const handle = sequence(async ({ event, resolve }) => {
	const token = event.cookies.get('better-auth.session_token');
	// Manual parsing... DON'T
	return resolve(event);
});
```

### ✅ RIGHT: Use Better Auth handler

```ts
// src/hooks.server.ts
import { auth } from '$lib/server/auth';
import { sequence } from '@sveltejs/kit';

export const handle = sequence(
	auth.handler() // ✅ Better Auth handles everything
	// Your other middleware
);
```

---

## Client Integration

### ❌ WRONG: Creating separate client

```ts
// ❌ Don't create a new client instance per request
const client = createAuthClient();
```

### ✅ RIGHT: Single client export

```ts
// src/lib/client/auth.ts
import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_PUBLIC_URL
});

// Use in components
import { authClient } from '$lib/client/auth';
```

---

## Session Access

### ❌ WRONG: Fetching session client-side

```svelte
<script>
	// ❌ Unnecessary fetch
	let session = $state(null);

	$effect(() => {
		fetch('/api/session')
			.then((r) => r.json())
			.then((s) => (session = s));
	});
</script>
```

### ✅ RIGHT: Use Better Auth client

```svelte
<script>
	import { authClient } from '$lib/client/auth';

	// ✅ Built-in reactive session
	const session = authClient.useSession();
</script>

{#if session.data}
	<p>Hello, {session.data.user.name}</p>
{/if}
```

---

## Database Schema

### ❌ WRONG: Custom session table

```ts
// ❌ Better Auth expects specific schema
drizzle.schema({
	userSessions: pgTable('user_sessions', {
		// Custom schema won't work!
	})
});
```

### ✅ RIGHT: Use Better Auth schema generator

```ts
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

// Let Better Auth generate schema
const adapter = drizzleAdapter(db, {
	provider: 'pg'
});

// Or use their CLI to generate migrations
// npx @better-auth/cli generate
```

---

## Email Verification

### ❌ WRONG: Skipping verification

```ts
// ❌ No email verification
emailAndPassword: {
	enabled: true;
	// No verification!
}
```

### ✅ RIGHT: Require verification

```ts
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true
},

emailVerification: {
  sendVerificationEmail: async ({ user, token }) => {
    await sendEmail({
      to: user.email,
      subject: 'Verify your email',
      body: `Click: ${baseURL}/verify-email?token=${token}`
    });
  }
}
```

---

## Two-Factor Authentication

### ❌ WRONG: Not enforcing 2FA for admin

```ts
// ❌ 2FA optional for admin
twoFactor: {
	enabled: true;
	// Not enforced!
}
```

### ✅ RIGHT: Enforce 2FA per role

```ts
// In your hooks or middleware
export const handle = sequence(auth.handler(), async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// Enforce 2FA for admin
	if (event.url.pathname.startsWith('/admin')) {
		if (!session?.user.twoFactorEnabled) {
			throw redirect(303, '/admin/2fa/setup');
		}
	}

	return resolve(event);
});
```

---

## OAuth Integration

### ❌ WRONG: Hardcoded redirect URLs

```ts
// ❌ Will break in different environments
socialProviders: {
  google: {
    clientId: '...',
    clientSecret: '...'
    // Missing redirect URI!
  }
}
```

### ✅ RIGHT: Dynamic redirect URLs

```ts
socialProviders: {
  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectURI: `${env.PUBLIC_URL}/api/auth/callback/google`
  }
}
```

---

## Rate Limiting

### ❌ WRONG: No rate limiting on auth endpoints

```ts
// ❌ Vulnerable to brute force
emailAndPassword: {
	enabled: true;
}
```

### ✅ RIGHT: Enable rate limiting

```ts
rateLimit: {
  enabled: true,
  window: 60, // 60 seconds
  max: 5      // Max 5 attempts per window
}
```

---

## Quick Reference

| ❌ Wrong                | ✅ Right                         |
| ----------------------- | -------------------------------- |
| No SvelteKit adapter    | `plugins: [svelteKit()]`         |
| Manual cookie handling  | `auth.handler()` in hooks        |
| Fetch session manually  | `authClient.useSession()`        |
| Custom session schema   | Use adapter schema               |
| Skip email verification | `requireEmailVerification: true` |
| No rate limiting        | Enable `rateLimit`               |

---

## Better Auth Plugin Order

```ts
betterAuth({
	database: drizzleAdapter(db, { provider: 'pg' }),

	plugins: [
		svelteKit(), // 1. Framework first
		twoFactor(), // 2. Auth plugins
		emailVerification(), // 3. Verification
		organization() // 4. Multi-tenant (optional)
	],

	rateLimit: { enabled: true },
	session: { cookieCache: { enabled: true } }
});
```

---

## Related

- `patterns.md` - General auth patterns
- `../../frameworks/sveltekit/anti-patterns.md` - SvelteKit patterns
- https://better-auth.com/docs - Official docs
