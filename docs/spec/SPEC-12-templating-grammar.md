# SPEC-12 Templating Grammar

## TMP-001 Purpose

Define deterministic placeholder parsing and rendering for prompt preview and execution.

## TMP-002 Grammar

- Placeholder token format: `{{NAME}}`.
- `NAME` regex: `[A-Z][A-Z0-9_]{0,63}`.
- Whitespace inside braces is ignored: `{{ NAME }}` equals `{{NAME}}`.

## TMP-003 Escape Rules

- Literal placeholder syntax: `{{!NAME}}`.
- Render behavior: remove `!` and output `{{NAME}}` without substitution.

## TMP-004 Resolution Order

1. Runtime `variables` payload
2. Prompt-level snippet values
3. Snippet default value
4. Unresolved behavior (strict/non-strict)

## TMP-005 Strictness Modes

- Strict mode (`true`): unresolved placeholder causes `SNIPPET_VALUE_MISSING`.
- Non-strict mode (`false`): unresolved placeholder remains as `{{NAME}}`.

## TMP-006 Supported Types

- `text`: plain string substitution.
- `select`: must match configured option value.
- `date`: ISO date string normalization.
- `javascript`: disabled by default; only allowed if `snippet_js_enabled=true`.

## TMP-007 JavaScript Safety

- Execute in restricted sandbox only.
- No filesystem/network/process/global mutable state.
- Hard timeout per evaluation (`<=100ms` default).

## TMP-008 Validation Errors

- Invalid token format -> ignored as plain text.
- Unknown placeholder in strict mode -> `SNIPPET_VALUE_MISSING`.
- Unsupported type conversion -> `SETTINGS_VALUE_INVALID`.

## TMP-009 Default/Override/Fallback/Error

- Defaults come from snippet definitions.
- Overrides come from prompt values and runtime variables.
- Fallback keeps placeholder only in non-strict mode.
- Strict mode unresolved placeholders are hard errors.
