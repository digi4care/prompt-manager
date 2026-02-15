# SPEC-11 Error Catalog

## ERR-001 Purpose

Define stable error codes, HTTP mappings, retry behavior, and user actions.

## ERR-002 Error Table

| Code | HTTP | Retryable | Trigger | User Action |
|---|---:|---|---|---|
| `PROMPT_NOT_FOUND` | 404 | false | Prompt ID does not exist | Open existing prompt |
| `SETTINGS_KEY_INVALID` | 400 | false | Unknown setting key | Use supported key |
| `SETTINGS_VALUE_INVALID` | 400 | false | Wrong type/range/format | Correct input value |
| `MODEL_RESOLUTION_FAILED` | 422 | false | No allowed/available model resolved | Select allowed model in settings/prompt |
| `SNIPPET_VALUE_MISSING` | 400 | false | Strict mode unresolved placeholder | Fill required snippet values |
| `SNIPPET_NAME_DUPLICATE` | 409 | false | Duplicate snippet name | Rename snippet |
| `SNIPPET_NOT_FOUND` | 404 | false | Snippet id missing | Refresh and retry |
| `OPENCODE_UNAVAILABLE` | 503 | true | OpenCode health check fails | Retry later or check connection |
| `OPENCODE_EXECUTION_FAILED` | 502 | true | Upstream execution failure | Retry run |
| `OPENCODE_AUTH_FAILED` | 401 | false | Invalid OpenCode auth | Update server credentials |
| `OPENCODE_TIMEOUT` | 504 | true | Request exceeded timeout | Retry with lower scope |
| `RATE_LIMITED` | 429 | true | Provider or server throttled | Retry after delay |

## ERR-003 Error Payload Contract

All API errors return:

- `error.code` (from table)
- `error.message` (human readable)
- `error.retryable` (boolean)
- `error.requestId` (trace id)
- `error.action` (UI CTA hint)

## ERR-004 Retry Policy

- Retry only when `retryable=true`.
- Use exponential backoff based on settings (`opencode_retry_count`, `opencode_retry_delay_ms`).
- Never retry validation, auth, or not-found errors.

## ERR-005 Default/Override/Fallback/Error

- Default retry policy from settings.
- Runtime override for retries is not allowed in PoC.
- Fallback model selection follows `POL-003`.
- If fallback exhausted, return terminal error from this catalog.
