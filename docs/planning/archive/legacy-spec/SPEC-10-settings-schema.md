# SPEC-10 Settings Schema

## SET-001 Purpose

Define all settings keys, types, defaults, and validation so backend and UI share one contract.

## SET-002 Storage

- Backed by `adminSettings` key-value table.
- `key` is unique.
- `value` is serialized JSON for non-scalar types.

## SET-003 Key Registry

| Key | Type | Default | Allowed Values | Used By |
|---|---|---|---|---|
| `opencode_policy_mode` | enum | `restricted` | `restricted`, `open` | Policy engine |
| `opencode_allowed_models` | string[] | `[]` | `provider/model` entries | Policy engine |
| `opencode_global_default_model` | string | `""` | catalog model id | All functions |
| `opencode_timeout_ms` | number | `30000` | `1000..120000` | All functions |
| `opencode_retry_count` | number | `2` | `0..5` | All functions |
| `opencode_retry_delay_ms` | number | `500` | `100..10000` | All functions |
| `opencode_executor_default_model` | string | `""` | catalog model id | Execute |
| `opencode_executor_temperature` | number | `0.2` | `0.0..2.0` | Execute |
| `opencode_executor_max_tokens` | number | `4096` | `1..16384` | Execute |
| `opencode_judge_default_model` | string | `""` | catalog model id | Judge |
| `opencode_judge_temperature` | number | `0.0` | `0.0..1.0` | Judge |
| `opencode_improve_default_model` | string | `""` | catalog model id | Improve |
| `opencode_improve_temperature` | number | `0.5` | `0.0..2.0` | Improve |
| `opencode_council_correct_producer_model` | string | `""` | catalog model id | Council correct |
| `opencode_council_correct_reviewer_model` | string | `""` | catalog model id | Council correct |
| `opencode_council_correct_fix_model` | string | `""` | catalog model id | Council correct |
| `opencode_council_step_timeout_ms` | number | `30000` | `1000..120000` | Council |
| `opencode_stream_enabled` | boolean | `false` | `true/false` | Execute stream |
| `snippet_strict_default` | boolean | `true` | `true/false` | Snippet render |
| `snippet_js_enabled` | boolean | `false` | `true/false` | Snippet render |

## SET-004 Validation Rules

- Unknown key -> `SETTINGS_KEY_INVALID`.
- Type mismatch -> `SETTINGS_VALUE_INVALID`.
- Number out of range -> `SETTINGS_VALUE_INVALID`.
- Invalid model id format -> `SETTINGS_VALUE_INVALID`.

## SET-005 Default/Override/Fallback/Error

- Default values are listed in `SET-003`.
- Overrides happen in runtime APIs and prompt-level settings, not in this key registry.
- Fallback and precedence follow `POL-002` and `POL-003`.
- If no value can be resolved, return `MODEL_RESOLUTION_FAILED`.

## SET-006 UI Binding Rules

- Each key is bound to a specific form control type.
- Save action validates against this schema before persistence.
- UI must show value source when inherited from global default.
