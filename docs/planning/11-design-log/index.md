# 11 -- Design Log

## DEC-001: OpenCode SDK over direct API
**Decision:** Use OpenCode SDK instead of direct HTTP API calls.
**Rationale:** SDK provides session management, streaming, error mapping.
**Outcome:** Good. Clean integration via src/lib/server/services/opencode.service.ts.

## DEC-002: Settings-first execution
**Decision:** Every execution resolves model via deterministic cascade: run > prompt > default.
**Rationale:** Deterministic, auditable, testable.
**Outcome:** Partial. Legacy settings exist; new registry in progress.
**Constraints:** Dual system during migration.

## DEC-003: Drizzle ORM
**Decision:** Use Drizzle ORM with SQLite/libsql.
**Rationale:** Type-safe, SQLite-compatible, existing investment.
**Outcome:** Good. Clean schema definitions in src/lib/server/db/schema.ts.

## DEC-004: Dual Auth (Better Auth + JWT)
**Decision:** Better Auth for sessions, legacy JWT for API tokens.
**Rationale:** Better Auth handles modern auth; JWT keeps API compatibility.
**Outcome:** Partial. JWT auth bypass was a security issue (fixed).
**Constraints:** May consolidate to Better Auth-only in future.

## DEC-005: Settings Schema Registry
**Decision:** Build new settings registry with dependency graph, cascade resolution, visibility conditions.
**Rationale:** Legacy settings (756-line monolithic page) is unmaintainable.
**Outcome:** In progress. 177 tests passing. API persistence merged.
**Constraints:** Must maintain backward compatibility during cutover.

## DEC-006: Better-Auth Instrumentation Shim
**Decision:** Create Vite alias shim for @better-auth/core/instrumentation.
**Rationale:** better-auth@1.5.0 dist imports from non-exported subpath.
**Outcome:** Working. Server starts successfully.
**Constraints:** Monitor for upstream fix.

## DEC-007: Settings Schema Registry v1

**Decision:** Define all settings keys, types, defaults, and validation in a shared registry so backend and UI share one contract.
**Rationale:** Prevents drift between frontend forms and backend persistence; enables programmatic validation.
**Outcome:** In progress. 177 tests passing. Key registry covers opencode policy mode, allowed models, global defaults, function-specific defaults (executor, judge, improve, council), timeout/retry parameters, and snippet rendering flags.
**Constraints:** Must maintain backward compatibility during cutover from legacy settings.

## DEC-008: AI Settings Contract v1 (Variant-Aware)

**Decision:** Make `model + variant` first-class through admin, DB, cascade, and runtime with hard-fail behavior.
**Rationale:** Model variants (low, medium, high, xhigh) are policy-scoped and must not silently fallback.
**Outcome:** Defined shared types (`FunctionType`, `PolicyScope`, `ModelId`, `ModelVariant`), endpoint matrix, request/response contracts, and validation rules. Three new error codes: `MODEL_VARIANT_REQUIRED`, `MODEL_VARIANT_NOT_ALLOWED`, `MODEL_VARIANT_UNAVAILABLE`.
**Constraints:** Clients omitting `modelVariant` remain valid only for models with exactly one allowed variant.

## DEC-009: SOLID/DRY/Security Refactor Blueprint

**Decision:** Execute a 6-phase refactor to enforce policy constraints by scope with hard-fail behavior, expand Model Catalog to capability-rich payloads, and improve security consistency.
**Rationale:** Admin mutation auth checks are inconsistent; variant is not first-class in defaults/council storage; no full chain enforcement for policy-scoped variants.
**Outcome:** Phases defined: 0-Lock Current Behavior, 1-Security Hardening, 2-Variant Data Model Foundation, 3-API+Cascade+Runtime Enforcement, 4-Model Catalog v2, 5-UI Variant Selection Integration, 6-DRY Cleanup and Legacy Retirement.
**Constraints:** Must not break existing execution paths during rollout.

## DEC-010: Database Architecture - Option A Hardening

