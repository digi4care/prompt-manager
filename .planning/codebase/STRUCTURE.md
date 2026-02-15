# Codebase Structure

**Analysis Date:** 2026-02-14

## Directory Layout

```
gsd-build/
├── src/                          # Source code
│   ├── routes/                   # SvelteKit routes (file-based routing)
│   │   ├── api/                  # REST API endpoints
│   │   ├── prompts/              # Prompt pages (list, detail, edit, improve)
│   │   ├── admin/                # Admin pages (settings, profile)
│   │   ├── analytics/            # Analytics dashboard
│   │   ├── login/                # Login page
│   │   ├── logout/               # Logout page
│   │   ├── register/             # Registration page
│   │   ├── test/                 # Test UI page (dev only)
│   │   ├── +layout.svelte        # Root layout
│   │   ├── +layout.server.ts     # Root layout data
│   │   └── +page.svelte          # Home page
│   ├── lib/                      # Shared library code
│   │   ├── server/               # Server-only code
│   │   │   ├── db/               # Database layer
│   │   │   ├── services/         # Business logic services
│   │   │   ├── auth/             # Authentication modules
│   │   │   ├── opencode/         # OpenCode integration
│   │   │   ├── config/           # Server configuration
│   │   │   └── utils/            # Server utilities
│   │   ├── components/           # UI components
│   │   │   ├── ui/               # Base UI components
│   │   │   ├── prompts/          # Prompt-related components
│   │   │   ├── improvement/      # AI improvement components
│   │   │   ├── layout/           # Layout components
│   │   │   ├── visualizations/   # Charts and dashboards
│   │   │   ├── versions/         # Version history components
│   │   │   └── admin/            # Admin settings components
│   │   ├── stores/               # Client-side state stores
│   │   ├── validators/           # Zod validation schemas
│   │   ├── utils/                # Shared utilities
│   │   ├── assets/               # Static assets (SVGs)
│   │   ├── opencode/             # Client-side OpenCode helpers
│   │   ├── auth.ts               # Better Auth configuration
│   │   ├── index.ts              # Lib barrel export
│   │   ├── utils.ts              # Utility functions (cn, etc.)
│   │   └── monaco.ts             # Monaco editor lazy loading
│   ├── app.html                  # HTML template
│   ├── app.css                   # Global styles
│   ├── app.d.ts                  # Type declarations
│   └── hooks.server.ts           # Server hooks (auth, rate limiting)
├── tests/                        # Unit and integration tests
│   ├── mocks/                    # Test mocks
│   ├── server/                   # Server-side tests
│   ├── stores/                   # Store tests
│   ├── improvement/              # Improvement flow tests
│   ├── integration/              # Integration tests
│   ├── unit/                     # Unit tests
│   ├── validators/               # Validator tests
│   ├── opencode/                 # OpenCode tests
│   └── setup.ts                  # Test setup
├── e2e/                          # Playwright E2E tests
├── static/                       # Static files served directly
├── scripts/                      # Build and utility scripts
├── docs/                         # Documentation
├── ai_docs/                      # AI-specific documentation
├── .opencode/                    # OpenCode configuration
├── .planning/                    # Planning documents
├── coverage/                     # Test coverage reports
├── temp/                         # Temporary files
├── package.json                  # Dependencies and scripts
├── svelte.config.js              # SvelteKit configuration
├── vite.config.ts                # Vite configuration
├── vitest.config.ts              # Vitest configuration
├── playwright.config.ts          # Playwright configuration
├── drizzle.config.ts             # Drizzle ORM configuration
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.js              # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── components.json               # shadcn-svelte configuration
├── Dockerfile                    # Production Docker image
├── docker-compose.yml            # Docker Compose for dev
└── docker-compose.playwright.yml # Docker Compose for E2E tests
```

## Directory Purposes

### `src/routes/`

- **Purpose:** SvelteKit file-based routing
- **Contains:** Page components, server load functions, API endpoints
- **Key files:**
  - `+page.svelte` - Page component
  - `+page.server.ts` - Server-side data loading
  - `+server.ts` - REST API endpoints
  - `+layout.svelte` - Layout wrapper
  - `+layout.server.ts` - Layout data

### `src/routes/api/`

