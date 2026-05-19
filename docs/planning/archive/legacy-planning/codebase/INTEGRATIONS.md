# External Integrations

**Analysis Date:** 2026-02-14

## APIs & External Services

**OpenCode AI Platform:**

- Purpose: AI agent execution for prompt improvement and evaluation
- SDK: `@opencode-ai/sdk`
- Client: `src/lib/server/opencode/client.ts`
- Config: `OPENCODE_URL` env var (default: `http://localhost:4096`)
- Agents used:
  - `prompt-judge` - Evaluates prompt quality (clarity, completeness, specificity)
  - `prompt-improve` - Generates improved prompt variants
- Features:
  - Session-based execution with model selection
  - Provider/model catalog with TTL cache (5 minutes)
  - Health check endpoint for monitoring

## Data Storage

**Databases:**

- SQLite via libSQL
  - Connection: `DATABASE_URL` env var (default: `file:local.db`)
  - Client: `@libsql/client` + `drizzle-orm/libsql`
  - ORM: Drizzle ORM with schema at `src/lib/server/db/schema.ts`
  - Migration tool: `drizzle-kit`
  - Production path: `/app/data/local.db` (Docker)
  - Turso-compatible (cloud SQLite)

**File Storage:**

- Local filesystem only
  - Logs: `logs/audit.log` (winston)
  - Database: SQLite file in project root or `/app/data/`

**Caching:**

- In-memory caching only:
  - Rate limit map in `src/hooks.server.ts`
  - Provider catalog cache in `src/lib/server/services/opencode.service.ts` (5-minute TTL)
- No Redis or external cache

## Authentication & Identity

**Auth Provider:**

- Better Auth (self-hosted)
  - Implementation: `src/lib/auth.ts`
  - Database adapter: Drizzle with SQLite
  - Password hashing: scrypt via `@noble/hashes/scrypt`

**Auth Features:**

- Email/password authentication
- Two-factor authentication (TOTP via `better-auth/plugins`)
- OAuth providers (optional, auto-detected):
  - GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Session management with 7-day expiry
- JWT tokens for API authentication (`src/lib/server/auth/jwt.ts`)

**Admin Authentication:**

- Separate admin credentials: `ADMIN_PASSWORD`, `ADMIN_EMAIL`
- Dev bypass available (never use in production): `ALLOW_DEV_BYPASS=true`

## Monitoring & Observability

**Error Tracking:**

- None (application-level only)

**Logging:**

- Winston logger at `src/lib/server/audit.ts`
- Outputs to:
  - Console (colorized, development-friendly)
  - `logs/audit.log` (JSON format)
- Log types:
  - Audit events (user actions, data changes)
  - Security events (auth failures, rate limits)
  - Error events (with stack traces in dev only)

**Health Checks:**

- `/api/health` endpoint
- OpenCode health check: `src/lib/server/services/opencode.service.ts` → `checkOpencodeHealth()`
- Docker HEALTHCHECK in Dockerfile

## CI/CD & Deployment

**Hosting:**

- Docker containers (multi-stage build)
- `@sveltejs/adapter-auto` (adapts to deployment platform)

**CI Pipeline:**

- GitHub Actions: `.github/workflows/tests.yml`
- Runs tests via Docker: `./scripts/run-tests-docker.sh --all`
- Triggers: push to any branch, pull requests

**Docker Compose:**

- `docker-compose.yml` - Main application stack
- `docker-compose.playwright.yml` - E2E testing environment

## Environment Configuration

**Required env vars:**

```bash
DATABASE_URL=file:local.db        # SQLite database path
BETTER_AUTH_SECRET=...            # Session encryption (32+ chars)
JWT_SECRET=...                    # JWT signing (32+ chars)
```

**Production required:**

```bash
OPENCODE_URL=http://opencode:4096 # OpenCode service URL
ADMIN_PASSWORD=...                # Admin authentication
```

**Optional OAuth:**

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Optional services:**

```bash
ALLOWED_ORIGINS=...               # CORS origins (comma-separated)
```

**Secrets location:**

- Development: `.env` file (gitignored)
- Production: Docker secrets or environment injection

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

## Security Headers

**CORS Configuration:**

- Configured in `src/hooks.server.ts`
- Origins from `ALLOWED_ORIGINS` env var
- Credentials allowed for API routes
- Methods: GET, POST, PUT, DELETE, OPTIONS

**Content Security Policy:**

- `default-src 'self'`
- `connect-src 'self' http://localhost:4096` (OpenCode)
- Report URI: `/api/csp-report`

**Additional Headers:**

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
- Strict-Transport-Security (production only)

---

_Integration audit: 2026-02-14_
