# SPEC-08 Test Strategy

## TST-001 Test Layers

- Unit tests for services and resolution logic.
- Integration tests for API contracts + DB persistence.
- E2E tests for settings and prompt test UX.

## TST-002 Mapping To Acceptance Criteria

- AC-001, AC-002 -> integration + e2e.
- AC-003, AC-004 -> integration + e2e.
- AC-005, AC-006 -> unit + e2e.
- AC-007, AC-008 -> unit + integration.
- AC-009 -> integration.
- AC-010 -> e2e accessibility checks.
- AC-011 -> integration.
- AC-012 -> integration + e2e.

## TST-003 Unit Test Targets

- model resolution precedence and fallback.
- snippet rendering strict vs non-strict.
- OpenCode error mapping to app codes.

## TST-004 Integration Test Targets

- settings read/write persistence.
- settings key type validation and rejection.
- execute endpoint success/failure paths.
- council correct mode logging paths.

## TST-005 E2E Scenarios

- Admin changes settings and sees persisted values.
- User runs prompt with snippet preview and sees output.
- User sees clean error state when OpenCode down.
- User receives retry button only for retryable failures.

## TST-008 Contract Tests

- Validate API response schema keys for `POST /api/prompts/:id/execute`.
- Validate SSE event payload shape for `started/chunk/completed/failed`.
- Validate each settings key accepts only specified type/range from `SPEC-10-settings-schema.md`.

## TST-006 Test Data Rules

- Use deterministic fixtures for prompts/models.
- Keep one disallowed model fixture for policy tests.

## TST-007 Done Criteria For Test Suite

- All P1 AC IDs have at least one passing automated test.
- No flaky retries required for stable pass.
