# Requirements: Prompt Management with OpenCode Integration

**Defined:** 2026-02-14
**Core Value:** Settings-first PoC for OpenCode integration with per-function model defaults

---

## v1 Requirements (P1)

### Settings

- [ ] **SETTINGS-01**: User can configure default model per function type (executor, judge, improve, council)
- [ ] **SETTINGS-02**: User can set default temperature per function type
- [ ] **SETTINGS-03**: User can set default max tokens per function type
- [ ] **SETTINGS-04**: Settings cascade: Request > Preset > Policy > Global Default
- [ ] **SETTINGS-05**: Model resolution logs which source provided the model (model_source field)

### Execution

- [ ] **EXEC-01**: User can execute prompt via OpenCode SDK with resolved model
- [ ] **EXEC-02**: User sees which model was used for each execution
- [ ] **EXEC-03**: User can override defaults per-execution (model, temperature, max_tokens)
- [ ] **EXEC-04**: Execution fails gracefully with clear error when model unavailable
- [ ] **EXEC-05**: User can see execution duration and token counts

### Logging

- [ ] **LOG-01**: Every execution creates log entry with model_id, model_source, tokens, duration
- [ ] **LOG-02**: User can view execution history for a prompt
- [ ] **LOG-03**: Logs include input prompt (resolved, with variables substituted)
- [ ] **LOG-04**: Logs include output/error with context

### Snippets

