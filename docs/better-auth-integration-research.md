# Better Auth Integration Research

## 1. Security, Hooks & Cookies

### Hooks Configuration (hooks.server.ts)

- Gebruik `svelteKitHandler` voor automatische cookie handling
- `sveltekitCookies(getRequestEvent)` plugin moet **LAATSTE** in plugins array
- Session ophalen: `auth.api.getSession({ headers })`

### Cookie Security

- **Default**: httpOnly=true, secure=true (prod), sameSite=lax
- CSRF protection is **standaard ingeschakeld**
- Cross-domain cookies: sameSite='none', secure=true, partitioned=true

### Rate Limiting

```typescript
rateLimit: {
  enabled: true,
  window: 60,
  max: 100,
  customRules: {
    '/sign-in/email': { window: 60, max: 5 },
    '/two-factor/*': { window: 60, max: 3 }
  }
}
```

### 2FA Security

- TOTP: digits=6, period=30
- Backup codes: storeBackupCodes='encrypted'
- Trust device: 30 dagen default

---

## 2. Schema Issues & Fixes

### Critical Issues

| Table         | Issue                           | Fix              |
| ------------- | ------------------------------- | ---------------- |
| authUsers     | `emailVerified` mode: timestamp | mode: 'boolean'  |
| authSessions  | `token` missing unique          | Add `.unique()`  |
| authTwoFactor | `backupCodes` nullable          | Add `.notNull()` |

### Missing Indexes

- authSessions: userId
- authAccounts: userId
- authVerifications: identifier
- authTwoFactor: userId, secret

### Missing Fields

- authAccounts: scope, accessTokenExpiresAt, refreshTokenExpiresAt

### Missing Type Exports

- AuthVerification, NewAuthVerification
- AuthTwoFactor, NewAuthTwoFactor

---

## 3. Mock Data & Seeding Issues

### Current State

| File                        | Idempotent | Error Handling  |
| --------------------------- | ---------- | --------------- |
| seed.ts                     | ✅         | ❌ Basic        |
| seed-admin.ts               | ✅         | ❌ No try-catch |
| seed-mock-prompts.ts        | ❌         | ❌ No try-catch |
| create-better-auth-admin.ts | ✅         | ✅              |

### Missing Test Data

- Regular test users (only admin exists)
- 2FA records
- Pre-seeded sessions

### Password Hashing

- Correct format: `{salt}:{hash}` (scrypt, N=16384, r=16, p=1, dkLen=64)
- `create-better-auth-admin.ts` uses incorrect placeholder hash

---

## 4. Correct API Methods

### Two-Factor API

```typescript
// ✅ CORRECT - Server Actions
auth.api.enableTwoFactor({ body: { password }, headers });
auth.api.disableTwoFactor({ body: { password }, headers });
auth.api.verifyTwoFactorTotp({ body: { code, trustDevice }, headers });

// ❌ WRONG - Does NOT exist
auth.api.twoFactor.enable();
```

### Schema Mapping

```typescript
database: drizzleAdapter(db, {
	provider: 'sqlite',
	schema: {
		user: authUsers,
		account: authAccounts,
		session: authSessions,
		verification: authVerifications,
		twoFactor: authTwoFactor // <-- Required for 2FA plugin
	}
});
```

---

## 5. Action Items

### High Priority

1. [ ] Fix emailVerified field type (boolean, not timestamp)
2. [ ] Add unique constraint to authSessions.token
3. [ ] Add twoFactor to schema mapping in auth.ts
4. [ ] Use auth.api.enableTwoFactor (not auth.api.twoFactor.enable)

### Medium Priority

1. [ ] Add missing indexes
2. [ ] Create seed-auth.ts with test users + 2FA data
3. [ ] Fix password hashing in create-better-auth-admin.ts
4. [ ] Add rate limiting configuration

### Low Priority

1. [ ] Add missing type exports
2. [ ] Create unified seed command
3. [ ] Add security headers
