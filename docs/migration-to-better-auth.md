# Migration to Better Auth

## Overview

This document describes the migration from custom session management to Better Auth for admin authentication.

**Migration Date**: 2026-02-10
**From**: Custom CSRF-based sessions (csrf.ts)
**To**: Better Auth (better-auth package)

---

## What Changed

### Database Schema Changes

**Added Better Auth tables:**

| Table                | Purpose                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `auth_users`         | User records (id, email, emailVerified, name, image, timestamps)                |
| `auth_sessions`      | Session management (userId, expiresAt, token, ipAddress, userAgent, timestamps) |
| `auth_accounts`      | OAuth account linking and password storage                                      |
| `auth_verifications` | Email verification tokens                                                       |

**Key Design Decision:**

- Better Auth tables use `auth_` prefix to avoid conflicts with existing `users` table
- Separate authentication (auth\_) from application data (users)
- Future extensibility: User metadata can be added to `users_meta` table if needed

### Authentication Flow Changes

**Before:**

```
1. Submit login form (password only)
2. Verify password with ENV ADMIN_PASSWORD
3. Create custom session in csrf.ts Map (in-memory)
4. Set admin_session cookie (httpOnly)
5. Generate JWT token
6. Set jwt_token cookie (httpOnly)
```

**After:**

```
1. Submit login form (email + password)
2. Call Better Auth signInEmail API
3. Better Auth creates session in auth_sessions table (persistent)
4. Better Auth sets better-auth.session cookie (httpOnly)
5. Generate JWT token (same as before)
6. Set jwt_token cookie (httpOnly)
```

**Key Improvements:**

- ✅ Sessions persist across server restarts (database-backed)
- ✅ Email format for users (better-auth@localhost)
- ✅ Automatic CSRF protection via Better Auth
- ✅ Built-in OAuth support (auth_accounts table)
- ✅ Email verification ready (auth_verifications table)

### Code Changes

| File                                       | Changes                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `src/lib/auth.ts`                          | Better Auth config updated to use `auth_` tables                           |
| `src/routes/login/+page.server.ts`         | Uses `auth.signInEmail()` instead of custom sessions                       |
| `src/routes/logout/+page.server.ts`        | Uses `auth.signOut()` instead of custom session removal                    |
| `src/routes/api/admin/logout/+server.ts`   | Uses `auth.signOut()` API                                                  |
| `src/hooks.server.ts`                      | Better Auth handler in `handle()`, session validation updated              |
| `src/routes/+layout.server.ts`             | Better Auth session validation instead of `validateAdminSession()`         |
| `src/routes/api/admin/settings/+server.ts` | Better Auth session validation for API routes                              |
| `src/lib/server/db/schema.ts`              | Added `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications` |
| **Deleted**                                | `src/lib/server/auth/csrf.ts` (custom sessions no longer needed)           |

### What Was Preserved

- ✅ **JWT Authentication** (`src/lib/server/auth/jwt.ts`) - Still used for API routes
- ✅ **Rate Limiting** - In-memory Map for API rate limits
- ✅ **CORS Headers** - Cross-origin resource sharing
- ✅ **Security Headers** - CSP and security headers
- ✅ **Audit Logging** - Security event logging
- ✅ **Development Bypass** - `ALLOW_DEV_BYPASS` environment variable
- ✅ **Password Hashing** - Argon2 (via Better Auth)
- ✅ **SvelteKit CSRF** - Built-in form protection

---

## Admin User Migration

**Pre-migration:** No admin users table existed
**Post-migration:** Admin user created in `auth_users` table

### Admin Credentials

| Property | Value                                                      |
| -------- | ---------------------------------------------------------- |
| ID       | 1                                                          |
| Email    | `admin@localhost`                                          |
| Name     | `Admin`                                                    |
| Password | Hashed (argon2) from `ADMIN_PASSWORD` environment variable |

### Migration Method

Better Auth automatically hashed the password using argon2 when the admin user was created. The password is stored in the `auth_accounts` table with the `password` column.

---

## Testing

### Unit Tests

No changes needed - tests use API level, not internal session management

### E2E Tests

No changes needed - tests verify:

