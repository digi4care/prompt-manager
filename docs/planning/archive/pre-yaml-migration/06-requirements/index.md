# 06 -- Requirements

## Functional Requirements (FR)

### FR-01: User Authentication
The system shall authenticate users via Better Auth sessions before granting access to protected resources.
**Priority:** Must
**Traceability:** US-1.1 through US-1.13

### FR-02: Prompt CRUD
The system shall allow users to create, read, update, and delete prompts with metadata.
**Priority:** Must
**Traceability:** Completed (existing codebase)

### FR-03: Version History
The system shall maintain version history with diff visualization.
**Priority:** Must
**Traceability:** Completed (existing codebase)

### FR-04: Settings Cascade
The system shall resolve model/temperature/parameters via deterministic precedence: run > prompt > default.
**Priority:** Must
**Traceability:** US-3.1, SPEC-10

### FR-05: Execution Logging
The system shall log every execution with model_id, model_source, tokens, duration.
**Priority:** Must
**Traceability:** Phase 3 (completed)

### FR-06: Snippet Variables
The system shall support {{VAR}} syntax with live preview and injection escaping.
**Priority:** Must
**Traceability:** Phase 4 (completed)

### FR-07: Council Modes
The system shall support correct, debate, and consensus council modes.
**Priority:** Should
**Traceability:** Phases 7-9

## Non-Functional Requirements (NFR)

### NFR-01: Security
All errors mapped to stable app error codes (ERR-*). Rate limiting active.
**Priority:** Must

### NFR-02: Database Migrations
Additive changes only -- no drop/rename of existing columns.
**Priority:** Must

### NFR-03: OpenCode Integration
Always via server routes, never from browser.
**Priority:** Must

## Security Requirements (SEC)

### SEC-01: Auth Bypass Prevention
No JWT auth bypass. Constant-time comparison for sensitive data.
**Priority:** Must
**Traceability:** Security hardening issues

### SEC-02: Admin Protection
Admin routes protected via hooks.server.ts role check.
**Priority:** Must

## Reliability Requirements (REL)

### REL-01: Graceful Degradation
Execution fails gracefully with clear error when model unavailable.
**Priority:** Must

### REL-02: Audit Logging
All security events logged (rate limits, auth failures).
**Priority:** Must
---

## Legacy Content: .planning/REQUIREMENTS.md

**Defined:** 2026-02-14
**Core Value:** Settings-first PoC for OpenCode integration with per-function model defaults

### v1 Requirements (P1)

#### Settings

- [ ] **SETTINGS-01**: User can configure default model per function type (executor, judge, improve, council)
- [ ] **SETTINGS-02**: User can set default temperature per function type
- [ ] **SETTINGS-03**: User can set default max tokens per function type
- [ ] **SETTINGS-04**: Settings cascade: Request > Preset > Policy > Global Default
- [ ] **SETTINGS-05**: Model resolution logs which source provided the model (model_source field)

#### Execution

- [ ] **EXEC-01**: User can execute prompt via OpenCode SDK with resolved model
- [ ] **EXEC-02**: User sees which model was used for each execution
- [ ] **EXEC-03**: User can override defaults per-execution (model, temperature, max_tokens)
- [ ] **EXEC-04**: Execution fails gracefully with clear error when model unavailable
- [ ] **EXEC-05**: User can see execution duration and token counts

#### Logging

- [ ] **LOG-01**: Every execution creates log entry with model_id, model_source, tokens, duration
- [ ] **LOG-02**: User can view execution history for a prompt
- [ ] **LOG-03**: Logs include input prompt (resolved, with variables substituted)
- [ ] **LOG-04**: Logs include output/error with context

#### Snippets

