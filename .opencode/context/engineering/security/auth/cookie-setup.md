<!-- Context: development/security/auth/cookie-setup | Priority: critical | Version: 1.0 | Updated: 2026-03-06 -->

# Cookie Setup

**Kern**: HttpOnly cookies voor auth, localStorage ALLEEN voor UI state

---

## Core Principle

```
Auth tokens → HttpOnly cookies (XSS-safe)
UI state   → localStorage (theme, preferences)
```

---

## HttpOnly Cookie Setup

```ts
// src/lib/server/auth.ts
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

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

---

## ❌ NEVER Use localStorage for Auth

```ts
// ❌ NEVER do this!
localStorage.setItem('token', authToken);
localStorage.setItem('refresh_token', refreshToken);
localStorage.setItem('user_id', userId);
```

**Why**: localStorage is accessible to any JS = XSS vulnerable

---

## ✅ localStorage is OK for UI State

```ts
// ✅ These are fine
localStorage.setItem('theme', 'dark');
localStorage.setItem('sidebar_collapsed', 'true');
localStorage.setItem('preferred_language', 'nl');
```

---

## Actor Cookies

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

---

## Quick Reference

| Data          | Storage         | Why            |
| ------------- | --------------- | -------------- |
| Session token | HttpOnly cookie | XSS protection |
| User ID       | HttpOnly cookie | XSS protection |
| Theme         | localStorage    | UI state only  |
| Language      | localStorage    | UI state only  |

---

## Related

- `protected-routes.md` - Route protection
- `csrf-protection.md` - CSRF patterns