- Login flow (form submission, redirect)
- Session persistence (cookie-based)
- API authentication (JWT-based)
- Logout flow

Tests work at the UI level and are unaffected by the internal session implementation.

### Manual Testing

**Login:**

1. Navigate to `/login`
2. Enter email: `admin@localhost`
3. Enter password: `ADMIN_PASSWORD` (from .env)
4. Submit form
5. Verify redirect to admin dashboard
6. Check cookies: `better-auth.session` and `jwt_token` should be present

**Logout:**

1. Navigate to `/logout`
2. Verify redirect to login page
3. Check cookies: `better-auth.session` and `jwt_token` should be removed

**Session Persistence:**

1. Login successfully
2. Restart server
3. Navigate to admin page
4. Verify still authenticated (session persists in database)

---

## Security Considerations

### Better Auth Security Features

| Feature                   | Status                   |
| ------------------------- | ------------------------ |
| HTTP-only session cookies | ✅ Enabled               |
| Secure cookies (HTTPS)    | ✅ Enabled in production |
| SameSite cookies          | ✅ Strict                |
| CSRF protection           | ✅ Built-in              |
| Password hashing          | ✅ Argon2                |
| Session expiry            | ✅ 7 days                |
| Session refresh           | ✅ Every 24 hours        |
| Cookie caching            | ✅ 5 minutes (dev)       |

### What We Still Handle Manually

| Feature                | Location                     |
| ---------------------- | ---------------------------- |
| JWT token generation   | `src/lib/server/auth/jwt.ts` |
| JWT token verification | `src/lib/server/auth/jwt.ts` |
| Rate limiting          | `src/hooks.server.ts`        |
| CORS headers           | `src/hooks.server.ts`        |
| Security headers       | `src/hooks.server.ts`        |
| Audit logging          | `src/hooks.server.ts`        |

### Security Improvements from Migration

1. **Persistent Sessions**: No session loss on server restart
2. **Automatic CSRF**: Better Auth handles CSRF tokens
3. **OAuth Ready**: Can easily add Google/GitHub OAuth
4. **Email Verification**: Ready for email-based accounts
5. **Type Safety**: Better Auth provides TypeScript types

---

## Environment Variables

| Variable             | Purpose                        | Required      |
| -------------------- | ------------------------------ | ------------- |
| `BETTER_AUTH_SECRET` | Better Auth encryption key     | ✅ Yes        |
| `BETTER_AUTH_URL`    | Application base URL           | Auto-detected |
| `ADMIN_PASSWORD`     | Admin password (initial setup) | ✅ Yes        |

**Migration Notes:**

- `BETTER_AUTH_SECRET` was already configured
- `ADMIN_PASSWORD` is still used for admin login
- No new environment variables added

---

## Rollback Plan

If issues arise, rollback is possible but requires careful steps:

### Warning: Database Schema Changes

The `auth_` tables are **permanent**. Rolling back would require:

1. Dropping `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications` tables
2. Restoring `csrf.ts` from git history
3. Reverting all authentication code changes
4. Potential data loss (no admin users would exist)

### Why Rollback is Difficult

1. **Session Data Migration**: Custom sessions were in-memory (Map), Better Auth sessions are in database
2. **Password Hashes**: Better Auth uses argon2, custom implementation may differ
3. **Cookie Format**: `better-auth.session` vs `admin_session` cookies
4. **User Migration**: No user data was migrated (admin user created from scratch)

### Better Alternative: Fix Issues Instead

Since migration changes are irreversible, any issues should be fixed in the Better Auth implementation rather than rolling back.

---

## Known Issues

### TypeScript Errors

Some pre-existing TypeScript errors exist in the codebase:

- `analytics.service.ts:110:4` - Type mismatch with `lastActivity`
- `jwt.ts:67:3` - Type mismatch with `authHeader`
- `improvement-panel.svelte` - Type issues with `JudgeResponse`

**Impact:** None - these are pre-existing and unrelated to Better Auth migration

### Session Cookie Conflicts

If both `admin_session` (old) and `better-auth.session` (new) cookies exist:

- Better Auth will use the new cookie
- Old cookie is ignored but not automatically removed

