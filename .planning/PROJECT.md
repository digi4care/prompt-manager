# Prompt Management System (gsd-build)

## What This Is

A spec-driven prompt management application for OpenCode integration. Users create, edit, version, test, and execute prompts through an AI-powered workflow with improvement loops, rubric-based judging, and multi-model council orchestration.

## Core Value

**Settings-first execution** — Every prompt execution resolves model/temperature/parameters through a deterministic precedence chain. Users can trust that the same prompt with the same settings produces consistent, auditable results.

## Requirements

### Validated

- ✓ Prompt CRUD with metadata — existing
- ✓ Version history with diff visualization — existing
- ✓ AI-powered improvement loop — existing
- ✓ Rubric-based judging — existing
- ✓ Admin settings management — existing
- ✓ Better Auth + JWT authentication — existing
- ✓ Rate limiting and security headers — existing

### Active

- [ ] Settings refactor for function defaults (executor, judge, improve, council)
- [ ] Prompt execution endpoint with model resolution
- [ ] Execution logging with tokens, duration, model source
- [ ] Snippet variables ({{VAR}}) with rendering service
- [ ] Preview panel in prompt editor
- [ ] Test runner UI for prompt execution
- [ ] Streaming execution (SSE)
- [ ] Council mode 'correct' (producer → reviewer → fix)
- [ ] Council modes 'debate' and 'consensus' (P3)

### Out of Scope

- Cost optimization engine — deferred, not core to P1 value
- Full enterprise RBAC — admin auth sufficient for P1
- Background queue workers — synchronous execution acceptable for P1
- JavaScript snippet sandboxing — P3 feature, security review needed

## Context

**Domain Ecosystem:**

- OpenCode SDK (`@opencode-ai/sdk`) for AI execution
- SvelteKit full-stack with service layer architecture
- Existing codebase has solid foundation: prompts, versions, improvement, judging

**Existing Architecture:**

- SvelteKit routes + service layer pattern
- Drizzle ORM with SQLite/libsql
- Dual auth: Better Auth (sessions) + JWT (API tokens)
- OpenCode adapter with domain-specific error handling

**Key Files:**

- `src/lib/server/services/opencode.service.ts` — AI integration
- `src/lib/server/services/admin-settings.service.ts` — settings source of truth
- `src/lib/server/db/schema.ts` — existing tables (prompts, versions, etc.)
- `docs/spec/*.md` — comprehensive specification documents

## Constraints

- **Tech Stack**: SvelteKit 5, Bun, Drizzle ORM, OpenCode SDK — locked by existing codebase
- **Database**: Additive changes only — no drop/rename of existing columns
- **OpenCode Integration**: Always via server routes, never from browser
- **Error Handling**: All errors mapped to stable app error codes (ERR-\*)
- **Precedence**: Model/parameter resolution defined only in SPEC-06 policies

## Key Decisions

| Decision                     | Rationale                                                 | Outcome   |
| ---------------------------- | --------------------------------------------------------- | --------- |
| OpenCode SDK over direct API | SDK provides session management, streaming, error mapping | ✓ Good    |
| Drizzle ORM                  | Type-safe, SQLite-compatible, existing investment         | ✓ Good    |
| Settings-first execution     | Deterministic, auditable, testable                        | — Pending |
| Snippet {{VAR}} syntax       | Familiar, works in YAML frontmatter                       | — Pending |
| SSE for streaming            | Standard protocol, browser-native EventSource             | — Pending |

---

_Last updated: 2026-02-14 after initialization_