- [ ] **SNIPPET-01**: User can define variables in prompt frontmatter ({{VAR}})
- [ ] **SNIPPET-02**: User sees live preview of resolved prompt as they type variable values
- [ ] **SNIPPET-03**: Preview updates on every keystroke
- [ ] **SNIPPET-04**: Missing required variable shows clear error in preview
- [ ] **SNIPPET-05**: Variable injection is escaped (security: prevent {{ in values)

#### Test Runner UI

- [ ] **UI-01**: User can access test runner panel from prompt editor
- [ ] **UI-02**: User can fill variable inputs and see preview before execution
- [ ] **UI-03**: User can run execution and see results inline
- [ ] **UI-04**: User can see execution metrics (model, tokens, duration)

### v2 Requirements (P2)

#### Council Mode - Correct

- [ ] **COUNCIL-01**: User can run "correct" mode (producer → reviewer → fix)
- [ ] **COUNCIL-02**: Producer step generates initial output using "executor" defaults
- [ ] **COUNCIL-03**: Reviewer step identifies issues using "judge" defaults
- [ ] **COUNCIL-04**: Fix step resolves issues using "improve" defaults
- [ ] **COUNCIL-05**: Round limit enforced (max 3 rounds)
- [ ] **COUNCIL-06**: User sees all step outputs with clear progression

#### Streaming

- [ ] **STREAM-01**: Execution results stream in real-time via SSE
- [ ] **STREAM-02**: User can abort streaming execution
- [ ] **STREAM-03**: Connection handles heartbeat and reconnection

#### Snippet Library

- [ ] **SNIPPET-LIB-01**: User can create standalone snippet templates
- [ ] **SNIPPET-LIB-02**: User can browse and search snippet library
- [ ] **SNIPPET-LIB-03**: User can insert snippets into prompts

### v3 Requirements (P3)

#### Council Mode - Debate

- [ ] **DEBATE-01**: User can run "debate" mode with multiple agent perspectives
- [ ] **DEBATE-02**: System synthesizes conclusion from agent arguments
- [ ] **DEBATE-03**: User sees full debate history

#### Council Mode - Consensus

- [ ] **CONSENSUS-01**: User can run "consensus" mode with parallel agents
- [ ] **CONSENSUS-02**: System aggregates votes and returns consensus
- [ ] **CONSENSUS-03**: User sees vote breakdown

#### JavaScript Snippets

- [ ] **JS-SNIPPET-01**: User can create JavaScript snippets
- [ ] **JS-SNIPPET-02**: JS snippets execute in sandboxed environment

### Out of Scope

| Feature | Reason |
| ------------------------------- | -------------------------------------------------- |
| Cost optimization engine | Complex infrastructure, defer to post-PoC |
| Enterprise RBAC | Full redesign not needed for PoC |
| Background queue workers | Requires distributed execution infrastructure |
| Real-time collaborative editing | Massive complexity, not core value |
| Fine-tuning integration | Different domain, ML infrastructure |
| Built-in LLM provider | Infrastructure nightmare, users bring own OpenCode |
| Visual workflow builder | UX nightmare, fixed council modes sufficient |
| Analytics dashboard | Requires data aggregation, defer |
| Mobile app | Web-first responsive design sufficient |

### Traceability

| Requirement | Phase | Status |
| -------------- | -------------------------------- | ------- |
| SETTINGS-01 | Phase 1: Settings Foundation | Pending |
| SETTINGS-02 | Phase 1: Settings Foundation | Pending |
| SETTINGS-03 | Phase 1: Settings Foundation | Pending |
| SETTINGS-04 | Phase 1: Settings Foundation | Pending |
| SETTINGS-05 | Phase 1: Settings Foundation | Pending |
| EXEC-01 | Phase 2: Prompt Execution | Pending |
| EXEC-02 | Phase 2: Prompt Execution | Pending |
| EXEC-03 | Phase 2: Prompt Execution | Pending |
| EXEC-04 | Phase 2: Prompt Execution | Pending |
| EXEC-05 | Phase 2: Prompt Execution | Pending |
| LOG-01 | Phase 3: Execution Logging | Pending |
| LOG-02 | Phase 3: Execution Logging | Pending |
| LOG-03 | Phase 3: Execution Logging | Pending |
| LOG-04 | Phase 3: Execution Logging | Pending |
| SNIPPET-01 | Phase 4: Snippet Variables | Pending |
| SNIPPET-02 | Phase 4: Snippet Variables | Pending |
| SNIPPET-03 | Phase 4: Snippet Variables | Pending |
| SNIPPET-04 | Phase 4: Snippet Variables | Pending |
| SNIPPET-05 | Phase 4: Snippet Variables | Pending |
| UI-01 | Phase 5: Test Runner UI | Pending |
| UI-02 | Phase 5: Test Runner UI | Pending |
| UI-03 | Phase 5: Test Runner UI | Pending |
| UI-04 | Phase 5: Test Runner UI | Pending |
| STREAM-01 | Phase 6: Streaming Execution | Pending |
| STREAM-02 | Phase 6: Streaming Execution | Pending |
| STREAM-03 | Phase 6: Streaming Execution | Pending |
| COUNCIL-01 | Phase 7: Council Correct Mode | Pending |
| COUNCIL-02 | Phase 7: Council Correct Mode | Pending |
| COUNCIL-03 | Phase 7: Council Correct Mode | Pending |
| COUNCIL-04 | Phase 7: Council Correct Mode | Pending |
| COUNCIL-05 | Phase 7: Council Correct Mode | Pending |
| COUNCIL-06 | Phase 7: Council Correct Mode | Pending |
| SNIPPET-LIB-01 | Phase 8: Snippet Library | Pending |
| SNIPPET-LIB-02 | Phase 8: Snippet Library | Pending |
| SNIPPET-LIB-03 | Phase 8: Snippet Library | Pending |
| DEBATE-01 | Phase 9: Council Debate Mode | Pending |
| DEBATE-02 | Phase 9: Council Debate Mode | Pending |
| DEBATE-03 | Phase 9: Council Debate Mode | Pending |
| CONSENSUS-01 | Phase 10: Council Consensus Mode | Pending |
| CONSENSUS-02 | Phase 10: Council Consensus Mode | Pending |
| CONSENSUS-03 | Phase 10: Council Consensus Mode | Pending |
| JS-SNIPPET-01 | Phase 11: JavaScript Snippets | Pending |
| JS-SNIPPET-02 | Phase 11: JavaScript Snippets | Pending |

**Coverage:** v1 requirements: 23 total → Phases 1-5; v2 requirements: 12 total → Phases 6-8; v3 requirements: 8 total → Phases 9-11; Total: 43 requirements mapped to 11 phases; Unmapped: 0

### Validated Requirements (Existing Codebase)

- Prompt CRUD with versions
- Prompt editor with Monaco syntax highlighting
- Diff view for version comparison
- Judge evaluations (score 1-10 with feedback)
- Improvement loop (generate variants from feedback)
- Admin settings UI
- Search/filter prompts

---

## Legacy Content: SPEC-04 API Contracts

### API-001 Auth Rules

- Admin settings endpoints require admin session.
- Prompt execution endpoints require authenticated user.
- Return `401` unauthenticated, `403` unauthorized.

### API-002 GET /api/admin/settings

- Response: all settings grouped by category.
- Error codes: `SETTINGS_READ_FAILED`.

### API-003 PUT /api/admin/settings/:key

- Request: `{ value: string | number | boolean | string[] }`.
- Validate by known key + expected type.
- Errors: `SETTINGS_KEY_INVALID`, `SETTINGS_VALUE_INVALID`.

### API-004 POST /api/prompts/:id/execute

- Request:
  - `model?` string (format: `provider/model`)
  - `temperature?` number (`0.0..2.0`, default from function setting)
  - `variables?` object (string keys, scalar string values)
  - `strictSnippets?` boolean (default `true`)
  - `maxTokens?` number (`1..16384`, optional)
- Response success:
  - `runId` string
  - `response` string
  - `resolvedModel` string
  - `modelSource` enum (`function_default | prompt_override | run_override | fallback`)
  - `inputTokens` number
  - `outputTokens` number
  - `durationMs` number
  - `fallbackUsed` boolean
- Errors:
  - `PROMPT_NOT_FOUND`
  - `MODEL_RESOLUTION_FAILED`
  - `SNIPPET_VALUE_MISSING`
  - `OPENCODE_UNAVAILABLE`
  - `OPENCODE_EXECUTION_FAILED`

### API-004A Execute Validation Rules

- Reject request with `400` and `SETTINGS_VALUE_INVALID` for invalid number ranges.
- Reject request with `400` and `SNIPPET_VALUE_MISSING` when strict mode enabled and unresolved placeholders remain.
- Reject request with `422` and `MODEL_RESOLUTION_FAILED` when no allowed model is resolvable.
- Return `503` and `OPENCODE_UNAVAILABLE` when health check fails before execution.

### API-005 GET /api/prompts/:id/stream

- Protocol: SSE.
- Events: `started`, `chunk`, `completed`, `failed`.
- Error code on failure event payload required.

### API-005A SSE Event Schema

- `started`: `{ runId, promptId, resolvedModel, startedAt }`
- `chunk`: `{ runId, index, textDelta }`
- `completed`: `{ runId, response, inputTokens, outputTokens, durationMs }`
- `failed`: `{ runId, errorCode, errorMessage, retryable }`

### API-006 Snippets CRUD

- `GET /api/snippets`
- `POST /api/snippets`
- `PUT /api/snippets/:id`
- `DELETE /api/snippets/:id`
- Error: `SNIPPET_NAME_DUPLICATE`, `SNIPPET_NOT_FOUND`.

### API-007 Council

- `POST /api/council/correct`
- `POST /api/council/debate`
- `POST /api/council/consensus`
- Shared response: `sessionId`, `status`, `steps[]`, `result`, `durationMs`.

### API-008 Resolution Behavior

- Resolution behavior is defined only in `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`).

---

## Legacy Content: SPEC-06 Rules and Policies

### POL-000 Canonical Policy Source

- This document is the single source of truth for model resolution.
- Any precedence/fallback change must be made here first.
- Other specs must reference policy IDs and cannot redefine the same logic.

### POL-001 Model Policy

- Allowed models list is authoritative when policy mode is `restricted`.
- In `open` mode all catalog models are selectable.

### POL-002 Precedence Rules

For execution and judge/improve/council model resolution:

1. Runtime override (request payload)
2. Prompt-level override
3. Function default setting
4. Global default setting

### POL-002A Resolution Decision Table

- Candidate invalid because format/type -> skip to next candidate.
- Candidate disallowed by policy -> skip to next candidate.
- Candidate allowed but temporarily unavailable -> skip and mark fallback path.
- First valid candidate wins and is returned with `modelSource`.

### POL-003 Fallback Rules

- If current candidate is unavailable or not allowed, try next precedence level.
- Never fallback to disallowed model.

### POL-004 Error Rules

- If no valid candidate: `MODEL_RESOLUTION_FAILED`.
- If OpenCode connection fails: `OPENCODE_UNAVAILABLE`.
- If OpenCode returns tool/model error: `OPENCODE_EXECUTION_FAILED`.

### POL-005 Snippet Rules

- Placeholder format: `{{NAME}}`.
- Unknown placeholder in strict mode: hard error.
- Unknown placeholder in non-strict mode: keep unresolved marker.

### POL-006 JavaScript Snippet Security

- Disabled by default in PoC.
- If enabled, evaluate in restricted sandbox only.
- No filesystem, no network, no process APIs.

### POL-007 Council Rules

- `correct` mode required for PoC.
- `debate/consensus` optional in later phases.
- Each council step logs role, model, duration, output.

### POL-008 Operational Policy

- Timeout, retry count, retry delay are configurable in settings.
- Retry only transient failures.

### POL-009 Council Guardrails

- `correct` mode must complete steps in strict order: producer -> reviewer -> fix.
- `debate` and `consensus` may run only when explicitly enabled in settings.
- Per-step timeout defaults to function timeout if no council-specific timeout is set.

---

## Legacy Content: SPEC-11 Error Catalog

### ERR-001 Purpose

Define stable error codes, HTTP mappings, retry behavior, and user actions.

### ERR-002 Error Table

| Code | HTTP | Retryable | Trigger | User Action |
|---|---:|---|---|---|
| `PROMPT_NOT_FOUND` | 404 | false | Prompt ID does not exist | Open existing prompt |
| `SETTINGS_KEY_INVALID` | 400 | false | Unknown setting key | Use supported key |
| `SETTINGS_VALUE_INVALID` | 400 | false | Wrong type/range/format | Correct input value |
| `MODEL_RESOLUTION_FAILED` | 422 | false | No allowed/available model resolved | Select allowed model in settings/prompt |
| `SNIPPET_VALUE_MISSING` | 400 | false | Strict mode unresolved placeholder | Fill required snippet values |
| `SNIPPET_NAME_DUPLICATE` | 409 | false | Duplicate snippet name | Rename snippet |
| `SNIPPET_NOT_FOUND` | 404 | false | Snippet id missing | Refresh and retry |
| `OPENCODE_UNAVAILABLE` | 503 | true | OpenCode health check fails | Retry later or check connection |
| `OPENCODE_EXECUTION_FAILED` | 502 | true | Upstream execution failure | Retry run |
| `OPENCODE_AUTH_FAILED` | 401 | false | Invalid OpenCode auth | Update server credentials |
| `OPENCODE_TIMEOUT` | 504 | true | Request exceeded timeout | Retry with lower scope |
| `RATE_LIMITED` | 429 | true | Provider or server throttled | Retry after delay |

### ERR-003 Error Payload Contract

All API errors return:

- `error.code` (from table)
- `error.message` (human readable)
- `error.retryable` (boolean)
- `error.requestId` (trace id)
- `error.action` (UI CTA hint)

### ERR-004 Retry Policy

- Retry only when `retryable=true`.
- Use exponential backoff based on settings (`opencode_retry_count`, `opencode_retry_delay_ms`).
- Never retry validation, auth, or not-found errors.

### ERR-005 Default/Override/Fallback/Error

- Default retry policy from settings.
- Runtime override for retries is not allowed in PoC.
- Fallback model selection follows `POL-003`.
- If fallback exhausted, return terminal error from this catalog.

---

## Legacy Content: SPEC-12 Templating Grammar

### TMP-001 Purpose

Define deterministic placeholder parsing and rendering for prompt preview and execution.

### TMP-002 Grammar

- Placeholder token format: `{{NAME}}`.
- `NAME` regex: `[A-Z][A-Z0-9_]{0,63}`.
- Whitespace inside braces is ignored: `{{ NAME }}` equals `{{NAME}}`.

### TMP-003 Escape Rules

- Literal placeholder syntax: `{{!NAME}}`.
- Render behavior: remove `!` and output `{{NAME}}` without substitution.

### TMP-004 Resolution Order

1. Runtime `variables` payload
2. Prompt-level snippet values
3. Snippet default value
4. Unresolved behavior (strict/non-strict)

### TMP-005 Strictness Modes

- Strict mode (`true`): unresolved placeholder causes `SNIPPET_VALUE_MISSING`.
- Non-strict mode (`false`): unresolved placeholder remains as `{{NAME}}`.

### TMP-006 Supported Types

- `text`: plain string substitution.
- `select`: must match configured option value.
- `date`: ISO date string normalization.
- `javascript`: disabled by default; only allowed if `snippet_js_enabled=true`.

### TMP-007 JavaScript Safety

- Execute in restricted sandbox only.
- No filesystem/network/process/global mutable state.
- Hard timeout per evaluation (`<=100ms` default).

### TMP-008 Validation Errors

- Invalid token format -> ignored as plain text.
- Unknown placeholder in strict mode -> `SNIPPET_VALUE_MISSING`.
- Unsupported type conversion -> `SETTINGS_VALUE_INVALID`.

### TMP-009 Default/Override/Fallback/Error

- Defaults come from snippet definitions.
- Overrides come from prompt values and runtime variables.
- Fallback keeps placeholder only in non-strict mode.
- Strict mode unresolved placeholders are hard errors.

---

## Legacy Content: SPEC-13 NFR and Observability

### NFR-001 Performance Targets

- Settings read/write p95 <= 1000ms (excluding first cold request).
- Prompt execute API p95 <= 30000ms for standard prompts.
- Preview render update <= 200ms after input change.

### NFR-002 Reliability Targets

- Settings endpoints success rate >= 99.9% over 24h window.
- Execute endpoint success rate >= 98.0% excluding upstream outages.
- Zero data-loss for execution logs after successful run completion.

### NFR-003 Security Targets

- OpenCode credentials never exposed to browser.
- Server-only execution path for model calls.
- JavaScript snippets disabled by default.

### OBS-001 Required Structured Logs

- `settings.updated`
- `model.resolution`
- `prompt.executed`
- `prompt.execution_failed`
- `snippet.rendered`
- `council.step_completed`

### OBS-002 Required Metrics

- `api_execute_duration_ms`
- `api_settings_write_duration_ms`
- `model_resolution_fallback_count`
- `execution_error_count{code}`
- `snippet_unresolved_count`

### OBS-003 Trace Fields

- `requestId`
- `userId` (if authenticated)
- `promptId`
- `runId`
- `resolvedModel`
- `modelSource`

### NFR-004 Alerting Rules

- Alert when `OPENCODE_UNAVAILABLE` occurs continuously for 5 minutes.
- Alert when execute p95 > 30s for 15 minutes.
- Alert when `MODEL_RESOLUTION_FAILED` spikes above baseline.

### NFR-005 Default/Override/Fallback/Error

- Default NFR thresholds apply globally.
- Override thresholds per environment allowed only via deployment config.
- Fallback when metrics backend unavailable: keep local logs and continue serving requests.
- Error when logs cannot be persisted: return success response but mark `observabilityDegraded=true` in server logs.

---

## Legacy Content: SPEC-14 AI Settings Contract v1

### AIC-001 Purpose

Define concrete variant-aware contracts for AI settings so UI, backend, and runtime remain deterministic and policy-compliant.

### AIC-002 Scope

In scope:
- AI settings contracts for connection, providers/catalog, policy-linked defaults, council
- `model + variant` persistence and runtime propagation
- hard-fail behavior for invalid/disallowed/unavailable variants

Out of scope:
- non-settings prompt CRUD
- provider-specific billing agreements

### AIC-003 Canonical References

- Policy precedence and fallback: `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`)
- Settings schema baseline: `SPEC-10-settings-schema.md` (`SET-003`, `SET-004`, `SET-005`)
- Error payload/retry behavior: `SPEC-11-error-catalog.md` (`ERR-002`, `ERR-003`, `ERR-004`)
- Contract testing baseline: `SPEC-08-test-strategy.md` (`TST-008`)

