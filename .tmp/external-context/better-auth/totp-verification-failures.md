---
source: Context7 API
library: Better Auth
package: better-auth
topic: common totp verification failures
fetched: 2026-02-13T00:00:00Z
official_docs: https://www.better-auth.com/docs/plugins/two-factor
---

## Common causes when verification fails

From Better Auth 2FA docs for `POST /two-factor/verify-totp`:

1. Invalid or expired code
   - Error response is `401` with invalid/expired TOTP error.
2. Time drift issues
   - Better Auth accepts TOTP from current period and one period before/after.
   - If device/server time skew exceeds this window, verification can fail.
3. 2FA not fully enabled yet
   - `POST /two-factor/enable` generates secret/backup codes, but full enablement requires TOTP verification unless `skipVerificationOnEnable` is configured.
4. Account type mismatch
   - Docs note 2FA enablement is for credential-based accounts; social-provider assumptions can block expected flow.
5. Endpoint confusion in implementation
   - TOTP flow uses `/two-factor/verify-totp` (some docs also show `/two-factor/verify-otp` for OTP).
   - Using the wrong endpoint/method for your factor flow can cause failures.

## Verified endpoint and payload for TOTP verification

`POST /two-factor/verify-totp`

```json
{
	"code": "012345",
	"trustDevice": true
}
```

## Fast diagnostic checklist

- Confirm server plugin `twoFactor()` and client plugin `twoFactorClient()` are both enabled.
- Confirm request hits `POST /two-factor/verify-totp`.
- Confirm `code` is 6-digit string and not stale.
- Confirm device time is synced.
- Confirm user session is valid and account is credential-based for enablement flow.

Sources:

- https://github.com/better-auth/better-auth/blob/canary/docs/content/docs/plugins/2fa.mdx
- https://context7.com/better-auth/better-auth/llms.txt
