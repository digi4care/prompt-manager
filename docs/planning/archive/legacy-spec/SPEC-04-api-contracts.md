# SPEC-04 API Contracts

## API-001 Auth Rules

- Admin settings endpoints require admin session.
- Prompt execution endpoints require authenticated user.
- Return `401` unauthenticated, `403` unauthorized.

## API-002 GET /api/admin/settings

- Response: all settings grouped by category.
- Error codes: `SETTINGS_READ_FAILED`.

## API-003 PUT /api/admin/settings/:key

- Request: `{ value: string | number | boolean | string[] }`.
- Validate by known key + expected type.
- Errors: `SETTINGS_KEY_INVALID`, `SETTINGS_VALUE_INVALID`.

## API-004 POST /api/prompts/:id/execute

- Request:
  - `model?` string (format: `provider/model`)
  - `temperature?` number (`0.0..2.0`, default from function setting)
  - `variables?` object (string keys, scalar string values)
  - `strictSnippets?` boolean (default `true`)
  - `maxTokens?` number (`1..16384`, optional)
- Response success:
  - `runId` string
  - `response` string
  - `resolvedModel` string
  - `modelSource` enum (`function_default | prompt_override | run_override | fallback`)
  - `inputTokens` number
  - `outputTokens` number
  - `durationMs` number
  - `fallbackUsed` boolean
- Errors:
  - `PROMPT_NOT_FOUND`
  - `MODEL_RESOLUTION_FAILED`
  - `SNIPPET_VALUE_MISSING`
  - `OPENCODE_UNAVAILABLE`
  - `OPENCODE_EXECUTION_FAILED`

## API-004A Execute Validation Rules

- Reject request with `400` and `SETTINGS_VALUE_INVALID` for invalid number ranges.
- Reject request with `400` and `SNIPPET_VALUE_MISSING` when strict mode enabled and unresolved placeholders remain.
- Reject request with `422` and `MODEL_RESOLUTION_FAILED` when no allowed model is resolvable.
- Return `503` and `OPENCODE_UNAVAILABLE` when health check fails before execution.

## API-005 GET /api/prompts/:id/stream

- Protocol: SSE.
- Events: `started`, `chunk`, `completed`, `failed`.
- Error code on failure event payload required.

## API-005A SSE Event Schema

- `started`: `{ runId, promptId, resolvedModel, startedAt }`
- `chunk`: `{ runId, index, textDelta }`
- `completed`: `{ runId, response, inputTokens, outputTokens, durationMs }`
- `failed`: `{ runId, errorCode, errorMessage, retryable }`

## API-006 Snippets CRUD

- `GET /api/snippets`
- `POST /api/snippets`
- `PUT /api/snippets/:id`
- `DELETE /api/snippets/:id`
- Error: `SNIPPET_NAME_DUPLICATE`, `SNIPPET_NOT_FOUND`.

## API-007 Council

- `POST /api/council/correct`
- `POST /api/council/debate`
- `POST /api/council/consensus`
- Shared response: `sessionId`, `status`, `steps[]`, `result`, `durationMs`.

## API-008 Resolution Behavior

- Resolution behavior is defined only in `SPEC-06-rules-and-policies.md` (`POL-002`, `POL-003`, `POL-004`).
