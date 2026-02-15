# SPEC-06 Rules And Policies

## POL-000 Canonical Policy Source

- This document is the single source of truth for model resolution.
- Any precedence/fallback change must be made here first.
- Other specs must reference policy IDs and cannot redefine the same logic.

## POL-001 Model Policy

- Allowed models list is authoritative when policy mode is `restricted`.
- In `open` mode all catalog models are selectable.

## POL-002 Precedence Rules

For execution and judge/improve/council model resolution:

1. Runtime override (request payload)
2. Prompt-level override
3. Function default setting
4. Global default setting

## POL-002A Resolution Decision Table

- Candidate invalid because format/type -> skip to next candidate.
- Candidate disallowed by policy -> skip to next candidate.
- Candidate allowed but temporarily unavailable -> skip and mark fallback path.
- First valid candidate wins and is returned with `modelSource`.

## POL-003 Fallback Rules

- If current candidate is unavailable or not allowed, try next precedence level.
- Never fallback to disallowed model.

## POL-004 Error Rules

- If no valid candidate: `MODEL_RESOLUTION_FAILED`.
- If OpenCode connection fails: `OPENCODE_UNAVAILABLE`.
- If OpenCode returns tool/model error: `OPENCODE_EXECUTION_FAILED`.

## POL-005 Snippet Rules

- Placeholder format: `{{NAME}}`.
- Unknown placeholder in strict mode: hard error.
- Unknown placeholder in non-strict mode: keep unresolved marker.

## POL-006 JavaScript Snippet Security

- Disabled by default in PoC.
- If enabled, evaluate in restricted sandbox only.
- No filesystem, no network, no process APIs.

## POL-007 Council Rules

- `correct` mode required for PoC.
- `debate/consensus` optional in later phases.
- Each council step logs role, model, duration, output.

## POL-008 Operational Policy

- Timeout, retry count, retry delay are configurable in settings.
- Retry only transient failures.

## POL-009 Council Guardrails

- `correct` mode must complete steps in strict order: producer -> reviewer -> fix.
- `debate` and `consensus` may run only when explicitly enabled in settings.
- Per-step timeout defaults to function timeout if no council-specific timeout is set.
