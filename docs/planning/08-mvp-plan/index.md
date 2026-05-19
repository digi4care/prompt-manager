# 08 -- MVP Implementation Plan

## Planning Horizon
- Current iteration: Planning migration (PLAN-MIGRATE-00)
- Next iteration: Settings route cleanup
- Beyond: Council debate UI, snippet enhancements

## Current Iteration Goal
Migrate all legacy planning artifacts into the canonical docs/planning/ structure with full traceability to Beads issues.

## WIP Limit
- Maximum items in progress: 3

## Beads Mapping
| Backlog ID | Beads Issue | Execution Status | Blockers |
|------------|-------------|------------------|----------|
| US-4.1 | prompt-management-65j | done | - |
| US-4.2 | prompt-management-2a1 | in_progress | - |
| US-4.3 | prompt-management-k8q | pending | US-4.2 |
| US-4.4 | prompt-management-116 | pending | US-4.2 |
| US-4.5 | prompt-management-416 | pending | US-4.2 |
| US-4.6 | prompt-management-4l5 | pending | US-4.3,4,5 |
| US-4.7 | prompt-management-m8m | pending | US-4.6 |
| US-4.8 | prompt-management-9dw | pending | US-4.7 |
| US-4.9 | prompt-management-j9a | pending | US-4.8 |
| US-4.10 | prompt-management-1il | pending | US-4.9 |

## Definition of Ready
- [x] Acceptance criteria are objective
- [x] Dependencies and blockers are known
- [ ] Required diagrams cover the story (diagram_ready blocked)
- [x] Test or verification method is defined
- [x] Beads issue exists

## Definition of Done
- [ ] All legacy content ported
- [ ] Validation passes
- [ ] Legacy directories archived
- [ ] Beads issues closed
## Legacy Content: .planning/ROADMAP.md

# Roadmap: Prompt Management with OpenCode Integration

## Overview

This roadmap delivers a settings-first prompt management system with OpenCode SDK integration. The journey progresses from foundational settings infrastructure → core execution capability → auditability → reusable templates → unified test UI → real-time streaming → multi-agent council workflows. Each phase builds on the previous, delivering incremental user value while maintaining deterministic model resolution.

## Phases

**Phase Numbering:**

- Integer phases (1-11): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

**Milestone Grouping:**

- **v1.0 (P1)** - Phases 1-5: Core execution foundation
- **v2.0 (P2)** - Phases 6-8: Enhanced capabilities
- **v3.0 (P3)** - Phases 9-11: Advanced council modes

---

## Phase Details

### Phase 1: Settings Foundation

**Goal**: Users can configure per-function model defaults with deterministic resolution cascade
**Depends on**: Nothing (first phase)
**Requirements**: SETTINGS-01, SETTINGS-02, SETTINGS-03, SETTINGS-04, SETTINGS-05
**Success Criteria** (what must be TRUE):

1. User can set default model for each function type (executor, judge, improve, council)
2. User can configure temperature and max_tokens per function type
3. Settings cascade deterministically: Run > Prompt > Global Default (3 levels)
4. Every model resolution logs which source provided the value (model_source field)
5. Invalid settings show clear validation errors

**Plans**: 3 plans

Plans:

- [ ] 01-01-PLAN.md — Database schema (function_defaults, prompt_function_settings, council_agents, opencode_connection) and service layer with 3-level cascade resolution
- [ ] 01-02-PLAN.md — API endpoints for function defaults CRUD, OpenCode connection status, and prompt-specific overrides
- [ ] 01-03-PLAN.md — Settings Admin UI with table layout, model pickers, council repeater, and validation (inline + summary)

---

### Phase 2: Prompt Execution

**Goal**: Users can execute prompts via OpenCode SDK with resolved settings
**Depends on**: Phase 1
**Requirements**: EXEC-01, EXEC-02, EXEC-03, EXEC-04, EXEC-05
**Success Criteria** (what must be TRUE):

1. User can execute prompt and receive AI response via OpenCode SDK
2. User sees which model was used for each execution
3. User can override model, temperature, and max_tokens per-execution
4. Failed executions show clear error with context (model unavailable, rate limit, etc.)
5. User sees execution duration and token counts in response

**Plans**: 3 plans

Plans:

- [ ] 02-01-PLAN.md — Execution backend service and API endpoint with settings cascade
- [ ] 02-02-PLAN.md — Result display components (markdown renderer + execution result)
- [ ] 02-03-PLAN.md — Execution panel UI with overrides, state machine, and verification

---

### Phase 3: Execution Logging

**Goal**: Users can audit all prompt executions with full context
**Depends on**: Phase 2
**Requirements**: LOG-01, LOG-02, LOG-03, LOG-04
**Success Criteria** (what must be TRUE):

1. Every execution creates log entry with model_id, model_source, tokens, duration
2. User can view execution history for any prompt
3. Logs show resolved input prompt (with variables substituted)
4. Logs include output or error with context

