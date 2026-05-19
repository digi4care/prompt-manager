# 05 -- User Stories & Product Backlog

## Backlog Operating Rules
- Product backlog is ordered from top priority to lower priority.
- Every backlog item has a work type, priority, estimate, status, and evidence.
- No current-iteration build/fix item may span more than one primary seam.

## Status Lifecycle
proposed -> refined -> ready -> in_progress -> verified -> done

## Work Types
build | fix | research | enable | verify | release

## Completed Epics (Beads traceable)

### Epic 1: Authentication & Better Auth
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-1.1 | Install Better Auth library | done | prompt-management-vtl |
| US-1.2 | Configure Better Auth environment | done | prompt-management-1yz |
| US-1.3 | Create Better Auth instance | done | prompt-management-3qo |
| US-1.4 | Extend users schema with auth fields | done | prompt-management-up0 |
| US-1.5 | Implement SvelteKit hooks | done | prompt-management-526 |
| US-1.6 | Set up session management | done | prompt-management-01t |
| US-1.7 | Add admin role check | done | prompt-management-7sv |
| US-1.8 | Create /login page | done | prompt-management-6mi |
| US-1.9 | Create /register page | done | prompt-management-afy |
| US-1.10 | Add login/logout UI nav | done | prompt-management-2nc |
| US-1.11 | Write auth flow unit tests | done | prompt-management-yt5 |
| US-1.12 | Write E2E tests for /admin protection | done | prompt-management-rbv |
| US-1.13 | Security review and audit | done | prompt-management-8ji |

### Epic 2: Login Refactor (Server Actions)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-2.1 | Implement server action with Zod validation | done | prompt-management-tu7 |
| US-2.2 | Refactor login form to use SvelteKit enhance | done | prompt-management-rot |
| US-2.3 | Test login flow success/error paths | done | prompt-management-ut3 |
| US-2.4 | Remove obsolete API endpoint | done | prompt-management-8zd |
| US-2.5 | Refactor admin login to Server Actions | done | prompt-management-ssv |
| US-2.6 | Update SECURITY-REVIEW.md | done | prompt-management-ibn |

### Epic 3: Settings Schema Registry
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-3.1 | API route persists settings to DB | done | prompt-management-8d3 |
| US-3.2 | Hidden settings blocking save fix | done | prompt-management-e50 |
| US-3.3 | Dotted same-block dependencies fix | done | prompt-management-dyb |
| US-3.4 | KeyValueEditor sync bug fix | done | prompt-management-r48 |
| US-3.5 | maxTokens lost in legacy migration fix | done | prompt-management-d30 |

## Active Work

### Epic 4: Planning Migration
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-4.1 | Inventory all planning artifacts | done | prompt-management-65j |
| US-4.2 | Create canonical directory structure | in_progress | prompt-management-2a1 |
| US-4.3 | Port legacy .planning/ content | pending | prompt-management-k8q |
| US-4.4 | Port docs/spec/ content | pending | prompt-management-116 |
| US-4.5 | Port docs/plans/ content | pending | prompt-management-416 |
| US-4.6 | Create index.md with state machine | pending | prompt-management-4l5 |
| US-4.7 | Map Beads issues to planning docs | pending | prompt-management-m8m |
| US-4.8 | Document brownfield baseline | pending | prompt-management-9dw |
| US-4.9 | Validate canonical structure | pending | prompt-management-j9a |
| US-4.10 | Archive legacy directories | pending | prompt-management-1il |


### Epic 5: Prompt Execution (Phase 2)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-5.1 | Execute prompt via OpenCode SDK and receive AI response | done | - |
| US-5.2 | Display resolved model used for each execution | done | - |
| US-5.3 | Support per-execution override of model, temperature, and max_tokens | done | - |
| US-5.4 | Show clear error context for failed executions | done | - |
| US-5.5 | Display execution duration and token counts in response | done | - |

### Epic 6: Execution Logging (Phase 3)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-6.1 | Create log entry with model_id, model_source, tokens, duration on every execution | done | - |
| US-6.2 | View execution history for any prompt | done | - |
| US-6.3 | Show resolved input prompt with variables substituted in logs | done | - |
| US-6.4 | Include output or error with context in log entries | done | - |

### Epic 7: Snippet Variables (Phase 4)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-7.1 | Define {{VAR}} placeholders in prompt frontmatter | done | - |
| US-7.2 | Live preview of resolved prompt as user types variable values | done | - |
| US-7.3 | Reactive preview update on every keystroke | done | - |
| US-7.4 | Clear error message in preview for missing required variables | done | - |
| US-7.5 | Safe escaping of variable values containing {{ or }} | done | - |