- **Purpose:** REST API endpoints
- **Contains:**
  - `prompts/` - Prompt CRUD operations
  - `admin/` - Admin settings, health checks
  - `ai/` - AI chat endpoint
  - `judge/` - Prompt evaluation
  - `opencode/` - OpenCode health and providers
  - `expertise/` - Domain expertise files
  - `patterns/` - Extracted patterns

### `src/lib/server/`

- **Purpose:** Server-only code (never exposed to client)
- **Contains:** Database, services, authentication, OpenCode integration
- **Key convention:** Any file under `server/` is excluded from client bundle

### `src/lib/server/services/`

- **Purpose:** Business logic layer
- **Contains:** Domain services
- **Key files:**
  - `prompts.service.ts` - Prompt CRUD
  - `versions.service.ts` - Version management
  - `improvement.service.ts` - AI improvement orchestration
  - `judge.service.ts` - Prompt evaluation
  - `opencode.service.ts` - OpenCode SDK wrapper
  - `analytics.service.ts` - Metrics and analytics
  - `admin-settings.service.ts` - Admin configuration

### `src/lib/server/db/`

- **Purpose:** Database layer with Drizzle ORM
- **Contains:**
  - `schema.ts` - Table definitions, relations, types
  - `client.ts` - Database connection singleton
  - `seed.ts` - Initial data seeding
  - `seed-mock-prompts.ts` - Test data generation
  - `utils.ts` - Database utilities

### `src/lib/server/auth/`

- **Purpose:** Authentication modules
- **Contains:**
  - `jwt.ts` - JWT token generation and verification

### `src/lib/components/`

- **Purpose:** Reusable UI components
- **Structure:** Organized by domain (ui, prompts, improvement, layout, etc.)
- **Key files:**
  - `ui/*/index.ts` - Barrel exports for UI primitives
  - `prompts/prompt-editor.svelte` - Monaco-based prompt editor
  - `prompts/prompt-list.svelte` - Prompt list display
  - `improvement/improvement-panel.svelte` - AI improvement workflow

### `src/lib/components/ui/`

- **Purpose:** Base UI primitives (shadcn-svelte components)
- **Contains:** button, card, dialog, dropdown-menu, input, label, progress, tabs, textarea, theme-toggle, toast
- **Convention:** Each component in its own directory with `index.ts` barrel export

### `src/lib/stores/`

- **Purpose:** Client-side state management
- **Contains:** Svelte 5 class-based stores with runes
- **Key files:**
  - `auth.svelte.ts` - Authentication state
  - `prompts.svelte.ts` - Prompt cache and operations

### `src/lib/validators/`

- **Purpose:** Runtime validation schemas
- **Contains:** Zod schemas for form/API validation
- **Key files:**
  - `prompt-metadata.ts` - Prompt metadata validation

### `src/lib/utils/`

- **Purpose:** Shared utility functions
- **Contains:** Date formatting, clipboard, unsaved changes handling

### `tests/`

- **Purpose:** Unit and integration tests
- **Contains:** Vitest tests organized by domain
- **Key files:**
  - `setup.ts` - Test environment setup
  - `*.test.ts` - Test files
  - `mocks/` - Mock implementations

### `e2e/`

- **Purpose:** End-to-end tests
- **Contains:** Playwright test specs
- **Key files:**
  - `helpers.ts` - E2E test utilities
  - `*.spec.ts` - Playwright test files

## Key File Locations

### Entry Points

- `src/hooks.server.ts` - Server request handler (auth, rate limiting, security)
- `src/app.html` - HTML template with theme/font preferences
- `src/routes/+layout.svelte` - Root layout component

### Configuration

- `svelte.config.js` - SvelteKit adapter and CSRF settings
- `vite.config.ts` - Vite build configuration
- `vitest.config.ts` - Vitest test configuration
- `playwright.config.ts` - Playwright E2E configuration
- `drizzle.config.ts` - Drizzle ORM configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint flat config
- `.prettierrc` - Prettier formatting rules
- `components.json` - shadcn-svelte registry config

### Core Logic