**Decision:** Harden existing schema by adding variant columns to existing tables rather than full policy domain migration.
**Rationale:** Minimal migration risk; fastest delivery for required feature set.
**Outcome:** Add `model_variant` to `function_defaults`, `prompt_function_settings`, and `council_agents`. Keep policy in `admin_settings` keys. Add centralized validator for `(scope, model, variant)`. Recommended path: Option A now, Option B (typed policy tables) next.
**Constraints:** Policy remains JSON-text based; DB-level policy integrity remains indirect.

## DEC-011: Codebase Conventions

**Decision:** Enforce consistent naming, code style, import organization, error handling, validation, logging, and Svelte 5 patterns across the codebase.
**Rationale:** Brownfield project with multiple contributors; conventions reduce cognitive load and prevent regressions.
**Outcome:** Documented in `.planning/codebase/CONVENTIONS.md` (2026-02-14).
**Key conventions:**
- Files: lowercase with dashes; test files `.test.ts` or `.spec.ts`; barrel files `index.ts`
- Functions: camelCase; explicit return types; return `null` for not found
- Types: PascalCase; input types suffixed with `Input`; result types suffixed with `Result`
- Formatting: Prettier with tabs, single quotes, no trailing commas, print width 100
- Validation: Zod schemas with `safeParse()`; `flatten()` for error responses
- Error handling: `throw error(status, message)` from `@sveltejs/kit`; JSON error format `{ message, errors }`
- Svelte 5: `$state()`, `$derived()`, `$props()`, `$effect()`, `$bindable()`
- Drizzle: `returning()` for insert/update; soft delete with `deletedAt`; `isNull()` for non-deleted queries
- API: Pagination with `{ data, pagination: { limit, offset, hasMore } }`

## DEC-012: Risk Register Baseline

**Decision:** Maintain an explicit risk register tracking tech debt, known bugs, security considerations, performance bottlenecks, fragile areas, scaling limits, dependencies at risk, missing critical features, and test coverage gaps.
**Rationale:** Defense/finance/healthcare adjacent domain; bugs have material impact.
**Outcome:** Register established from `.planning/codebase/CONCERNS.md` (2026-02-14).

### Critical Risks

| ID | Category | Risk | Impact | Mitigation |
|---|---|---|---|---|
| RSK-001 | Security | Hardcoded JWT secret fallback allows auth bypass | Critical | Remove default; throw if `JWT_SECRET` missing in production |
| RSK-002 | Security | Development mode auth bypass without explicit flag | High | Require `DEV_AUTH_BYPASS=true`; add UI indicator |
| RSK-003 | Security | CSP allows unsafe-inline/eval | High | Remove from CSP; use nonces; refactor Monaco if needed |
| RSK-004 | Security | CORS wildcard for origins | Medium | Remove wildcard fallback; require explicit origin list |
| RSK-005 | Security | No audit log persistence | High | Implement persistent audit log |
| RSK-006 | Functionality | Placeholder functions (improvePrompt, judgePrompt) throw "not implemented" | High | Implement using executeAgentWithSession pattern |
| RSK-007 | Functionality | Unauthenticated user ID in versions (hardcoded 'user') | Medium | Integrate with auth system for real user ID |
| RSK-008 | Functionality | Test page route (`/test`) accessible in production | Medium | Add auth guard or exclude from production build |
| RSK-009 | Performance | In-memory rate limiting resets on restart | Medium | Use Redis or DB-backed rate limiting |
| RSK-010 | Performance | N+1 query pattern in analytics | Medium | Consolidate into single query with aggregations |
| RSK-011 | Performance | No DB connection pooling | Medium | Configure connection pool for production |
| RSK-012 | Performance | In-memory provider catalog cache not shared across instances | Low | Use Redis for distributed caching |
| RSK-013 | Scaling | SQLite/libsql single file database | Medium | Migrate to PostgreSQL for production scale |
| RSK-014 | Scaling | No pagination on some endpoints | Medium | Add cursor-based pagination |
| RSK-015 | Dependencies | @opencode-ai/sdk frequent updates | Medium | Pin version; test updates in isolation |
| RSK-016 | Dependencies | better-auth relatively new, evolving patterns | Medium | Consider abstracting auth layer |
| RSK-017 | Dependencies | Monaco Editor large bundle size + CSP conflicts | Low | Consider CodeMirror as lighter alternative |
| RSK-018 | Test Coverage | analytics.service.ts untested | Medium | Add unit tests |
| RSK-019 | Test Coverage | improvement.service.ts untested | High | Add unit tests |
| RSK-020 | Test Coverage | E2E tests skipped due to empty database | High | Implement test data seeding |
| RSK-021 | Test Coverage | Most Svelte components lack unit tests | Medium | Add component tests |