### Epic 8: Test Runner UI (Phase 5)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-8.1 | Access test runner panel from prompt editor | done | - |
| US-8.2 | Fill variable inputs and see resolved preview before execution | done | - |
| US-8.3 | Run execution and see results inline in the panel | done | - |
| US-8.4 | Display execution metrics (model, tokens, duration) in results | done | - |

### Epic 9: Streaming Execution (Phase 6)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-9.1 | Stream execution results in real-time via SSE | done | - |
| US-9.2 | Abort streaming execution mid-response | done | - |
| US-9.3 | Handle heartbeat and automatic reconnection for SSE connection | done | - |

### Epic 10: Council Correct Mode (Phase 7)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-10.1 | Trigger parallel council review with 3 AI agents | done | - |
| US-10.2 | Each agent reviews prompt from unique perspective | done | - |
| US-10.3 | Agents use configured system prompts and models | done | - |
| US-10.4 | Override agent prompts per-session | done | - |
| US-10.5 | Stream council results in real-time via SSE | done | - |
| US-10.6 | Display all agent feedback with clear agent identification | done | - |

### Epic 11: Snippet Library (Phase 8)
| ID | Title | Status | Beads Issue |
|----|-------|--------|-------------|
| US-11.1 | Create standalone snippet templates separate from prompts | done | - |
| US-11.2 | Browse and search snippet library | done | - |
| US-11.3 | Insert snippets into prompts | done | - |

## Legacy Content: SPEC-05 UI/UX Flows

### UX-001 Information Architecture

Settings page tabs:

1. Connection
2. Models
3. Functions
4. Council
5. Presets
6. Advanced

### UX-002 Settings Save Flow

1. User edits values.
2. Dirty state indicator appears.
3. User saves section.
4. API validates and persists.
5. Toast success with saved timestamp.

### UX-003 Prompt Test Flow

1. User opens prompt editor.
2. User fills snippet values.
3. Preview updates.
4. User clicks Run Test.
5. Result panel shows output + metrics.

### UX-004 UI States (Required)

- `loading`: spinner + disabled inputs.
- `empty`: explicit no-data messages.
- `success`: result and metadata visible.
- `error`: inline message + retry action.

### UX-005 Override Behavior Display

- Show active model source badge: `default | prompt override | run override`.
- Show fallback badge when fallback used.

### UX-006 Error UX

- Connection failure -> show `Check OpenCode URL` CTA.
- Model resolution failure -> show `Choose allowed model` CTA.
- Snippet validation failure -> focus first unresolved placeholder.

### UX-007 Accessibility Rules

- Form controls have labels.
- Errors announced in aria-live region.
- Keyboard flow works for all primary actions.

## Legacy Content: SPEC-07 Acceptance Criteria

### AC-001 Settings Roundtrip

Given admin opens Settings
When admin updates executor default model and saves
Then value persists and appears after reload.

### AC-002 Model Policy Enforcement

Given policy mode is restricted
When user selects disallowed model
Then API rejects with `MODEL_RESOLUTION_FAILED`.

### AC-003 Prompt Execution Success

Given valid prompt and valid model
When user runs test
Then response and metrics are shown and execution log is stored.

### AC-004 Prompt Execution Failure

Given OpenCode server is unreachable
When user runs test
Then user sees actionable error and no app crash occurs.

### AC-005 Snippet Preview

Given prompt includes `{{CONTEXT}}` and `{{TASK}}`
When user enters values
Then preview renders resolved text immediately.

### AC-006 Strict Snippet Validation

Given strict mode enabled
When unresolved placeholder exists
Then execution is blocked with `SNIPPET_VALUE_MISSING`.

### AC-007 Override Precedence

Given function default, prompt override, and run override are set
When execution starts
Then run override is used if allowed.

### AC-008 Fallback Behavior

Given run override is invalid and prompt override is valid
When execution starts
Then prompt override is used and UI indicates fallback.

### AC-009 Council Correct Mode

Given valid council correct config
When user runs correct mode
Then system executes producer/reviewer/fix steps and stores step logs.

### AC-010 Accessibility Baseline

Given keyboard-only usage
When navigating settings and test runner
Then all primary actions are reachable and usable.

### AC-011 Settings Type Validation

Given admin submits wrong type for a settings key
When backend validates payload
Then request fails with `SETTINGS_VALUE_INVALID` and no data is changed.

### AC-012 Retryable Error Metadata

Given execution fails with transient upstream issue
When API returns error
Then payload includes `retryable=true` and UI shows retry action.
## Refinement Queue
| Item | Work Type | Why not ready | Next action |
|------|-----------|---------------|-------------|
| Settings route cleanup (merge /settings-new into /settings) | build | Waiting on registry validation | Complete migration first |
| Model picker modal bug fix | fix | Needs debugging | Add to next iteration |
| Council debate mode UI | build | Phase 09-01 backend done | Implement frontend |
| Council consensus mode | build | P3 priority | Defer |
