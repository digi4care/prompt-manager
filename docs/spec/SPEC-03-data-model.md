# SPEC-03 Data Model

## DB-001 Existing Tables (Reuse)

- `prompts`, `promptVersions`, `judgeEvaluations`, `improvementLoops`, `adminSettings`, `improvePresets`.

## DB-002 New Tables

- `snippets`
- `snippetValues`
- `executionLogs`
- `councilSessions`
- `councilSteps`

## DB-003 snippets

- Columns: `id`, `name` (unique), `type`, `defaultValue`, `description`, `createdAt`, `updatedAt`.
- `type` enum: `text | select | javascript | date`.

## DB-004 snippetValues

- Columns: `id`, `promptId`, `snippetId`, `value`, `createdAt`, `updatedAt`.
- Unique: `(promptId, snippetId)`.

## DB-005 executionLogs

- Columns: `id`, `promptId`, `promptVersionId`, `model`, `temperature`, `resolvedPrompt`, `response`, `success`, `errorCode`, `errorMessage`, `inputTokens`, `outputTokens`, `durationMs`, `createdAt`.

## DB-006 councilSessions

- Columns: `id`, `promptId`, `mode`, `configJson`, `status`, `result`, `totalTokens`, `durationMs`, `createdAt`, `completedAt`.

## DB-007 councilSteps

- Columns: `id`, `sessionId`, `stepIndex`, `role`, `model`, `input`, `output`, `tokens`, `durationMs`, `status`, `errorCode`, `createdAt`.

## DB-008 Migration Order

1. Create `snippets` and `snippetValues`.
2. Create `executionLogs`.
3. Create `councilSessions` and `councilSteps`.
4. Add new settings keys defaults in seed/init flow.

## DB-008A Backfill Rules

- For existing prompts, do not create snippet rows automatically.
- Create snippet values lazily on first save from prompt editor.
- Existing execution history remains unchanged and unlinked when no prompt version is available.

## DB-008B Rollback Rules

- Migrations must include down scripts for all new tables.
- Rollback must not touch existing tables and data.
- If rollback occurs after production writes, export affected new-table data before rollback.

## DB-009 Backward Compatibility Rules

- Additive changes only in PoC cycle.
- No drop/rename of existing columns in same cycle.
- Existing prompt CRUD behavior must remain unchanged.

## DB-010 Default/Override/Fallback/Error

- Default snippet value from `snippets.defaultValue`.
- Override snippet value from `snippetValues` or runtime payload.
- Fallback to raw placeholder only when strict mode is off.
- Error `SNIPPET_VALUE_MISSING` when strict mode on and unresolved placeholder exists.
