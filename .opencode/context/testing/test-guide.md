<!-- Context: testing/test-guide | Priority: critical | Version: 2.0 | Updated: 2026-02-27 -->

# Test Guide - Svelte Runtime

Purpose: overzicht van actieve testcommando's en guardrails voor auth/actor flows.

## Quick commands

```bash
# Static checks
npm run check

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# E2E tests (all browsers)
npm run test:e2e:all

# Coverage
npm run test:coverage
```

## Runtime assumptions

- Primary runtime: SvelteKit app (frontend + API routes).
- Auth model: cookie-based sessions (see `development/security/auth/`).
- localStorage is allowed only for non-sensitive UI preferences.
- Legacy backend mode is deprecated and not required for normal test runs.

## Monitoring expectations

- Capture console errors in E2E and fail on unexpected errors.
- Capture failed network requests.
- Use deterministic waits (`toHaveURL`, role/locator assertions).
- Avoid fixed sleeps in critical auth flows.

## Manual checks (minimum)

1. Customer login → `/dashboard`
2. Admin login → `/admin`
3. Cross-actor access blocked/redirected
4. 2FA setup + challenge + backup flow behavior (if applicable)
5. Logout clears actor-specific cookie

## References

- `philosophy.md` - Why CLI + Browser testing is required
- `test-enforcement.md` - Test enforcement rules
- `development/security/auth/patterns.md` - Auth patterns
