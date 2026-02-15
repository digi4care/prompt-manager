---
source: Context7 API
library: Better Auth
package: better-auth
topic: enable verify totp flow in sveltekit
fetched: 2026-02-13T00:00:00Z
official_docs: https://www.better-auth.com/docs
---

## SvelteKit integration prerequisites

- Mount Better Auth in `hooks.server.ts` with `svelteKitHandler({ event, resolve, auth, building })`.
- Enable 2FA server plugin with `twoFactor()` and set `appName` (used as TOTP issuer).
- Enable client 2FA plugin with `twoFactorClient()`.

```ts
import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';

export async function handle({ event, resolve }) {
	return svelteKitHandler({ event, resolve, auth, building });
}
```

## Enable TOTP (server endpoint)

`POST /two-factor/enable`

Request body:

```json
{
	"password": "secure-password",
	"issuer": "my-app-name"
}
```

- `password` is required.
- `issuer` is optional and defaults to app name from auth config.
- Authenticated session is required.

Success response includes:

- `secret` (encrypted)
- `backupCodes` (array)
- `totpURI` (for QR code/authenticator app)

Notes from docs:

- 2FA can only be enabled for credential-based accounts.
- `twoFactorEnabled` is not true until TOTP is verified (unless `skipVerificationOnEnable: true`).

## Verify TOTP (server endpoint)

`POST /two-factor/verify-totp`

Request body:

```json
{
	"code": "123456",
	"trustDevice": true
}
```

- `code` required (6-digit string).
- `trustDevice` optional, default `true`; trusts device for 30 days.

Success response includes `success`, `user`, and `session`.

## Client calls (Better Auth client)

```ts
const { data } = await authClient.twoFactor.enable({
	password: 'userPassword'
});

await authClient.twoFactor.verifyTotp({
	code: '123456',
	trustDevice: true
});
```

Sources:

- https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/plugins/2fa.mdx
- https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/integrations/svelte-kit.mdx
