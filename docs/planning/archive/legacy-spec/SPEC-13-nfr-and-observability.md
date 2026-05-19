# SPEC-13 NFR And Observability

## NFR-001 Performance Targets

- Settings read/write p95 <= 1000ms (excluding first cold request).
- Prompt execute API p95 <= 30000ms for standard prompts.
- Preview render update <= 200ms after input change.

## NFR-002 Reliability Targets

- Settings endpoints success rate >= 99.9% over 24h window.
- Execute endpoint success rate >= 98.0% excluding upstream outages.
- Zero data-loss for execution logs after successful run completion.

## NFR-003 Security Targets

- OpenCode credentials never exposed to browser.
- Server-only execution path for model calls.
- JavaScript snippets disabled by default.

## OBS-001 Required Structured Logs

- `settings.updated`
- `model.resolution`
- `prompt.executed`
- `prompt.execution_failed`
- `snippet.rendered`
- `council.step_completed`

## OBS-002 Required Metrics

- `api_execute_duration_ms`
- `api_settings_write_duration_ms`
- `model_resolution_fallback_count`
- `execution_error_count{code}`
- `snippet_unresolved_count`

## OBS-003 Trace Fields

- `requestId`
- `userId` (if authenticated)
- `promptId`
- `runId`
- `resolvedModel`
- `modelSource`

## NFR-004 Alerting Rules

- Alert when `OPENCODE_UNAVAILABLE` occurs continuously for 5 minutes.
- Alert when execute p95 > 30s for 15 minutes.
- Alert when `MODEL_RESOLUTION_FAILED` spikes above baseline.

## NFR-005 Default/Override/Fallback/Error

- Default NFR thresholds apply globally.
- Override thresholds per environment allowed only via deployment config.
- Fallback when metrics backend unavailable: keep local logs and continue serving requests.
- Error when logs cannot be persisted: return success response but mark `observabilityDegraded=true` in server logs.
