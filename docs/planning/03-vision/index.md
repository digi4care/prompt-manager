# 03 -- Product Vision

## Vision Statement
A spec-driven prompt management application where every execution is deterministic, auditable, and improvable through AI-powered workflows.

## Core Value Proposition
**Settings-first execution** -- Every prompt execution resolves model/temperature/parameters through a deterministic precedence chain (run > prompt > default).

## Goals
- [x] Prompt CRUD with metadata and versioning
- [x] Diff visualization for version comparison
- [x] AI-powered improvement loop with variant generation
- [x] Rubric-based judging with score and feedback
- [x] Admin settings with model catalog and policies
- [x] Better Auth authentication with admin protection
- [x] Rate limiting and security headers
- [ ] Settings refactor for function defaults (executor, judge, improve, council)
- [ ] Execution logging with tokens, duration, model source
- [ ] Snippet variables ({{VAR}}) with rendering
- [ ] Streaming execution via SSE
- [ ] Council modes: correct, debate, consensus

## Non-Goals
- Cost optimization engine
- Full enterprise RBAC
- Background queue workers
- JavaScript snippet sandboxing
- Mobile app

## Success Metrics
- All prompt executions resolve model via cascade
- 100% of executions create audit log
- Settings changes take effect immediately
- Zero auth bypass incidents
## Legacy Content: .planning/PROJECT.md

### Requirements

#### Validated
- Prompt CRUD with metadata — existing
- Version history with diff visualization — existing
- AI-powered improvement loop — existing
- Rubric-based judging — existing
- Admin settings management — existing
- Better Auth + JWT authentication — existing
- Rate limiting and security headers — existing

#### Active
- Settings refactor for function defaults (executor, judge, improve, council)
- Prompt execution endpoint with model resolution
- Execution logging with tokens, duration, model source
- Snippet variables ({{VAR}}) with rendering service
- Preview panel in prompt editor
- Test runner UI for prompt execution
- Streaming execution (SSE)
- Council mode 'correct' (producer → reviewer → fix)
- Council modes 'debate' and 'consensus' (P3)

#### Out of Scope (from PROJECT.md)
- Cost optimization engine — deferred, not core to P1 value
- Full enterprise RBAC — admin auth sufficient for P1
- Background queue workers — synchronous execution acceptable for P1
- JavaScript snippet sandboxing — P3 feature, security review needed

### Context / Domain Ecosystem
- OpenCode SDK (`@opencode-ai/sdk`) for AI execution
- SvelteKit full-stack with service layer architecture
- Existing codebase has solid foundation: prompts, versions, improvement, judging

### Existing Architecture
- SvelteKit routes + service layer pattern
- Drizzle ORM with SQLite/libsql
- Dual auth: Better Auth (sessions) + JWT (API tokens)
- OpenCode adapter with domain-specific error handling

### Key Files
- `src/lib/server/services/opencode.service.ts` — AI integration
- `src/lib/server/services/admin-settings.service.ts` — settings source of truth
- `src/lib/server/db/schema.ts` — existing tables (prompts, versions, etc.)
- `docs/spec/*.md` — comprehensive specification documents

### Constraints (from PROJECT.md)
- **Tech Stack**: SvelteKit 5, Bun, Drizzle ORM, OpenCode SDK — locked by existing codebase
- **Database**: Additive changes only — no drop/rename of existing columns
- **OpenCode Integration**: Always via server routes, never from browser
- **Error Handling**: All errors mapped to stable app error codes (ERR-*)
- **Precedence**: Model/parameter resolution defined only in SPEC-06 policies

### Key Decisions
| Decision | Rationale | Outcome |
| OpenCode SDK over direct API | SDK provides session management, streaming, error mapping | Good |
| Drizzle ORM | Type-safe, SQLite-compatible, existing investment | Good |
| Settings-first execution | Deterministic, auditable, testable | Pending |
| Snippet {{VAR}} syntax | Familiar, works in YAML frontmatter | Pending |
| SSE for streaming | Standard protocol, browser-native EventSource | Pending |

_Last updated: 2026-02-14 after initialization_

## Legacy Content: SPEC-00-vision.md

### VSN-001 Product Goal
Build a prompt-management platform where teams can create, version, test, evaluate, and improve prompts using OpenCode SDK as execution engine.

### VSN-002 PoC Goal
Deliver a working website flow where a user configures AI defaults in Settings, opens a prompt, fills variables/snippets, runs execution, and sees result + metrics.

### VSN-003 Primary User Outcomes
- Users can set provider/model defaults per function (executor, judge, improve, council).
- Users can override model per prompt and per run.
- Users can test prompts safely and repeatedly.

### VSN-004 Non-Goals For PoC
- No production-grade billing dashboard.
- No multi-tenant org permissions redesign.
- No full workflow automation engine.

### VSN-005 Measurable Success Criteria
- SC-001: Settings save/load roundtrip works for all function defaults.
- SC-002: Prompt execution from UI returns response within 30s in normal conditions.
- SC-003: Snippet replacement works for at least 5 placeholders in one prompt.
- SC-004: Execution log is persisted with model, duration, token counts.
- SC-005: Error states are visible and actionable (connection/model/validation).

### VSN-006 Key Constraints
- Use Bun tooling and scripts only.
- Keep existing DB data compatible; additive migrations only.
- Reuse existing project conventions and component patterns.