## DEC-013: Pitfall Prevention

**Decision:** Document and actively prevent domain-specific pitfalls in prompt management with AI execution.
**Rationale:** Domain has critical pitfalls (model resolution ambiguity, injection attacks, execution log data loss, council state explosion) that cause rewrites.
**Outcome:** Pitfall register established from `.planning/research/PITFALLS.md` (2026-02-14).

### Critical Pitfalls

| ID | Pitfall | Prevention | Phase |
|---|---|---|---|
| PIT-001 | Model Resolution Ambiguity | Deterministic cascade: explicit override > prompt-level > function default > global default. Log resolved model AND source. | Phase 1 |
| PIT-002 | Snippet Variable Injection Attacks | Escape `{{`/`}}` in variable values; single-pass replacement; validate declared variables; audit trail. | Phase 2 |
| PIT-003 | Execution Log Data Loss | Capture model_id, model_source, input/output tokens, duration_ms, status, error_code, prompt_id, rendered_prompt_hash. | Phase 1 |
| PIT-004 | Council Mode State Explosion | Hard round limits (max 3-5); token budget; state isolation per round; recovery fallback. | Phase 3 |
| PIT-005 | Rate Limit Bypass | Token-aware rate limiting; persistent storage. | Phase 1 |
| PIT-006 | Streaming Error Handling | Cleanup in finally block; abort handling. | Phase 1 |
| PIT-007 | Preview Stale Variables | Re-render preview on every variable change. | Phase 2 |

## Legacy Content: Project State

**Source:** `.planning/STATE.md`

### Current Position

- **Phase:** 9 of 11 (Council Debate Mode) - In Progress
- **Plan:** 1 of 2 in current phase
- **Status:** Plan 09-01 complete - Council Debate backend with parallel agent execution
- **Last activity:** 2026-02-28
- **Progress:** ~85%

### Velocity Metrics

- Total plans completed: 20
- Average duration: 12min
- Total execution time: 3.8 hours

### Key Decisions by Phase

- **Phase 01:** Settings-first approach; uniqueIndex for composite constraints; Model ID format `providerID/modelID`; Cascade priority: run > prompt > default; Service layer + JWT auth.
- **Phase 02:** HTML entity escaping over DOMPurify; `bind:this` for innerHTML; `session.prompt()` over `session.chat`; Ephemeral sessions with try/finally; Execution panel loads defaults from `/api/admin/function-defaults/{type}`; Model catalog from `/api/opencode/providers`; First connected provider as fallback.
- **Phase 03:** Fire-and-forget async logging; Model ID stored as `providerId/modelId`; Model override dropdown filtered by AI Policy whitelist.
- **Phase 04:** Backslash escaping for injection prevention; Keep original placeholder when variable missing.
- **Phase 05:** Test runner in sidebar; Reuse ExecutionResult component.
- **Phase 06:** Subscribe to OpenCode events BEFORE session creation; Filter events by sessionID; 15s heartbeat; Default streaming mode; Max 3 reconnections with exponential backoff; 'streaming' state distinct from 'loading'.
- **Phase 07:** Steps stored as JSON in councilRuns table; Council step mapping: producer->executor, reviewer->judge, fixer->improve; Max 3 rounds hardcoded.
- **Phase 08:** Snippets use category field; No llm_providers or versioning; Search covers title, description, AND content; Grid-only layout; Tags as comma-separated string; Integrated taxonomy methods into snippets.service.ts; JSON.stringify change detection; Stay on edit page after save; Single page with tabs for Categories and Tags; Inline editing for categories.
- **Phase 09:** Reuse councilRuns table for debate persistence; 3 locked debate archetypes (Proponent, Skeptic, Pragmatist); Synthesizer uses 'judge' function type.