**Plans**: 2 plans ✓ COMPLETE

Plans:

- [x] 03-01-PLAN.md — Execution log schema, async logging service, and API endpoints for history
- [x] 03-02-PLAN.md — Execution history UI components and prompt detail page integration

---

### Phase 4: Snippet Variables

**Goal**: Users can create reusable prompt templates with {{VAR}} placeholders
**Depends on**: Phase 1 (settings for preview resolution)
**Requirements**: SNIPPET-01, SNIPPET-02, SNIPPET-03, SNIPPET-04, SNIPPET-05
**Success Criteria** (what must be TRUE):

1. User can define {{VAR}} placeholders in prompt frontmatter
2. User sees live preview of resolved prompt as they type variable values
3. Preview updates on every keystroke (reactive)
4. Missing required variables show clear error message in preview
5. Variable values containing {{ or }} are safely escaped (injection prevention)

**Plans**: 3 plans ✓ COMPLETE

Plans:

- [x] 04-01-PLAN.md — Variable extraction types, Zod schema, and frontmatter parsing extension
- [x] 04-02-PLAN.md — Variable resolution with escaping and missing variable tracking
- [x] 04-03-PLAN.md — Live preview component with reactive updates

---

### Phase 5: Test Runner UI

**Goal**: Users have a unified interface for testing prompts with variables
**Depends on**: Phase 2 (execution), Phase 4 (snippets)
**Requirements**: UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):

1. User can access test runner panel from prompt editor
2. User can fill variable inputs and see resolved preview before execution
3. User can run execution and see results inline in the panel
4. User sees execution metrics (model, tokens, duration) in results
   **Plans**: 2 plans

Plans:

- [x] 05-01-PLAN.md — TestRunnerPanel component composing variable inputs + execution + results
- [x] 05-02-PLAN.md — Edit page integration with collapsible test runner section

---

### Phase 6: Streaming Execution

**Goal**: Users see AI output in real-time as it generates
**Depends on**: Phase 2 (execution endpoint)
**Requirements**: STREAM-01, STREAM-02, STREAM-03
**Success Criteria** (what must be TRUE):

1. Execution results stream in real-time via SSE
2. User can abort streaming execution mid-response
3. Connection handles heartbeat and automatic reconnection
   **Plans**: 2 plans

Plans:

- [ ] 06-01-PLAN.md — SSE streaming backend (service + endpoint with sveltekit-sse)
- [ ] 06-02-PLAN.md — Client streaming component with abort/reconnection + ExecutionPanel integration

---

### Phase 7: Council Correct Mode

**Goal**: Users can run parallel council review with multiple AI agents
**Depends on**: Phase 1 (function defaults), Phase 2 (execution)
**Requirements**: COUNCIL-01, COUNCIL-02, COUNCIL-03, COUNCIL-04, COUNCIL-05, COUNCIL-06
**Success Criteria** (what must be TRUE):

1. User can trigger parallel council review with 3 AI agents
2. Each agent reviews the user's prompt from their unique perspective
3. Agents use their configured system prompts and models
4. User can override agent prompts per-session
5. Results stream in real-time via SSE
6. User sees all agent feedback with clear agent identification

**Plans**: 2 plans ✓ COMPLETE

Plans:

- [x] 07-01-PLAN.md — Council backend: schema, orchestrator service, SSE streaming API
- [x] 07-02-PLAN.md — Council UI: panel component with parallel agent display, test runner integration

---

### Phase 8: Snippet Library

**Goal**: Users can manage and reuse standalone snippet templates
**Depends on**: Phase 4 (snippet variables)
**Requirements**: SNIPPET-LIB-01, SNIPPET-LIB-02, SNIPPET-LIB-03
**Success Criteria** (what must be TRUE):

1. User can create standalone snippet templates (separate from prompts)
2. User can browse and search snippet library
3. User can insert snippets into prompts

**Plans**: 3 plans

Plans:

- [ ] 08-01-PLAN.md — Snippet library CRUD: schema, service, REST API endpoints
- [ ] 08-02-PLAN.md — Snippet browser UI: list page with search/filter, create/edit forms, detail view
- [ ] 08-03-PLAN.md — Snippet picker: dialog component with search, category filter, cursor-position insertion

---

### Phase 9: Council Debate Mode

**Goal**: Users can run multi-perspective debate analysis with synthesis
**Depends on**: Phase 7 (council correct validates architecture)
**Requirements**: DEBATE-01, DEBATE-02, DEBATE-03
**Success Criteria** (what must be TRUE):

1. User can trigger debate mode with multiple agent perspectives
2. System synthesizes conclusion from agent arguments
3. User sees full debate history with each agent's position

**Plans**: 2 plans

Plans:

- [ ] 09-01-PLAN.md — Backend: council-debate.service.ts orchestrator with 3-round parallel execution + synthesis, SSE streaming API endpoint
- [ ] 09-02-PLAN.md — Frontend: timeline UI with collapsible rounds, agent cards, synthesis card, test runner integration with mode toggle

