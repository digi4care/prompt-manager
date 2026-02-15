# Better Auth Context voor SvelteKit Toevoegen

Voeg aan mijn SvelteKit project de Better Auth library context toe.

```text
/context extract from https://github.com/better-auth/better-auth/tree/main/docs/content/docs [gh_grep mcp tool]
```

## Benodigde Context Bestanden

Maak de volgende structuur aan in `.opencode/context/external/frameworks/`:
external/frameworks/better-auth/

```text
├── navigation.md                    # Better Auth overview
├── concepts/
│   ├── auth-instance.md             # Core auth setup
│   ├── database-adapter.md          # Drizzle adapter integratie
│   ├── sessions.md                  # Session management
│   └── authentication-methods.md    # Email/password, OAuth, generic OAuth
├── guides/
│   ├── sveltekit-integration.md     # SvelteKit-specific integration
│   ├── drizzle-setup.md             # Drizzle ORM setup guide
│   └── admin-protection.md          # Admin routes beschermen
├── examples/
│   ├── auth-instance-setup.ts       # Auth instance code
│   ├── sveltekit-hooks.ts           # SvelteKit hooks server code
│   ├── client-usage.ts              # Client-side auth code
│   └── session-check.ts             # Session check code
└── lookup/
    ├── environment-variables.md     # Env vars cheat sheet
    └── config-options.md            # Config options reference
```

## Inhoud Requirements

### navigation.md

- Better Auth overview
- SvelteKit integration highlights
- Quick reference links
- When to use Better Auth

### concepts/auth-instance.md

- `betterAuth({ ... })` setup
- Database adapter (Drizzle, Prisma, etc.)
- Email & password authentication
- OAuth providers (GitHub, Google, etc.)
- Session configuration
- Environment variables

### concepts/database-adapter.md

- Drizzle adapter setup: `drizzleAdapter(db, { provider: "pg" })`
- Schema generation: `npx @better-auth/cli generate`
- SQLite/PostgreSQL/MySQL support
- Table structure: user, session, account

### concepts/sessions.md

- Default: 7 days expiration, 1 day updateAge
- Server: `await auth.api.getSession({ headers })`
- Client: `await authClient.getSession()`
- Session table structure
- Cookie configuration

### concepts/authentication-methods.md

- Email & password: `emailAndPassword: { enabled: true }`
- OAuth: `socialProviders: { google: { clientId, clientSecret } }`
- Generic OAuth: `genericOAuth()` plugin

### guides/sveltekit-integration.md

- SvelteKit handler: `svelteKitHandler({ event, resolve, auth, building })`
- hooks.server.ts setup
- Protected routes via +page.server.ts load function
- Session access in load functions
- Middleware for fast checks

### guides/drizzle-setup.md

- Install: `bun add better-auth @auth/drizzle-adapter`
- Import: `import { drizzleAdapter } from "better-auth/adapters/drizzle"`
- Pass db instance and provider type
- Generate schema and run migrations
- Extend existing users table with auth fields

### guides/admin-protection.md

- Check session cookie for redirects (fast, no DB)
- Full validation with getSession (DB check)
- Role-based access control
- Protected route patterns

### examples/auth-instance-setup.ts

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
  }),
  emailAndPassword: {
    enabled: true,
  },
});
```

### examples/sveltekit-hooks.ts

```typescript
import { auth } from "$lib/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
export async function handle({ event, resolve }) {
  return svelteKitHandler({ event, resolve, auth, building });
}
```

### examples/client-usage.ts

```typescript
import { createAuthClient } from "better-auth/svelte";
export const authClient = createAuthClient({
  baseURL: "http://localhost:5173",
});
```

### examples/session-check.ts

```typescript
import { auth } from "$lib/auth";
export async function load({ request }) {
  const session = await auth.api.getSession({
    headers: new Headers(request.headers),
  });
  if (!session?.user) {
    throw redirect(302, '/login');
  }
  return { user: session.user };
}
```

### lookup/environment-variables.md

- BETTER_AUTH_SECRET: 32+ chars (generate: openssl rand -base64 32 or npx @better-auth/cli secret)
- DATABASE_URL: Database connection string
- BASE_URL: App base URL (OAuth redirects)
- Provider secrets: GITHUB_CLIENT_ID, GOOGLE_CLIENT_ID, etc.

### lookup/config-options.md

- cookiePrefix: Default "better-auth"
- session: { expiresIn, updateAge, disableSessionRefresh }
- advanced: { cookiePrefix, databaseHooks }

Referentie Documentatie

- Better Auth officiële docs: <https://better-auth.com>
- GitHub repository: <https://github.com/better-auth/better-auth>

#### Toepassing

Maak deze context beschikbaar voor:

- Better Auth setup in SvelteKit
- Drizzle ORM integration
- Email/password authentication
- OAuth provider integration
- Session management
- Admin route protection

#### Belangrijke Notities

1. Better Auth beheert GEEN provider keys - die leven in environment
2. De app beheert alleen OpenCode server URL, policy, per-prompt overrides
3. Bestaande users tabel kan worden uitgebreid met auth velden
4. Voor SQLite met libsql: gebruik provider: "sqlite" in Drizzle adapter
5. Schema generatie: npx @better-auth/cli generate

Zorg ervoor dat alle bestanden 50-200 lines per file zijn (MVI principle).
