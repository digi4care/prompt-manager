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