---

### Phase 10: Council Consensus Mode

**Goal**: Users can run parallel agent voting for consensus decisions
**Depends on**: Phase 7 (council correct validates architecture)
**Requirements**: CONSENSUS-01, CONSENSUS-02, CONSENSUS-03
**Success Criteria** (what must be TRUE):

1. User can trigger consensus mode with parallel agents
2. System aggregates votes and returns consensus result
3. User sees vote breakdown with individual agent responses
   **Plans**: TBD

Plans:

- [ ] 10-01: Parallel voting execution
- [ ] 10-02: Vote aggregation service
- [ ] 10-03: Consensus UI with vote breakdown

---

### Phase 11: JavaScript Snippets

**Goal**: Users can create dynamic snippets with JavaScript execution
**Depends on**: Phase 4 (snippets), security review
**Requirements**: JS-SNIPPET-01, JS-SNIPPET-02
**Success Criteria** (what must be TRUE):

1. User can create JavaScript snippets with code blocks
2. JS snippets execute in sandboxed environment (isolated from main app)
   **Plans**: TBD

Plans:

- [ ] 11-01: JS snippet schema and parsing
- [ ] 11-02: Sandbox execution environment

---

## Progress

**Execution Order:**
Phases execute in numeric order. Decimal phases (if inserted) execute between their surrounding integers.

| Phase                      | Milestone | Requirements | Plans Complete | Status      | Completed  |
| -------------------------- | --------- | ------------ | -------------- | ----------- | ---------- |
| 1. Settings Foundation     | v1.0      | 5            | 2/3            | Complete    | 2026-02-14 |
| 2. Prompt Execution        | v1.0      | 5            | 2/3            | Complete    | 2026-02-22 |
| 3. Execution Logging       | v1.0      | 4            | 2/2            | Complete    | 2026-02-26 |
| 4. Snippet Variables       | v1.0      | 5            | 3/3            | Complete    | 2026-02-26 |
| 5. Test Runner UI          | v1.0      | 4            | 2/2            | Complete    | 2026-02-27 |
| 6. Streaming Execution     | v2.0      | 3            | 2/2            | Complete    | 2026-02-27 |
| 7. Council Correct Mode    | v2.0      | 6            | 2/2            | Complete    | 2026-02-27 |
| 8. Snippet Library         | v2.0      | 3            | 6/6            | Complete    | 2026-02-28 |
| 9. Council Debate Mode     | v3.0      | 3            | 0/2            | Planned     | -          |
| 10. Council Consensus Mode | v3.0      | 3            | 0/3            | Not started | -          |
| 11. JavaScript Snippets    | v3.0      | 2            | 0/2            | Not started | -          |

**Total: 11 phases, 43 requirements, 29 plans**

---

_Roadmap created: 2026-02-14_
_Depth: comprehensive_
_Coverage: 43/43 requirements mapped (100%)_

## Legacy Content: docs/spec/SPEC-09-delivery-plan.md

## DLV-001 Implementation Order

1. Settings refactor
2. Execution PoC
3. Snippets + preview
4. Streaming + UX polish
5. Council modes

## DLV-001A Delivery Gates

- Gate A (Settings-First): complete settings schema, validation, and policy enforcement before execution UI changes.
- Gate B (PoC Integration): complete execute flow end-to-end with logging and fallback visibility.

## DLV-002 Atomic Steps (P1)

- STEP-001: Add new settings keys for function defaults.
- STEP-002: Extend settings UI tabs and forms.
- STEP-003: Implement model resolution utility.
- STEP-004: Add execute API endpoint.
- STEP-005: Add execution log persistence.
- STEP-006: Add test runner UI.
- STEP-007: Add snippet render service.
- STEP-008: Add preview panel in editor.

## DLV-003 Dependencies

- STEP-004 depends on STEP-003.
- STEP-006 depends on STEP-004 and STEP-005.
- STEP-008 depends on STEP-007.

## DLV-004 Definition Of Done Per Step

- Code implemented with tests.
- Error paths covered.
- Docs updated for changed behavior.
- No regression in existing prompt CRUD.

## DLV-005 Phase Exit Criteria

- P1 exits only when AC-001..AC-008 pass.
- P2 starts after P1 green + review approval.

## DLV-005A Expanded Exit Criteria

- P1 also requires AC-011, AC-012, and contract tests from `TST-008`.
- No unresolved `high` severity errors in error-catalog mapping (`SPEC-11-error-catalog.md`).
- Settings schema and API validation must match `SPEC-10-settings-schema.md`.

## DLV-006 PoC Demo Script

1. Configure function defaults in Settings.
2. Open prompt with placeholders.
3. Fill variables and inspect preview.
4. Run execution and show metrics/log.
5. Force one invalid model and show fallback/error behavior.