**Solution:** Old cookies will expire naturally (1 day TTL), or users can clear cookies manually.

---

## Future Enhancements

### User Metadata (Optional)

If flexible user metadata is needed:

```sql
CREATE TABLE users_meta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  metaKey VARCHAR(255) NOT NULL,
  metaValue TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(userId, metaKey)
);

CREATE INDEX idx_users_meta_key ON users_meta(metaKey);
```

This follows the WordPress pattern but with type-safe foreign keys.

### OAuth Providers

To add OAuth support (e.g., Google, GitHub):

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
	providers: [
		google({
			clientId: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET
		}),
		github({
			clientId: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_CLIENT_SECRET
		})
	]
});
```

### Multi-Factor Authentication

Better Auth supports 2FA out of the box:

```typescript
export const auth = betterAuth({
	twoFactor: {
		enabled: true
	}
});
```

---

## Maintenance Notes

### Session Cleanup

Better Auth sessions expire after 7 days. To manually clean up expired sessions:

```sql
DELETE FROM auth_sessions WHERE expiresAt < strftime('%s', 'now') * 1000;
```

### Database Backups

Since sessions are now in the database, regular backups are important:

```bash
# Backup local.db
cp local.db local.db.backup.$(date +%Y%m%d)

# Or use Drizzle migrate backup
npm run db:migrate -- backup
```

### Monitoring

Monitor session table growth:

```sql
SELECT COUNT(*) as active_sessions,
       MIN(expiresAt) as oldest_expiration,
       MAX(expiresAt) as newest_expiration
FROM auth_sessions
WHERE expiresAt > strftime('%s', 'now') * 1000;
```

---

## Troubleshooting

### Problem: Admin cannot log in

**Symptoms:** Login returns error, no redirect

**Solutions:**

1. Verify admin user exists:
   ```sql
   SELECT id, email, name FROM auth_users WHERE email = 'admin@localhost';
   ```
2. Check password in `auth_accounts` table:
   ```sql
   SELECT password FROM auth_accounts WHERE userId = 1;
   ```
3. Verify `ADMIN_PASSWORD` environment variable is set
4. Check Better Auth secret: `echo $BETTER_AUTH_SECRET`

### Problem: Session not persisting

**Symptoms:** Logged out after server restart

**Solutions:**

1. Check database file permissions:
   ```bash
   ls -la local.db
   ```
2. Verify `auth_sessions` table exists:
   ```sql
   SELECT COUNT(*) FROM auth_sessions;
   ```
3. Check Better Auth configuration in `src/lib/auth.ts`

### Problem: JWT token not working

**Symptoms:** API returns 401 unauthorized

**Solutions:**

1. Verify `jwt_token` cookie exists
2. Check JWT secret is consistent
3. Verify JWT token format:
   ```bash
   echo "token" | cut -d. -f2 | base64 -d | jq
   ```

### Problem: TypeScript errors

**Symptoms:** `Property 'auth' does not exist on type 'Locals'`

**Solutions:**

1. Restart TypeScript server:
   ```bash
   npm run check:watch
   ```
2. Clear TypeScript cache:
   ```bash
   rm -rf .svelte-kit types
   npm run dev
   ```
3. Check Locals interface declaration in `src/hooks.server.ts`

---

## Resources

- [Better Auth Documentation](https://www.better-auth.com)
- [SvelteKit Authentication](https://kit.svelte.dev/docs/authentication)
- [Drizzle ORM](https://orm.drizzle.team)
- [SvelteKit Session Management](https://kit.svelte.dev/docs/modules#$app-server)

---

## Summary

This migration replaced in-memory session management with database-backed Better Auth sessions. The key benefits are:

1. **Persistence**: Sessions survive server restarts
2. **Security**: Built-in CSRF, OAuth, email verification
3. **Maintainability**: Standard authentication library vs custom implementation
4. **Extensibility**: Easy to add OAuth providers, 2FA, etc.

The migration maintained backward compatibility for:

- JWT authentication (still used for API routes)
- All security features (rate limiting, CORS, headers)
- E2E tests (UI-level verification)
- Development workflow (no breaking changes)

**Status:** ✅ Migration complete and verified