### Pending Todos

- [x] Debug OpenCode SDK empty response (0 tokens, no content) -> FIXED
- [x] Create SUMMARY.md for plan 02-03 -> DONE
- [x] Complete Phase 2 verification -> DONE
- [x] Complete 03-01 execution logging infrastructure -> DONE
- [x] Complete 03-02 history UI -> DONE

### Blockers/Concerns

None - Phase 6 complete and verified!

## Legacy Content: Codebase Conventions

**Source:** `.planning/codebase/CONVENTIONS.md` (2026-02-14)

### Naming Patterns

- **Files:** TypeScript: lowercase with dashes (e.g., `prompts.service.ts`); Svelte: lowercase with dashes (e.g., `prompt-editor.svelte`); Tests: `.test.ts` or `.spec.ts`; Barrel files: `index.ts`
- **Functions:** camelCase; async functions same convention; private methods: no underscore; helper functions: descriptive verbs
- **Variables:** camelCase; constants: UPPER_SNAKE_CASE for config; state variables in Svelte: camelCase
- **Types/Interfaces:** PascalCase; input types suffixed with `Input`; result types suffixed with `Result`; Props interface in Svelte: named `Props`

### Code Style

- **Formatting:** Prettier with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss`; tabs; single quotes; no trailing commas; print width 100
- **Linting:** ESLint flat config (`eslint.config.js`); extends `@eslint/js`, `typescript-eslint`, `eslint-plugin-svelte`; TypeScript handles undefined variable checks (`no-undef: off`)

### Import Organization

1. External libraries (SvelteKit, Node, npm packages)
2. `$lib` alias imports
3. Relative imports (same directory or parent)

**Path Aliases:** `$lib` -> `src/lib`; `$app` -> SvelteKit app module

### Error Handling

- Server routes: `throw error(status, message)` from `@sveltejs/kit`; wrap async in try-catch; log with `console.error()`; return JSON: `{ message: string, errors: unknown | null }`
- Validation: Zod schemas with `safeParse()`; return errors using `parsed.error.flatten()`
- Client stores: `error = $state<string | null>(null)`; clear before operations, set on failure

### Logging

- `console.error()` for errors with context
- `console.log()` with `[AUDIT]` prefix for security events
- Include relevant identifiers in log messages

### Svelte 5 Patterns

- `$state()` for reactive state
- `$derived()` for computed values
- `$props()` for component props
- `$effect()` for side effects
- `$bindable()` for two-way binding
- Event handlers: lowercase (`onclick`, `onchange`); optional chaining for callbacks

### Drizzle ORM Patterns

- Import schema from `$lib/server/db/schema`
- Use `returning()` for insert/update
- Soft delete: `deletedAt` column; query with `isNull(deletedAt)`
- Type inference: `$inferSelect` for select types; `$inferInsert` for insert types

### API Design

- Zod schemas for validation
- Consistent response format with `json()` helper
- Pagination: `{ data, pagination: { limit, offset, hasMore } }`
- Authentication: `authenticateRequest()` (required) and `optionalAuthenticateRequest()` (optional)

## Legacy Content: Pitfalls Research

**Source:** `.planning/research/PITFALLS.md` (2026-02-14)

### Critical Pitfalls (Detailed)

**PIT-001: Model Resolution Ambiguity**
- What goes wrong: Model selection logic scattered across multiple sources without clear precedence.
- Why: Settings exist in admin_settings, prompt frontmatter, user session, hardcoded defaults.
- Prevention: Deterministic cascade (explicit override > prompt-level > function default > global default). Every execution MUST log resolved model AND source.
- Warning signs: Same prompt produces different results; debug logs show model ID without source; multiple `getSetting()` calls with fallback chains.

**PIT-002: Snippet Variable Injection Attacks**
- What goes wrong: `{{VAR}}` replacement allows prompt injection when user-controlled data flows into template variables.
- Why: Naive string replacement treats all `{{...}}` as variables; no distinction between trusted prompt content and untrusted variable values.
- Prevention: Escape `{{`/`}}` in variable values; single-pass replacement; validate declared variables; audit trail.
- Warning signs: Variables containing `{{` rendered without escaping; no validation of declared vs provided variables.

**PIT-003: Execution Log Data Loss**
- What goes wrong: Execution logs capture incomplete information, making debugging and cost tracking impossible.
- Why: Logging added as afterthought; token counts returned asynchronously; error handling swallows context.
- Prevention: Capture model_id, model_source, input_tokens, output_tokens, duration_ms, status, error_code, error_message, prompt_id, rendered_prompt_hash.
- Warning signs: Can't answer "how much did this prompt cost last month?"; debugging requires re-running prompts.

**PIT-004: Council Mode State Explosion**
- What goes wrong: Multi-agent council modes accumulate unbounded state as agents exchange messages.
- Why: Each agent response added to context for next agent; no message pruning or summarization; council rounds don't have hard limits.
- Prevention: Hard round limits (max 3-5); token budget; state isolation (each round starts fresh, only conclusion passed forward); recovery fallback.
- Warning signs: No maximum rounds configured; council execution time grows unbounded; memory pressure during execution.

### Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|---|---|---|---|
| In-memory rate limiting | Simple, no Redis | Lost on restart, doesn't scale | Single-instance dev only |
| Skip token logging for streaming | Faster initial impl | No cost visibility | Never |
| Hardcode model in function | No settings lookup | Can't change without deploy | PoC only |
| Log full prompt text | Easier debugging | PII leakage, storage costs | Dev with synthetic data |
| Ignore streaming errors | Simpler handling | Silent failures | Never |
| Cache provider catalog forever | No API calls | Stale model list | Never |

### Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|---|---|---|
| OpenCode SDK | Using `as any` to bypass typing | Create typed interfaces, submit PR to SDK |
| OpenCode SDK | Assuming session persists | Create fresh session per execution |
| OpenCode SDK | Not checking `status` field in catalog | Filter out deprecated and alpha models |
| OpenCode streaming | Not handling abort/cancel | Implement cleanup in finally block |
| Provider catalog | Trusting catalog order is stable | Sort by explicit criteria |
| Admin settings | Caching settings indefinitely | Refresh on each execution or short TTL |

### Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|---|---|---|---|
| N+1 settings queries | Slow execution, many DB calls | Batch load all settings once per request | 10+ concurrent executions |
| Uncapped execution history | DB bloat, slow queries | Retention policy (30-90 days) | 10,000+ logged executions |
| No execution timeout | Hung requests, resource exhaustion | Set max duration (60s default) | First long-running prompt |
| Synchronous streaming | Event loop blocked | Use async iteration | 100+ concurrent streams |
| Full prompt in logs | Disk space exhaustion, PII exposure | Store hash, truncate to 500 chars | 1,000+ executions/day |

### Security Mistakes

| Mistake | Risk | Prevention |
|---|---|
| User input in prompt templates without sanitization | Prompt injection, data exfiltration | Escape all `{{` and `}}`, validate against declared variables |
| Logging full prompt content | PII leakage, credential exposure | Hash prompts, log metadata only |
| No model access control | Users can use expensive models | Implement `opencode_allowed_models` allowlist |
| Missing execution audit trail | Can't investigate security incidents | Log user, timestamp, model, prompt_id for every execution |
| CORS allows any origin for API | Cross-site request forgery | Require explicit origin allowlist |

### "Looks Done But Isn't" Checklist

- [ ] Snippet Variables: verify `{{` escaping in variable values
- [ ] Execution Logging: verify log shows where model was resolved from
- [ ] Preview Panel: verify preview re-renders on variable change
- [ ] Error Handling: verify errors logged with prompt_id and model
- [ ] Rate Limiting: verify token-aware rate limiting
- [ ] Streaming: verify cleanup on client disconnect
- [ ] Council Mode: verify max rounds enforced

## Legacy Content: Settings Schema Spec

**Source:** `docs/spec/SPEC-10-settings-schema.md`

### Key Registry (SET-003)

| Key | Type | Default | Allowed Values | Used By |
|---|---|---|---|
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

### Validation Rules (SET-004)

- Unknown key -> `SETTINGS_KEY_INVALID`
- Type mismatch -> `SETTINGS_VALUE_INVALID`
- Number out of range -> `SETTINGS_VALUE_INVALID`
- Invalid model id format -> `SETTINGS_VALUE_INVALID`

### UI Binding Rules (SET-006)

- Each key bound to specific form control type
- Save action validates against schema before persistence
- UI must show value source when inherited from global default

## Legacy Content: AI Settings Contract Spec

**Source:** `docs/spec/SPEC-14-ai-settings-contract-v1.md`

### Shared Types (AIC-004)

- `FunctionType`: `executor | judge | improve | council`
- `PolicyScope`: `executor | judge | improve | council`
- `ModelId`: canonical `provider/model`
- `ModelVariant`: variant id (e.g., `low`, `medium`, `high`, `xhigh`)

### Endpoint Matrix (AIC-005)

| Endpoint | Auth | Contract Role |
|---|---|
| `GET /api/opencode/providers` | authenticated admin | Catalog v2 (capabilities + variants + policy overlay) |
| `PUT /api/admin/function-defaults/:type` | admin | Save role defaults including `modelVariant` |
| `GET /api/admin/function-defaults/:type` | admin | Read role defaults including `modelVariant` |
| `POST /api/admin/council-agents` | admin | Create council member with `modelVariant` |
| `PATCH /api/admin/council-agents/:id` | admin | Update council member model/variant |
| `GET /api/admin/council-agents` | admin | Read council members including variant |
| `POST /api/prompts/:id/execute` | authenticated user | Runtime result includes resolved model + variant source |
| `POST /api/judge/evaluate` | authenticated user | Runtime result includes resolved model + variant source |
| `POST /api/prompts/:id/improve` | authenticated user | Runtime result includes resolved model + variant source |

### Variant Precedence (AIC-009)

1. run override variant
2. prompt override variant
3. function default variant
4. policy/provider default variant

Hard-fail rule: if resolved variant is disallowed or unavailable, return terminal error; no automatic fallback.

### Error Mapping Additions (AIC-010)

| Code | HTTP | Retryable | Trigger |
|---|---|---|---|
| `MODEL_VARIANT_REQUIRED` | 400 | false | Variant omitted while multiple allowed variants exist |
| `MODEL_VARIANT_NOT_ALLOWED` | 422 | false | Variant blocked by policy/scope |
| `MODEL_VARIANT_UNAVAILABLE` | 422 | false | Variant not provided by active provider/model catalog |

## Legacy Content: Refactor Blueprint

**Source:** `docs/plans/ai-settings-architecture/REFACTOR_BLUEPRINT_SOLID_DRY_SECURITY.md` (2026-02-23)

### Blueprint Goals

1. Make `model + variant` first-class through admin, DB, cascade, and runtime.
2. Enforce policy constraints by scope with hard-fail behavior.
3. Expand Model Catalog to high-signal, capability-rich payloads.
4. Improve security consistency and reduce duplicated logic.

### Non-Negotiable Rules

- No silent fallback when a selected variant is disallowed/unavailable.
- One shared validator for `(scope, modelId, modelVariant)`.
- One shared model identity parser/formatter for all runtime services.
- All admin mutation endpoints require consistent auth guard.

### Execution Phases Summary

| Phase | Name | Key Deliverable |
|---|---|---|
| 0 | Lock Current Behavior | Regression tests, snapshot responses |
| 1 | Security Hardening | Reusable admin auth guard applied to all mutation routes |
| 2 | Variant Data Model Foundation | Add `model_variant` columns; update schema, migration, serializers |
| 3 | API + Cascade + Runtime Enforcement | Shared validator; cascade resolves variant; runtime hard-fail |
| 4 | Model Catalog v2 Enrichment | Capabilities, variants, policy overlay in catalog payload |
| 5 | UI Variant Selection Integration | Variant picker in defaults and council; blocked reasons inline |
| 6 | DRY Cleanup and Legacy Retirement | Shared parser/validator; remove dead paths |

### Exit Criteria

- Function Defaults and LLM Council both support `modelVariant` fully.
- Variant options respect active policy + scope.
- Runtime honors resolved variant.
- Invalid variant paths hard-fail with typed errors.
- Catalog provides actionable data for policy and selection UIs.

## Legacy Content: Database Architecture Audit

**Source:** `docs/plans/ai-settings-architecture/DB_ARCHITECTURE_AUDIT_OPTIONS.md` (2026-02-23)

### Current Schema Snapshot

| Table | Role | Strength | Main Risk |
|---|---|---|---|
| `admin_settings` | key-value store for policy/connection and legacy data | flexible, unique key index | mixed concerns, JSON text drift |
| `opencode_connection` | legacy singleton connection state | simple bootstrap state | duplicate source-of-truth with canonical key |
| `function_defaults` | baseline defaults per function type | deterministic singleton by function type | no first-class variant column |
| `prompt_function_settings` | prompt-level overrides | unique `(prompt_id, function_type)` | no first-class variant override |
| `council_agents` | repeated LLM council members | ordering support via `agent_order` | no first-class variant column + polymorphic parent |
| `improve_presets` | reusable improve templates | default preset support | model settings partly text/JSON and variant-unspecified |

### Recommended Schema Changes

Add columns:
- `function_defaults.model_variant TEXT NULL`
- `prompt_function_settings.model_variant_override TEXT NULL`
- `council_agents.model_variant TEXT NULL`
- optional: `improve_presets.model_variant TEXT NULL`

Suggested index additions:
- `council_agents(parent_type, parent_id, agent_order)`
- optional: `function_defaults(function_type, model_id, model_variant)`

### Architecture Options

| Option | Description | Pros | Cons |
|---|---|---|---|
| A - Harden Existing Schema | Add variant columns; keep policy in admin_settings keys; add centralized validator | Minimal migration risk; fastest delivery | Policy remains JSON-text based; DB integrity indirect |
| B - Typed Policy Domain | Introduce typed policy tables (`ai_policy`, `ai_policy_scope_rules`, `ai_policy_model_variants`) | Better queryability and integrity | Migration complexity and dual-read period |
| C - Typed Policy + Revision Timeline | Option B + append-only settings revision table with actor metadata | Strongest governance and rollback traceability | Highest implementation and operational cost |

### Recommendation

1. **Now:** Option A (variant columns + strict validator + hard fail)
2. **Next:** Option B (typed policy normalization)

Reason: achieves required behavior quickly; reduces risk before structural migrations; keeps room for clean long-term schema.

### Migration Plan (Variant First)

**Phase 1** (schema + write/read support): Add variant columns; update admin APIs; update services and cascade.
**Phase 2** (runtime enforcement): Central validator in runtime flows; hard-fail on disallowed/unavailable variants; tests for save-time and run-time failures.
**Phase 3** (typed policy optional): Create typed policy tables; backfill from current keys; switch writes, then retire key-based policy writes.

### Validation Checklist

- [ ] Variant fields persisted for defaults, prompt overrides, council.
- [ ] Save endpoints reject invalid variant/scope combinations.
- [ ] Runtime endpoints fail fast when stored variant becomes invalid.
- [ ] Catalog endpoint exposes variants and capability richness.
- [ ] No silent variant fallback path remains.
