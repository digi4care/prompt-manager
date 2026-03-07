<!-- Context: development/security/auth/protected-routes | Priority: critical | Version: 1.0 | Updated: 2026-03-06 -->

# Protected Routes

**Kern**: Middleware pattern voor auth, redirects voor pages, 401 voor API

---

## Server Middleware

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

## Page Protection

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

---

## API Protection

```ts
// src/routes/api/user/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	return json({ user: locals.user });
};
```

---

## Login Flow

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

		const user = await authenticateUser(email, password);

		if (!user) {
			return fail(401, { error: 'Invalid credentials' });
		}

		const sessionId = await createSession(user.id);
		setSessionCookie(cookies, sessionId);

		throw redirect(303, '/dashboard');
	}
};
```

---

## Admin Route Protection

```ts
// src/routes/admin/+layout.server.ts
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, locals }) => {
	const adminSession = cookies.get('admin_session');

	if (!adminSession || !locals.isAdmin) {
		throw redirect(303, '/admin/login');
	}

	return {};
};
```

---

## Related

- `cookie-setup.md` - Cookie configuration
- `csrf-protection.md` - CSRF patterns
