# SPEC-02 Architecture

## ARC-001 System Context

- Frontend: SvelteKit UI for settings, prompt editing, testing.
- Backend: SvelteKit server routes + service layer.
- AI Engine: OpenCode server via `@opencode-ai/sdk`.
- Storage: SQLite/libsql via Drizzle.

## ARC-002 Module Boundaries

- MOD-001 Settings Module: policy/defaults/provider config.
- MOD-002 Prompt Module: CRUD/versioning/snippet rendering.
- MOD-003 Execution Module: run prompt, stream, log.
- MOD-004 Judge Module: rubric scoring.
- MOD-005 Council Module: multi-model orchestration.

## ARC-003 Data Flow (Execution)

1. UI submits prompt run request.
2. API resolves model by precedence.
3. Snippets are rendered to final prompt text.
4. Execution service calls OpenCode SDK.
5. Response + metrics saved in execution log.
6. API returns structured result to UI.

## ARC-004 Operational Constraints

- Do not call OpenCode directly from browser; always via server routes.
- Keep SDK errors mapped to stable app error codes.
- All settings writes must be auditable by key + timestamp.

## ARC-005 Reliability Rules

- Retry transient OpenCode failures up to configured limit.
- Do not retry validation errors.
- Timeout requests based on settings value.

## ARC-006 Explicit Behaviors

- Resolution behavior must follow `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`).
- Architecture and API documents must reference policy IDs instead of re-defining precedence.
- Error payloads must include stable app code and user action hint for UI rendering.