- [ ] **SNIPPET-01**: User can define variables in prompt frontmatter ({{VAR}})
- [ ] **SNIPPET-02**: User sees live preview of resolved prompt as they type variable values
- [ ] **SNIPPET-03**: Preview updates on every keystroke
- [ ] **SNIPPET-04**: Missing required variable shows clear error in preview
- [ ] **SNIPPET-05**: Variable injection is escaped (security: prevent {{ in values)

### Test Runner UI

- [ ] **UI-01**: User can access test runner panel from prompt editor
- [ ] **UI-02**: User can fill variable inputs and see preview before execution
- [ ] **UI-03**: User can run execution and see results inline
- [ ] **UI-04**: User can see execution metrics (model, tokens, duration)

---

## v2 Requirements (P2)

### Council Mode - Correct

- [ ] **COUNCIL-01**: User can run "correct" mode (producer → reviewer → fix)
- [ ] **COUNCIL-02**: Producer step generates initial output using "executor" defaults
- [ ] **COUNCIL-03**: Reviewer step identifies issues using "judge" defaults
- [ ] **COUNCIL-04**: Fix step resolves issues using "improve" defaults
- [ ] **COUNCIL-05**: Round limit enforced (max 3 rounds)
- [ ] **COUNCIL-06**: User sees all step outputs with clear progression

### Streaming

- [ ] **STREAM-01**: Execution results stream in real-time via SSE
- [ ] **STREAM-02**: User can abort streaming execution
- [ ] **STREAM-03**: Connection handles heartbeat and reconnection

### Snippet Library

- [ ] **SNIPPET-LIB-01**: User can create standalone snippet templates
- [ ] **SNIPPET-LIB-02**: User can browse and search snippet library
- [ ] **SNIPPET-LIB-03**: User can insert snippets into prompts

---

## v3 Requirements (P3)

### Council Mode - Debate

- [ ] **DEBATE-01**: User can run "debate" mode with multiple agent perspectives
- [ ] **DEBATE-02**: System synthesizes conclusion from agent arguments
- [ ] **DEBATE-03**: User sees full debate history

### Council Mode - Consensus

- [ ] **CONSENSUS-01**: User can run "consensus" mode with parallel agents
- [ ] **CONSENSUS-02**: System aggregates votes and returns consensus
- [ ] **CONSENSUS-03**: User sees vote breakdown

### JavaScript Snippets

- [ ] **JS-SNIPPET-01**: User can create JavaScript snippets
- [ ] **JS-SNIPPET-02**: JS snippets execute in sandboxed environment

---

## Out of Scope

| Feature                         | Reason                                             |
| ------------------------------- | -------------------------------------------------- |
| Cost optimization engine        | Complex infrastructure, defer to post-PoC          |
| Enterprise RBAC                 | Full redesign not needed for PoC                   |
| Background queue workers        | Requires distributed execution infrastructure      |
| Real-time collaborative editing | Massive complexity, not core value                 |
| Fine-tuning integration         | Different domain, ML infrastructure                |
| Built-in LLM provider           | Infrastructure nightmare, users bring own OpenCode |
| Visual workflow builder         | UX nightmare, fixed council modes sufficient       |
| Analytics dashboard             | Requires data aggregation, defer                   |
| Mobile app                      | Web-first responsive design sufficient             |

---

## Traceability

| Requirement    | Phase                            | Status  |
| -------------- | -------------------------------- | ------- |
| SETTINGS-01    | Phase 1: Settings Foundation     | Pending |
| SETTINGS-02    | Phase 1: Settings Foundation     | Pending |
| SETTINGS-03    | Phase 1: Settings Foundation     | Pending |
| SETTINGS-04    | Phase 1: Settings Foundation     | Pending |
| SETTINGS-05    | Phase 1: Settings Foundation     | Pending |
| EXEC-01        | Phase 2: Prompt Execution        | Pending |
| EXEC-02        | Phase 2: Prompt Execution        | Pending |
| EXEC-03        | Phase 2: Prompt Execution        | Pending |
| EXEC-04        | Phase 2: Prompt Execution        | Pending |
| EXEC-05        | Phase 2: Prompt Execution        | Pending |
| LOG-01         | Phase 3: Execution Logging       | Pending |
| LOG-02         | Phase 3: Execution Logging       | Pending |
| LOG-03         | Phase 3: Execution Logging       | Pending |
| LOG-04         | Phase 3: Execution Logging       | Pending |
| SNIPPET-01     | Phase 4: Snippet Variables       | Pending |
| SNIPPET-02     | Phase 4: Snippet Variables       | Pending |
| SNIPPET-03     | Phase 4: Snippet Variables       | Pending |
| SNIPPET-04     | Phase 4: Snippet Variables       | Pending |
| SNIPPET-05     | Phase 4: Snippet Variables       | Pending |
| UI-01          | Phase 5: Test Runner UI          | Pending |
| UI-02          | Phase 5: Test Runner UI          | Pending |
| UI-03          | Phase 5: Test Runner UI          | Pending |
| UI-04          | Phase 5: Test Runner UI          | Pending |
| STREAM-01      | Phase 6: Streaming Execution     | Pending |
| STREAM-02      | Phase 6: Streaming Execution     | Pending |
| STREAM-03      | Phase 6: Streaming Execution     | Pending |
| COUNCIL-01     | Phase 7: Council Correct Mode    | Pending |
| COUNCIL-02     | Phase 7: Council Correct Mode    | Pending |
| COUNCIL-03     | Phase 7: Council Correct Mode    | Pending |
| COUNCIL-04     | Phase 7: Council Correct Mode    | Pending |
| COUNCIL-05     | Phase 7: Council Correct Mode    | Pending |
| COUNCIL-06     | Phase 7: Council Correct Mode    | Pending |
| SNIPPET-LIB-01 | Phase 8: Snippet Library         | Pending |
| SNIPPET-LIB-02 | Phase 8: Snippet Library         | Pending |
| SNIPPET-LIB-03 | Phase 8: Snippet Library         | Pending |
| DEBATE-01      | Phase 9: Council Debate Mode     | Pending |
| DEBATE-02      | Phase 9: Council Debate Mode     | Pending |
| DEBATE-03      | Phase 9: Council Debate Mode     | Pending |
| CONSENSUS-01   | Phase 10: Council Consensus Mode | Pending |
| CONSENSUS-02   | Phase 10: Council Consensus Mode | Pending |
| CONSENSUS-03   | Phase 10: Council Consensus Mode | Pending |
| JS-SNIPPET-01  | Phase 11: JavaScript Snippets    | Pending |
| JS-SNIPPET-02  | Phase 11: JavaScript Snippets    | Pending |

**Coverage:**

- v1 requirements: 23 total → Phases 1-5
- v2 requirements: 12 total → Phases 6-8
- v3 requirements: 8 total → Phases 9-11
- Total: 43 requirements mapped to 11 phases
- Unmapped: 0 ✓

---

## Validated Requirements (Existing Codebase)

These capabilities already exist in the codebase and are validated:

- ✓ Prompt CRUD with versions
- ✓ Prompt editor with Monaco syntax highlighting
- ✓ Diff view for version comparison
- ✓ Judge evaluations (score 1-10 with feedback)
- ✓ Improvement loop (generate variants from feedback)
- ✓ Admin settings UI
- ✓ Search/filter prompts

---

_Requirements defined: 2026-02-14_
_Last updated: 2026-02-14 after /gsd-new-project initialization_
