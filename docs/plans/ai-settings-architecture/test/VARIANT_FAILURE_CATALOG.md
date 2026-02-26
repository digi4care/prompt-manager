# AI Settings Variant Failure Catalog

Last updated: 2026-02-25

## Purpose

Central list of expected failure behavior for model/variant enforcement.

## Error Catalog

| Failure ID | Error Code               | Trigger                                                 | Expected Behavior                                      |
| ---------- | ------------------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| VF-001     | `MODEL_NOT_ALLOWED`      | Selected model not in allowlist                         | Reject save/update with deterministic validation error |
| VF-002     | `VARIANT_REQUIRED`       | Model has policy-bound variants but no variant selected | Reject save/update; return required-variant guidance   |
| VF-003     | `VARIANT_NOT_ALLOWED`    | Chosen variant not allowed for selected model/scope     | Reject save/update; preserve previous valid config     |
| VF-004     | `VARIANT_NOT_AVAILABLE`  | Variant not present in current catalog for that model   | Reject save/update and prompt catalog refresh action   |
| VF-005     | `MODEL_NOT_FOUND`        | Model missing from provider/model graph                 | Reject and report model resolution failure             |
| VF-006     | `PROVIDER_NOT_CONNECTED` | Provider unavailable while validating model/variant     | Reject or block action based on policy strictness      |

## Required Assertions Per Failure

1. API status code and error payload shape.
2. Stable error code (`code`) and message (`message`) semantics.
3. No unintended persistence of invalid state.
4. UI error feedback renders and is user-actionable.
5. Retry path behaves deterministically after correction.

## Test Coverage Mapping

- Function defaults: `SET-FDEF-002`
- LLM council: `SET-COUNC-002`
- Presets: `SET-PRESET-002`
- Policy validators: `SET-POL-002`, `SET-POL-003`