### AIC-004 Shared Types

- `FunctionType`: `executor | judge | improve | council`
- `PolicyScope`: `executor | judge | improve | council`
- `ModelId`: canonical `provider/model`
- `ModelVariant`: variant id (example: `low`, `medium`, `high`, `xhigh`)

```json
{
  "modelId": "openai/codex",
  "modelVariant": "high"
}
```

### AIC-005 Endpoint Matrix

| Endpoint | Auth | Contract Role |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| `GET /api/opencode/providers` | authenticated admin page context | Catalog v2 (capabilities + variants + policy overlay) |
| `PUT /api/admin/function-defaults/:type` | admin | Save role defaults including `modelVariant` |
| `GET /api/admin/function-defaults/:type` | admin | Read role defaults including `modelVariant` |
| `POST /api/admin/council-agents` | admin | Create council member with `modelVariant` |
| `PATCH /api/admin/council-agents/:id` | admin | Update council member model/variant |
| `GET /api/admin/council-agents` | admin | Read council members including variant |
| `POST /api/prompts/:id/execute` | authenticated user | Runtime result includes resolved model + variant source |
| `POST /api/judge/evaluate` | authenticated user | Runtime result includes resolved model + variant source |
| `POST /api/prompts/:id/improve` | authenticated user | Runtime result includes resolved model + variant source |

