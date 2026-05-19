<!-- Context: development/security/auth/csrf-protection | Priority: high | Version: 1.0 | Updated: 2026-03-06 -->

# CSRF Protection

**Kern**: SameSite=Lax voor basis protectie, double-submit voor gevoelige acties

---

## Built-in Protection

```ts
// SameSite=Lax prevents CSRF for most cases
cookies.set('session_id', token, {
	sameSite: 'lax' // ✅ Prevents cross-site requests
});
```

---

## Double-Submit Pattern

For sensitive actions (delete, payment, admin):

```ts
// Server-side: Generate CSRF token
export function generateCsrfToken(): string {
	return crypto.randomUUID();
}

// In form action
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

## Client-Side Setup

```svelte
<script context="module">
	// Include token in all form submissions
	document.addEventListener('submit', (e) => {
		const form = e.target as HTMLFormElement;
		const csrf = form.dataset.csrf;
		if (csrf) {
			form.insertAdjacentHTML('beforeend', `<input type="hidden" name="_csrf" value="${csrf}">`);
		}
	});
</script>

<script>
	import { csrfToken } from '$lib/csrf';
</script>

<form method="POST" data-csrf={csrfToken}>
	<!-- form fields -->
</form>
```

---

## Quick Reference

| Level   | Method               | When               |
| ------- | -------------------- | ------------------ |
| Basic   | `sameSite: 'lax'`    | Always (default)   |
| Strict  | Double-submit        | Sensitive actions  |
| Maximum | `sameSite: 'strict'` | High-security apps |

---

## Related

- `cookie-setup.md` - Cookie configuration
- `protected-routes.md` - Route protection