- `src/lib/server/db/schema.ts` - Database schema and types
- `src/lib/server/services/prompts.service.ts` - Prompt business logic
- `src/lib/server/services/improvement.service.ts` - AI improvement logic
- `src/lib/server/services/opencode.service.ts` - OpenCode SDK integration
- `src/lib/auth.ts` - Better Auth configuration

### Testing

- `tests/setup.ts` - Vitest setup
- `tests/prompts.test.ts` - Prompt service tests
- `tests/versions.test.ts` - Version tests
- `e2e/prompts.spec.ts` - Prompt E2E tests
- `e2e/improve-flow.spec.ts` - Improvement flow E2E tests

## Naming Conventions

### Files

- **Svelte components:** `kebab-case.svelte` (e.g., `prompt-editor.svelte`, `prompt-card.svelte`)
- **TypeScript modules:** `kebab-case.ts` (e.g., `prompts.service.ts`, `prompt-metadata.ts`)
- **Route files:** SvelteKit conventions (`+page.svelte`, `+page.server.ts`, `+server.ts`, `+layout.svelte`)
- **Test files:** `*.test.ts` for unit tests, `*.spec.ts` for E2E tests
- **Store files:** `*.svelte.ts` for Svelte 5 class-based stores

### Directories

- **Feature directories:** `kebab-case` (e.g., `prompt-editor/`, `improvement-panel/`)
- **UI components:** Lowercase (e.g., `button/`, `card/`, `dialog/`)
- **Route directories:** `kebab-case` or `[param]` for dynamic routes

### TypeScript Types

- **Interface names:** PascalCase (e.g., `ListPromptsResult`, `ModelSelection`)
- **Type names:** PascalCase (e.g., `Prompt`, `NewPrompt`, `SortField`)
- **Schema-inferred types:** Use `$inferSelect` and `$inferInsert` from Drizzle

## Where to Add New Code

### New Feature

- **Page:** `src/routes/[feature]/+page.svelte` and `+page.server.ts`
- **API:** `src/routes/api/[feature]/+server.ts`
- **Service:** `src/lib/server/services/[feature].service.ts`
- **Tests:** `tests/[feature].test.ts` and `e2e/[feature].spec.ts`

### New Component

- **UI primitive:** `src/lib/components/ui/[component]/`
- **Domain component:** `src/lib/components/[domain]/[component].svelte`
- **Include:** Component file, `index.ts` barrel export

### New API Endpoint

- **File:** `src/routes/api/[resource]/+server.ts`
- **Pattern:** Export `GET`, `POST`, `PUT`, `DELETE` handlers
- **Validation:** Use Zod schemas inline or from `src/lib/validators/`

### New Database Table

- **Schema:** Add to `src/lib/server/db/schema.ts`
- **Relations:** Define in same file with `relations()`
- **Types:** Export inferred types (`$inferSelect`, `$inferInsert`)
- **Migration:** Run `npm run db:generate` then `npm run db:migrate`

### New Utility

- **Shared:** `src/lib/utils/[name].ts` or `src/lib/utils.ts`
- **Server-only:** `src/lib/server/utils/[name].ts`

### New Test

- **Unit test:** `tests/[domain].test.ts` or `tests/[domain]/[feature].test.ts`
- **E2E test:** `e2e/[feature].spec.ts`
- **Mock:** `tests/mocks/[name].ts`

## Special Directories

### `.opencode/`

- **Purpose:** OpenCode CLI configuration and skills
- **Contains:** Agent configs, skills, context files
- **Generated:** Partially (some files are project config)
- **Committed:** Yes

### `.planning/`

- **Purpose:** Planning documents and codebase analysis
- **Contains:** Phase plans, research, codebase maps
- **Generated:** By GSD workflow commands
- **Committed:** Yes

### `coverage/`

- **Purpose:** Test coverage reports
- **Generated:** By `npm run test:coverage`
- **Committed:** No (in .gitignore)

### `static/`

- **Purpose:** Files served at root URL
- **Contains:** Static assets that bypass SvelteKit processing
- **Committed:** Yes

### `temp/`

- **Purpose:** Temporary working files
- **Generated:** During development
- **Committed:** No (in .gitignore)

### `ai_docs/`

- **Purpose:** AI-specific documentation and context
- **Contains:** Project-specific AI instructions
- **Committed:** Yes

---

_Structure analysis: 2026-02-14_