### AIC-006 Request Contracts

#### AIC-006A PUT /api/admin/function-defaults/:type

```json
{
  "modelId": "openai/codex",
  "modelVariant": "high",
  "temperature": 0.7,
  "maxTokens": 4096,
  "promptId": null
}
```

Rules:
- `modelId` must be canonical `provider/model`.
- `modelVariant` required when selected model has multiple policy-allowed variants for the target scope.
- `modelVariant` optional only when exactly one allowed variant exists; server normalizes to that value.

#### AIC-006B POST/PATCH /api/admin/council-agents

Create/update body includes:
- `modelId` (required on create)
- `modelVariant` (required under same rule as defaults)
- optional `temperature`, `maxTokens`, `promptLinkId`, `agentOrder`
  Validation scope is always `council`.

#### AIC-006C GET /api/opencode/providers (Catalog v2)

Query:
- `refresh?` boolean
  No body.

### AIC-007 Success Response Contracts

#### AIC-007A Defaults/Council responses

```json
{
  "modelId": "openai/codex",
  "modelVariant": "high",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

#### AIC-007B Catalog v2 payload

Top-level:
- `providers[]`
- `cached`, `cachedAt`, `ttlSeconds`
  Per provider:
- `id`, `name`, `connected`, `authConfigured`, `source`
  Per model:
- `id`, `name`, `status`, `contextWindow`, `maxOutputTokens`
- `capabilities` (`vision`, `tools`, `jsonMode`, `streaming`, `reasoning`)
- `variants[]` with `id`, `label`, `isDefault`
- `policyOverlay`: `allowed`, `scopeAllowed`, `allowedVariants[]`, `blockedReason`

#### AIC-007C Runtime result additions

Runtime responses include:
- `resolvedModel` (`provider/model`)
- `resolvedVariant`
- `modelSource` (`run_override | prompt_override | function_default | fallback`)
- `variantSource` (`run_override | prompt_override | function_default | policy_default | provider_default`)

### AIC-008 Validation Rules

Mandatory checks on save and runtime resolution:
- model exists in current catalog
- provider is connected when required by mode/policy
- model allowed for scope by policy matrix
- variant allowed for scope by policy variant map
- selected variant exists under selected model in catalog
  Unknown key/type/range errors still follow `SET-004`.

### AIC-009 Default/Override/Fallback/Error

Model precedence remains canonical per `POL-002` and `POL-003`.
Variant precedence:
1. run override variant
2. prompt override variant
3. function default variant
4. policy/provider default variant
   Hard-fail rule:
- if resolved variant is disallowed or unavailable, return terminal error
- no automatic fallback to another variant

### AIC-010 Error Mapping Additions

| Code | HTTP | Retryable | Trigger |
| --------------------------- | ---: | --------- | ----------------------------------------------------- |
| `MODEL_VARIANT_REQUIRED` | 400 | false | Variant omitted while multiple allowed variants exist |
| `MODEL_VARIANT_NOT_ALLOWED` | 422 | false | Variant blocked by policy/scope |
| `MODEL_VARIANT_UNAVAILABLE` | 422 | false | Variant not provided by active provider/model catalog |

Payload shape remains `ERR-003`.

### AIC-011 Backward Compatibility + Versioning

- Contract version: v1 (additive extension over existing settings endpoints)
- Clients omitting `modelVariant` remain valid only for models with exactly one allowed variant
- For multi-variant models, omission returns `MODEL_VARIANT_REQUIRED`
- Future variant metadata expansion must be additive and backward compatible

### AIC-012 Contract Test Mapping

Required tests (mapped to `TST-008`):
- defaults/council save rejects missing variant for multi-variant model
- defaults/council save rejects disallowed variant per scope
- runtime fails with typed variant error when stored variant becomes invalid
- catalog payload includes `variants[]` and `policyOverlay` keys
- runtime payload includes `resolvedVariant` and `variantSource`

### AIC-013 Implementation Notes

- Before implementation, extend `SPEC-11` with the three variant error codes in `AIC-010`.
- Keep policy authority in `SPEC-06`; avoid duplicating rule logic outside canonical IDs.
