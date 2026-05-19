# 04 -- Architecture

## System Overview
SvelteKit full-stack application with service layer architecture, Drizzle ORM, and OpenCode SDK integration.

## Technology Stack
- **Framework:** SvelteKit 5 with Svelte 5 runes
- **Runtime:** Bun
- **Database:** SQLite via libsql (Drizzle ORM)
- **Auth:** Better Auth (sessions) + legacy JWT (API tokens)
- **AI:** OpenCode SDK (@opencode-ai/sdk)
- **Styling:** Tailwind CSS v4
- **Testing:** Vitest (unit), Playwright (E2E)

## Key Modules
| Module | Status | Key Files |
|--------|--------|-----------|
| Auth | Complete | src/lib/auth.ts, src/hooks.server.ts |
| Prompts | Complete | src/lib/server/services/prompts.service.ts |
| Execution | Complete | src/lib/server/services/execution.service.ts |
| Versions | Complete | src/lib/server/services/versions.service.ts |
| Improvement | Complete | src/lib/server/services/improvement.service.ts |
| Settings | Partial | src/lib/settings/* (new registry), src/routes/settings/* (legacy) |
| Snippets | Complete | src/lib/server/services/snippets.service.ts |
| Council | Complete | src/lib/server/services/council*.service.ts |
| Admin | Complete | src/routes/admin/* |
| OpenCode | Complete | src/lib/server/services/opencode.service.ts |

## Integration Points
- OpenCode SDK: Server-side only, session-based execution
- Database: Additive migrations only
- Settings cascade: run > prompt > default precedence

## Decisions
See 11-design-log/ for architecture decisions (DEC-###).
## Legacy Content: .planning/codebase/ARCHITECTURE.md

**Analysis Date:** 2026-02-14

### Pattern Overview

**Overall:** SvelteKit Full-Stack Application with Service Layer Architecture

**Key Characteristics:**
- File-based routing with SvelteKit conventions
- Service layer pattern separating business logic from routes
- Repository pattern via Drizzle ORM for database access
- Dual authentication: Better Auth (sessions) + JWT (API tokens)
- Adapter pattern for OpenCode AI integration with domain-specific error handling

### Layers

#### Route Layer
- **Purpose:** HTTP request handling, validation, response formatting
- **Location:** `src/routes/`
- **Contains:** Page routes, API endpoints, Layout routes
- **Depends on:** Services, validators, auth modules
- **Used by:** HTTP client (browser, external API consumers)

#### Service Layer
- **Purpose:** Business logic, orchestration, data transformation
- **Location:** `src/lib/server/services/`
- **Contains:** Domain services for prompts, versions, improvement, judging, analytics
- **Depends on:** Database client, OpenCode service, admin settings
- **Used by:** Route handlers

#### Data Access Layer
- **Purpose:** Database operations via Drizzle ORM
- **Location:** `src/lib/server/db/`
- **Contains:** Schema, client, seed
- **Depends on:** libsql/SQLite database
- **Used by:** Services

#### Component Layer
- **Purpose:** Reusable UI components
- **Location:** `src/lib/components/`
- **Contains:** ui, prompts, improvement, layout, visualizations, versions, admin
- **Depends on:** Svelte 5 runes, `$lib` utilities
- **Used by:** Page components

#### Store Layer (Client State)
- **Purpose:** Client-side state management with Svelte 5 runes
- **Location:** `src/lib/stores/`
- **Contains:** auth, prompts, date-format, content-types
- **Depends on:** Svelte stores, `$app/stores`
- **Used by:** Components

### Data Flows

**Page Load Flow:**
1. Browser requests page URL
2. SvelteKit matches route in `src/routes/`
3. Server load function (`+page.server.ts`) calls services
4. Services query database via Drizzle ORM
5. Data returned to page as props
6. Svelte component renders with data

**API Request Flow:**
1. Client sends HTTP request to `/api/*` endpoint
2. `hooks.server.ts` handles rate limiting, auth, security headers
3. Route handler (`+server.ts`) validates with Zod
4. Service layer processes business logic
5. Database operations via Drizzle
6. JSON response returned

**AI Improvement Flow:**
1. User initiates improvement from prompt detail page
2. `POST /api/prompts/[id]/improve` receives request
3. `improvement.service.ts` orchestrates policy load, model resolution, OpenCode execution
4. Variants returned and displayed in `improvement-panel.svelte`
5. User selects variant, new version created

### Key Abstractions

**Service Pattern:** Encapsulate business logic with clear interfaces (e.g., `prompts.service.ts`, `versions.service.ts`, `improvement.service.ts`)

**Repository Pattern (Drizzle):** Type-safe database access with schema inference (e.g., `schema.ts`, `client.ts`)

**Error Hierarchy (OpenCode):** `OpenCodeError` base class with `OpenCodeConnectionError`, `OpenCodeAuthenticationError`, `OpenCodeValidationError`, `OpenCodeExecutionError`

**Validator Pattern (Zod):** Runtime type validation with compile-time inference (e.g., `prompt-metadata.ts`)

### Cross-Cutting Concerns

**Logging:** Console-based with structured prefixes; security events via `logSecurityEvent()` from `src/lib/server/audit.ts`

**Validation:** Zod schemas for runtime validation at `src/lib/validators/` and inline in API routes

**Authentication:** Dual system - Better Auth (sessions) + JWT (API tokens); both checked in `hooks.server.ts`

**Authorization:** Route-level protection in `hooks.server.ts`; public routes: `/login`, `/api/health`, `/favicon.ico`, `/static/`; admin via `requireAdmin()`

**Rate Limiting:** In-memory Map with sliding window; general routes: 100 req/min, auth routes: 30 req/min

**Security Headers:** CSP (restrictive, allows Monaco), CORS via `ALLOWED_ORIGINS`, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

---

## Legacy Content: .planning/codebase/STACK.md

**Analysis Date:** 2026-02-14

### Languages
- **Primary:** TypeScript 5.9.3 (strict mode), Svelte 5 (runes: `$state`, `$derived`, `$props`, `$effect`)
- **Secondary:** JavaScript (config files), YAML (frontmatter parsing)

### Runtime
- Node.js 20+ (Docker production: `node:20-alpine`)
- Bun - Primary package manager and runtime for development (`bun.lock` present)

### Frameworks
- **Core:** SvelteKit 2.50.2, Vite 7.3.1, Tailwind CSS 4.1.18
- **Testing:** Vitest 4.0.18 (jsdom), Playwright 1.58.2 (chromium, firefox), @testing-library/svelte 5.3.1
- **Build/Dev:** TypeScript ESLint 8.54.0, Prettier 3.8.1

### Key Dependencies
- **Critical:** `@opencode-ai/sdk` 1.1.53, `drizzle-orm` 0.45.1, `better-auth` 1.4.18
- **UI Components:** `bits-ui` 2.15.5, `@lucide/svelte` 0.563.1, `monaco-editor` 0.55.1, `svelte-sonner` 1.0.7
- **Data & Validation:** `zod` 4.3.6, `yaml` 2.8.2, `diff` 8.0.3
- **Security:** `jsonwebtoken` 9.0.3, `bcrypt` 6.0.0, `@noble/hashes` 2.0.1
- **Infrastructure:** `@libsql/client` 0.17.0, `winston` 3.19.0, `dotenv` 17.2.4

### Configuration
- Environment validation on server start via `src/lib/server/env.ts`
- Required: `DATABASE_URL`; Production required: `OPENCODE_URL`, `ADMIN_PASSWORD`
- Dev server: `127.0.0.1:45678`; Preview: `127.0.0.1:44678`

### Platform Requirements
- **Development:** Bun runtime (or Node.js 20+), SQLite database, OpenCode service (optional, default: `http://localhost:4096`)
- **Production:** Docker multi-stage build, SQLite persistent volume at `/app/data`, OpenCode URL required, environment secrets for auth and API keys

---

## Legacy Content: .planning/codebase/STRUCTURE.md

**Analysis Date:** 2026-02-14

### Directory Layout
```
src/
├── routes/                   # SvelteKit file-based routing
│   ├── api/                  # REST API endpoints
│   ├── prompts/              # Prompt pages
│   ├── admin/                # Admin pages
│   ├── login/                # Login page
│   ├── logout/               # Logout page
│   ├── register/             # Registration page
│   ├── +layout.svelte        # Root layout
│   ├── +layout.server.ts     # Root layout data
│   └── +page.svelte          # Home page
├── lib/
│   ├── server/               # Server-only code
│   │   ├── db/               # Database layer
│   │   ├── services/         # Business logic services
│   │   ├── auth/             # Authentication modules
│   │   ├── opencode/         # OpenCode integration
│   │   ├── config/           # Server configuration
│   │   └── utils/            # Server utilities
│   ├── components/           # UI components
│   ├── stores/               # Client-side state (Svelte 5 class-based stores)
│   ├── validators/           # Zod validation schemas
│   ├── utils/                # Shared utilities
│   └── assets/               # Static assets
```

### Key Server-Only Services
- `prompts.service.ts` - Prompt CRUD
- `versions.service.ts` - Version management
- `improvement.service.ts` - AI improvement orchestration
- `judge.service.ts` - Prompt evaluation
- `opencode.service.ts` - OpenCode SDK wrapper
- `analytics.service.ts` - Metrics and analytics
- `admin-settings.service.ts` - Admin configuration

### Naming Conventions
- **Svelte components:** `kebab-case.svelte`
- **TypeScript modules:** `kebab-case.ts`
- **Route files:** SvelteKit conventions (`+page.svelte`, `+server.ts`, etc.)
- **Test files:** `*.test.ts` (unit), `*.spec.ts` (E2E)
- **Store files:** `*.svelte.ts`
- **Interface/Type names:** PascalCase
- **Schema-inferred types:** `$inferSelect`, `$inferInsert`

### Where to Add New Code
- **New Feature:** `src/routes/[feature]/`, `src/routes/api/[feature]/+server.ts`, `src/lib/server/services/[feature].service.ts`
- **New Component:** `src/lib/components/ui/[component]/`, `src/lib/components/[domain]/[component].svelte`
- **New API Endpoint:** `src/routes/api/[resource]/+server.ts`
- **New Database Table:** `src/lib/server/db/schema.ts` + `drizzle-kit` migration
- **New Test:** `tests/[domain].test.ts`, `e2e/[feature].spec.ts`

---

## Legacy Content: .planning/codebase/INTEGRATIONS.md

**Analysis Date:** 2026-02-14

### OpenCode AI Platform
- SDK: `@opencode-ai/sdk`
- Client: `src/lib/server/opencode/client.ts`
- Config: `OPENCODE_URL` env var (default: `http://localhost:4096`)
- Agents: `prompt-judge` (evaluation), `prompt-improve` (variant generation)
- Features: Session-based execution, provider/model catalog with 5-minute TTL cache, health check

### Data Storage
- **SQLite via libSQL:** `DATABASE_URL` (default: `file:local.db`), Drizzle ORM, Turso-compatible
- **File Storage:** Local filesystem only (`logs/audit.log` via winston)
- **Caching:** In-memory only (rate limit map, provider catalog cache 5-min TTL); no Redis

### Authentication & Identity
- **Better Auth** (self-hosted): `src/lib/auth.ts`, Drizzle/SQLite adapter, scrypt via `@noble/hashes/scrypt`
- **Features:** Email/password, TOTP 2FA, OAuth (GitHub, Google optional), 7-day sessions, JWT API tokens
- **Admin:** `ADMIN_PASSWORD`, `ADMIN_EMAIL`, dev bypass `ALLOW_DEV_BYPASS=true` (never in production)

### Monitoring & Observability
- **Logging:** Winston at `src/lib/server/audit.ts` → console (dev) + `logs/audit.log` (JSON)
- **Health Checks:** `/api/health`, OpenCode health check, Docker HEALTHCHECK
- **Error Tracking:** None (application-level only)

### CI/CD & Deployment
- **Hosting:** Docker containers, `@sveltejs/adapter-auto`
- **CI:** GitHub Actions `.github/workflows/tests.yml` via Docker
- **Compose:** `docker-compose.yml`, `docker-compose.playwright.yml`

### Environment Configuration
- **Required:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `JWT_SECRET`
- **Production required:** `OPENCODE_URL`, `ADMIN_PASSWORD`
- **Optional OAuth:** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Secrets:** Dev in `.env`, Production via Docker secrets/environment injection

### Security Headers
- **CSP:** `default-src 'self'`, `connect-src 'self' http://localhost:4096`
- **CORS:** Configurable via `ALLOWED_ORIGINS`
- **Additional:** X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy, HSTS (production)

---

## Legacy Content: .planning/research/ARCHITECTURE.md

**Researched:** 2026-02-14 | **Confidence:** HIGH

### System Overview Diagram
```
CLIENT LAYER (Prompts, Snippets, Settings, Execution)
    ↓
API LAYER (routes/api/*)
    ↓
SERVICE LAYER (Core Domain, AI Execution, Infrastructure)
    ↓
INTEGRATION LAYER (OpenCode SDK Adapter)
    ↓
PERSISTENCE LAYER (Drizzle ORM + SQLite)
```

### Recommended Services
- **Settings Resolver** - Model selection, policy enforcement, cascade fallback
- **Execution Logger** - Async persistence of execution metadata, timing, tokens
- **Snippet Service** - Variable replacement, preview rendering
- **Council Orchestrator** - Multi-step AI workflows, subagent coordination
- **OpenCode Adapter** - SDK boundary, error mapping
- **Contract Parser** - Agent response validation

### Architectural Patterns

**Pattern 1: Settings Resolution Cascade**
- Multi-level settings with precedence: Request > Preset > User Default > System Default
- Used for configurable model/temperature parameters

**Pattern 2: Execution Logging with Async Persistence**
- Fire-and-forget logging that doesn't block main execution path
- Batch flush every 5 seconds or when queue > 50 items

**Pattern 3: Council Orchestrator (Orchestrator-Worker)**
- Lead agent coordinates, specialized subagents execute in parallel
- Step-based with checkpoint persistence for recovery

**Pattern 4: Snippet Variable Replacement**
- Template engine for prompt content with typed variables
- `{{variable}}` placeholder pattern

### Scaling Considerations
- **0-1k users:** Monolith fine, in-memory log queue, single DB
- **1k-100k users:** Connection pooling, Redis log queue, read replicas
- **100k+ users:** Separate execution workers, async job queue (BullMQ), dedicated log service

### Anti-Patterns Identified
1. **Direct SDK Calls in Routes** - Always go through service layer
2. **Synchronous Logging** - Use async fire-and-forget with batch flush
3. **Settings in Environment Only** - Use database-backed settings with cascade
4. **Monolithic Workflow Functions** - Use step-based orchestrator with checkpoints

### Build Order Implications
- **Phase 1:** Settings Resolver + Execution Logger (foundation, no dependencies)
- **Phase 2:** Snippet Service (independent)
- **Phase 3:** Council Orchestrator (depends on Settings Resolver + Execution Logger)

---

## Legacy Content: .planning/research/STACK.md

**Researched:** 2026-02-14 | **Confidence:** HIGH

### Recommended Stack (Maintain)
- SvelteKit ^2.51.0, Svelte ^5.51.0, Bun (latest)
- Drizzle ORM ^0.45.1, TypeScript ^5.9.3
- OpenCode SDK ^1.2.1 (update from 1.1.53)

### Supporting Libraries
- `sveltekit-sse` ^1.0.0 - SSE streaming for AI responses
- Zod ^4.3.6 - Schema validation (already installed)
- `yaml` ^2.8.2 - Frontmatter parsing
- `tailwind-variants` ^3.2.2 - UI variants

### Feature Stack Requirements
- **Settings Refactor:** Zod v4 + TypeScript strict (no new deps)
- **Prompt Execution:** OpenCode SDK ^1.2.1 + `sveltekit-sse` (NEW)
- **Snippet Variables:** Custom regex (no external dep)
- **Council Modes:** OpenCode SDK ^1.2.1 + Zod v4

### Alternatives Considered
- `sveltekit-sse` vs Native ReadableStream / WebSockets - SSE chosen for cleaner API
- Custom `{{VAR}}` vs Mustache/Handlebars - Custom chosen to avoid over-engineering
- OpenCode SDK vs Vercel AI SDK / Direct Anthropic API - Project committed to OpenCode

### What NOT to Use
- `@anthropic-ai/sdk` (use OpenCode SDK)
- Mustache/Handlebars/EJS/Pug (use custom regex)
- Vercel AI SDK (conflicts with OpenCode)
- WebSocket libraries (SSE simpler for unidirectional)

---

## Legacy Content: docs/spec/SPEC-02-architecture.md

### ARC-001 System Context
- Frontend: SvelteKit UI for settings, prompt editing, testing
- Backend: SvelteKit server routes + service layer
- AI Engine: OpenCode server via `@opencode-ai/sdk`
- Storage: SQLite/libsql via Drizzle

### ARC-002 Module Boundaries
- MOD-001 Settings Module: policy/defaults/provider config
- MOD-002 Prompt Module: CRUD/versioning/snippet rendering
- MOD-003 Execution Module: run prompt, stream, log
- MOD-004 Judge Module: rubric scoring
- MOD-005 Council Module: multi-model orchestration

### ARC-003 Data Flow (Execution)
1. UI submits prompt run request
2. API resolves model by precedence
3. Snippets are rendered to final prompt text
4. Execution service calls OpenCode SDK
5. Response + metrics saved in execution log
6. API returns structured result to UI

### ARC-004 Operational Constraints
- Do not call OpenCode directly from browser; always via server routes
- Keep SDK errors mapped to stable app error codes
- All settings writes must be auditable by key + timestamp

### ARC-005 Reliability Rules
- Retry transient OpenCode failures up to configured limit
- Do not retry validation errors
- Timeout requests based on settings value

### ARC-006 Explicit Behaviors
- Resolution behavior must follow `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`)
- Architecture and API documents must reference policy IDs instead of re-defining precedence
- Error payloads must include stable app code and user action hint for UI rendering

---

## Legacy Content: docs/spec/SPEC-10-settings-schema.md

### SET-001 Purpose
Define all settings keys, types, defaults, and validation so backend and UI share one contract.

### SET-002 Storage
- Backed by `adminSettings` key-value table
- `key` is unique
- `value` is serialized JSON for non-scalar types

### SET-003 Key Registry
| Key | Type | Default | Allowed Values | Used By |
|---|---|---|---|---|
| `opencode_policy_mode` | enum | `restricted` | `restricted`, `open` | Policy engine |
| `opencode_allowed_models` | string[] | `[]` | `provider/model` entries | Policy engine |
| `opencode_global_default_model` | string | `""` | catalog model id | All functions |
| `opencode_timeout_ms` | number | `30000` | `1000..120000` | All functions |
| `opencode_retry_count` | number | `2` | `0..5` | All functions |
| `opencode_retry_delay_ms` | number | `500` | `100..10000` | All functions |
| `opencode_executor_default_model` | string | `""` | catalog model id | Execute |
| `opencode_executor_temperature` | number | `0.2` | `0.0..2.0` | Execute |
| `opencode_executor_max_tokens` | number | `4096` | `1..16384` | Execute |
| `opencode_judge_default_model` | string | `""` | catalog model id | Judge |
| `opencode_judge_temperature` | number | `0.0` | `0.0..1.0` | Judge |
| `opencode_improve_default_model` | string | `""` | catalog model id | Improve |
| `opencode_improve_temperature` | number | `0.5` | `0.0..2.0` | Improve |
| `opencode_council_correct_producer_model` | string | `""` | catalog model id | Council correct |
| `opencode_council_correct_reviewer_model` | string | `""` | catalog model id | Council correct |
| `opencode_council_correct_fix_model` | string | `""` | catalog model id | Council correct |
| `opencode_council_step_timeout_ms` | number | `30000` | `1000..120000` | Council |
| `opencode_stream_enabled` | boolean | `false` | `true/false` | Execute stream |
| `snippet_strict_default` | boolean | `true` | `true/false` | Snippet render |
| `snippet_js_enabled` | boolean | `false` | `true/false` | Snippet render |

### SET-004 Validation Rules
- Unknown key → `SETTINGS_KEY_INVALID`
- Type mismatch → `SETTINGS_VALUE_INVALID`
- Number out of range → `SETTINGS_VALUE_INVALID`
- Invalid model id format → `SETTINGS_VALUE_INVALID`

### SET-005 Default/Override/Fallback/Error
- Default values listed in `SET-003`
- Overrides happen in runtime APIs and prompt-level settings
- Fallback and precedence follow `POL-002` and `POL-003`
- If no value can be resolved, return `MODEL_RESOLUTION_FAILED`

### SET-006 UI Binding Rules
- Each key bound to specific form control type
- Save action validates against schema before persistence
- UI must show value source when inherited from global default

---

## Legacy Content: docs/plans/ai-settings-architecture/ARCHITECTURE_ANALYSIS.md

**Date:** 2026-02-23 | **Canonical route:** `src/routes/settings/+page.svelte`

### Decision Snapshot
1. `model + variant` becomes first-class in backend settings flows
2. Variant choices in Function Defaults and LLM Council must be constrained by current AI Policy whitelist/matrix
3. If a stored variant is no longer allowed, behavior is **hard fail** (no silent fallback)
4. Model Catalog must expose richer model/provider capabilities

### Current Architecture (As Is)
- Settings shell: `src/routes/settings/+page.svelte`
- Server aggregator: `src/routes/settings/+page.server.ts`
- Domain sections: connection, providers, AI policy, function defaults, LLM council, model catalog, presets
- Policy can whitelist model variants, but Defaults/Council selectors do not fully persist/enforce variant

### Gap Analysis
1. **Variant propagation gap** - Policy whitelists variants but Defaults/Council do not persist/enforce variant as backend identity
2. **Catalog depth gap** - Missing reasoning level variants, tool support, JSON mode, context/output limits, pricing, policy-overlay status
3. **Validation gap** - No single central validator enforcing `(scope, model, variant)` against policy matrix

### Target Architecture (To Be)
1. **Policy as source of selectable variants** - Defaults and Council UIs derive variant options from policy authority, filtered by scope
2. **First-class `modelVariant` in settings chain** - `UI selection -> API payload -> DB storage -> settings cascade -> runtime request`
3. **Hard-fail policy** - Return typed validation failure (`400/422`) with reason and remediation; no auto-fallback
4. **Catalog v2: rich and policy-aware** - Provider metadata, model metadata, variant list per model, policy overlay per scope

### End-to-End Behavior by Section
| Section | Required update |
|---------|----------------|
| AI Policy | Keep as authority; add explicit diagnostics for variant coverage gaps |
| Function Defaults | Add variant picker tied to selected model; options filtered by policy scope; persist `modelVariant` |
| LLM Council | Add variant picker per member; options filtered by council scope; persist `modelVariant` |
| Model Catalog | Show richer capabilities and explicit variants per model; include policy overlay status |
| Runtime consumers | Accept resolved variant from cascade and pass through to OpenCode adapter layer |

### Backend Trace (Target)
- `/api/admin/function-defaults/[type]` - accept/store/validate `modelVariant`
- `/api/admin/council-agents*` - accept/store/validate `modelVariant`
- `/api/opencode/providers` - return enriched catalog with variant and capability payload
- **Service layer:** Add central validator module; extend cascade service to resolve variant + source
- **Storage layer:** Add `function_defaults.model_variant`, `prompt_function_settings.model_variant_override`, `council_agents.model_variant`

### Runtime Impact
- `execute`, `judge`, `improve` endpoints must receive deterministic resolved variant from backend resolution
- All three must receive deterministic resolved variant from backend resolution, not infer ad-hoc

### Error Model (Hard Fail)
- Typed errors: `MODEL_VARIANT_NOT_ALLOWED`, `MODEL_VARIANT_UNAVAILABLE`, `MODEL_VARIANT_REQUIRED`
- Validate on save (admin endpoints) and on resolve (runtime)
- Fail fast with actionable message; no variant auto-fallback

### Diagram Coverage
- Diagrams in `docs/plans/ai-settings-architecture/diagrams/` updated for variant-aware policy/defaults/council linkage, hard-fail resolution gate, ERD with variant columns

### Reference Paths
- `src/lib/server/services/settings-cascade.service.ts`
- `src/lib/server/services/function-defaults.service.ts`
- `src/lib/server/services/opencode.service.ts`
- `src/routes/api/admin/function-defaults/[type]/+server.ts`
- `src/routes/api/admin/council-agents/+server.ts`
- `src/routes/api/opencode/providers/+server.ts`
