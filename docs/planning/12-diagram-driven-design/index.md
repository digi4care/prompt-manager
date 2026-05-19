# 12 -- Diagram-Driven Design


## Architecture Description

### System Context (ARC-001)

- **Frontend:** SvelteKit UI for settings, prompt editing, testing.
- **Backend:** SvelteKit server routes + service layer.
- **AI Engine:** OpenCode server via `@opencode-ai/sdk`.
- **Storage:** SQLite/libsql via Drizzle.

### Module Boundaries (ARC-002)

| Module | Responsibility |
|--------|---------------|
| MOD-001 Settings Module | Policy/defaults/provider config |
| MOD-002 Prompt Module | CRUD/versioning/snippet rendering |
| MOD-003 Execution Module | Run prompt, stream, log |
| MOD-004 Judge Module | Rubric scoring |
| MOD-005 Council Module | Multi-model orchestration |

### Data Flow - Execution (ARC-003)

1. UI submits prompt run request.
2. API resolves model by precedence (run > prompt > default).
3. Snippets are rendered to final prompt text.
4. Execution service calls OpenCode SDK.
5. Response + metrics saved in execution log.
6. API returns structured result to UI.

### Operational Constraints (ARC-004)

- Do not call OpenCode directly from browser; always via server routes.
- Keep SDK errors mapped to stable app error codes.
- All settings writes must be auditable by key + timestamp.

### Reliability Rules (ARC-005)

- Retry transient OpenCode failures up to configured limit.
- Do not retry validation errors.
- Timeout requests based on settings value.

### Explicit Behaviors (ARC-006)

- Resolution behavior must follow `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`).
- Architecture and API documents must reference policy IDs instead of re-defining precedence.
- Error payloads must include stable app code and user action hint for UI rendering.

## Data Model / ERD Description

### Existing Tables (DB-001)

- `prompts`, `promptVersions`, `judgeEvaluations`, `improvementLoops`, `adminSettings`, `improvePresets`.

### New Tables (DB-002)

- `snippets`, `snippetValues`, `executionLogs`, `councilSessions`, `councilSteps`.

### Table Definitions

**snippets (DB-003)**
- Columns: `id`, `name` (unique), `type`, `defaultValue`, `description`, `createdAt`, `updatedAt`
- `type` enum: `text | select | javascript | date`

**snippetValues (DB-004)**
- Columns: `id`, `promptId`, `snippetId`, `value`, `createdAt`, `updatedAt`
- Unique: `(promptId, snippetId)`

**executionLogs (DB-005)**
- Columns: `id`, `promptId`, `promptVersionId`, `model`, `temperature`, `resolvedPrompt`, `response`, `success`, `errorCode`, `errorMessage`, `inputTokens`, `outputTokens`, `durationMs`, `createdAt`

**councilSessions (DB-006)**
- Columns: `id`, `promptId`, `mode`, `configJson`, `status`, `result`, `totalTokens`, `durationMs`, `createdAt`, `completedAt`

**councilSteps (DB-007)**
- Columns: `id`, `sessionId`, `stepIndex`, `role`, `model`, `input`, `output`, `tokens`, `durationMs`, `status`, `errorCode`, `createdAt`

### Migration Order (DB-008)

1. Create `snippets` and `snippetValues`.
2. Create `executionLogs`.
3. Create `councilSessions` and `councilSteps`.
4. Add new settings keys defaults in seed/init flow.

### Backfill Rules (DB-008A)

- For existing prompts, do not create snippet rows automatically.
- Create snippet values lazily on first save from prompt editor.
- Existing execution history remains unchanged and unlinked when no prompt version is available.

### Rollback Rules (DB-008B)

- Migrations must include down scripts for all new tables.
- Rollback must not touch existing tables and data.
- If rollback occurs after production writes, export affected new-table data before rollback.

### Backward Compatibility (DB-009)

- Additive changes only in PoC cycle.
- No drop/rename of existing columns in same cycle.
- Existing prompt CRUD behavior must remain unchanged.

### Snippet Default/Override/Fallback/Error (DB-010)

- Default snippet value from `snippets.defaultValue`.
- Override snippet value from `snippetValues` or runtime payload.
- Fallback to raw placeholder only when strict mode is off.
- Error `SNIPPET_VALUE_MISSING` when strict mode on and unresolved placeholder exists.

## Legacy Content: Architecture Spec

**Source:** `docs/spec/SPEC-02-architecture.md`

## Legacy Content: Data Model Spec

**Source:** `docs/spec/SPEC-03-data-model.md`

## Required Diagrams (Standard Profile)
- [ ] Context diagram (C4 Level 1)
- [ ] Container diagram (C4 Level 2)
- [ ] Component diagram (C4 Level 3)
- [ ] Data model / ERD
- [ ] Key user flows

## Traceability
| Diagram | Requirements | Stories | Status |
|---------|-------------|---------|--------|
| Context | FR-01..FR-07 | All | Pending migration |
| Container | FR-04, NFR-03 | US-3.x | Pending migration |
| Data Model | FR-02, FR-03 | Prompts, Snippets | Pending migration |

## Validation Evidence
- Legacy architecture docs contain partial diagrams
- Need to extract and render as canonical diagrams/
