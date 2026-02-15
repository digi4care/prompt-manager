# Technology Stack

**Analysis Date:** 2026-02-14

## Languages

**Primary:**

- TypeScript 5.9.3 - Used throughout the codebase (strict mode enabled)
- Svelte 5 - Component framework with runes (`$state`, `$derived`, `$props`, `$effect`)

**Secondary:**

- JavaScript - Limited to config files and scripts
- YAML - Used for frontmatter parsing and prompt metadata

## Runtime

**Environment:**

- Node.js 20+ (Docker production stage uses `node:20-alpine`)
- Bun - Primary package manager and runtime for development

**Package Manager:**

- Bun - Preferred runtime for all commands
- Lockfile: `bun.lock` present
- Fallback: npm (for production Docker stage)

## Frameworks

**Core:**

- SvelteKit 2.50.2 - Full-stack framework with file-based routing
- Vite 7.3.1 - Build tool and dev server
- Tailwind CSS 4.1.18 - Styling with CSS-first configuration

**Testing:**

- Vitest 4.0.18 - Unit testing with jsdom environment
- Playwright 1.58.2 - E2E testing (chromium, firefox)
- @testing-library/svelte 5.3.1 - Component testing utilities

**Build/Dev:**

- Vite plugins: `@sveltejs/vite-plugin-svelte`, `@tailwindcss/vite`, `vite-plugin-devtools-json`
- TypeScript ESLint 8.54.0 - Linting with flat config format
- Prettier 3.8.1 - Code formatting

## Key Dependencies

**Critical:**

- `@opencode-ai/sdk` 1.1.53 - AI agent execution framework (primary AI integration)
- `drizzle-orm` 0.45.1 - Type-safe ORM for SQLite
- `better-auth` 1.4.18 - Authentication with 2FA support

**UI Components:**

- `bits-ui` 2.15.5 - Headless UI primitives
- `@lucide/svelte` 0.563.1 - Icon library
- `monaco-editor` 0.55.1 - Code editor component
- `svelte-sonner` 1.0.7 - Toast notifications

**Data & Validation:**

- `zod` 4.3.6 - Schema validation
- `yaml` 2.8.2 - YAML parsing for frontmatter
- `diff` 8.0.3 - Version diff visualization

**Security:**

- `jsonwebtoken` 9.0.3 - JWT token generation
- `bcrypt` 6.0.0 - Password hashing
- `@noble/hashes` 2.0.1 - Cryptographic utilities (scrypt for Better Auth)

**Infrastructure:**

- `@libsql/client` 0.17.0 - SQLite client (Turso-compatible)
- `winston` 3.19.0 - Structured logging
- `dotenv` 17.2.4 - Environment variable loading

## Configuration

**Environment:**

- Environment validation on server start via `src/lib/server/env.ts`
- Required: `DATABASE_URL`
- Production required: `OPENCODE_URL`, `ADMIN_PASSWORD`
- See `.env.example` for full configuration options

**Build:**

- `svelte.config.js` - SvelteKit configuration with `adapter-auto`
- `vite.config.ts` - Vite configuration with `$lib` alias
- `tsconfig.json` - TypeScript strict mode configuration
- `drizzle.config.ts` - Drizzle ORM configuration (SQLite dialect)

**Development Ports:**

- Dev server: `127.0.0.1:45678`
- Preview server: `127.0.0.1:44678`

## Platform Requirements

**Development:**

- Bun runtime (or Node.js 20+)
- SQLite database (local file or Turso)
- OpenCode service (optional, defaults to `http://localhost:4096`)

**Production:**

- Docker with multi-stage build (Node.js 20 Alpine)
- SQLite database (persistent volume at `/app/data`)
- OpenCode service URL required
- Environment secrets for auth and API keys

---

_Stack analysis: 2026-02-14_
