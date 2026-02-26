# AI Settings Contract Traceability Matrix

Last updated: 2026-02-25

## Purpose

Trace requirements and contract rules from spec IDs to executable test coverage.

## Columns

- Trace ID
- Spec ID / Rule
- Area
- Test IDs
- Test Layer
- Key Files
- Status

## Traceability Table

| Trace ID      | Spec / Rule                      | Area                | Test IDs                                                               | Layer                     | Key Files                                                                                                                                                                                                                                                                      | Status      |
| ------------- | -------------------------------- | ------------------- | ---------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| TRACE-AIC-005 | `AIC-005` endpoint matrix        | Settings APIs       | SET-FDEF-002, SET-COUNC-001, SET-PRESET-003                            | Integration               | `src/routes/api/admin/function-defaults/[type]/+server.ts`, `src/routes/api/admin/council-agents/+server.ts`, `src/routes/api/admin/council-agents/[id]/+server.ts`, `src/routes/api/admin/improve-presets/+server.ts`, `src/routes/api/admin/improve-presets/[id]/+server.ts` | In progress |
| TRACE-AIC-008 | Validation rules                 | Policy + validators | SET-POL-001, SET-POL-002, SET-POL-003, SET-POL-004                     | Unit/Integration          | `src/lib/server/services/admin-settings.service.ts`, `src/lib/server/validators/model-variant.validator.ts`, `src/lib/server/services/improve-presets.service.ts`                                                                                                              | In progress |
| TRACE-AIC-012 | Variant-aware contract tests     | Variant enforcement | SET-FDEF-003, SET-COUNC-002, SET-PRESET-004                            | Integration/E2E           | `src/lib/server/validators/model-variant.validator.ts`, `e2e/settings.spec.ts`, `e2e/admin-settings.spec.ts`                                                                                                                                                                   | Planned     |
| TRACE-TST-API | `TST-*` API contract obligations | Persist/load flows  | SET-PROV-001, SET-CAT-001, SET-FDEF-002, SET-COUNC-001, SET-PRESET-003 | Integration               | `tests/server/routes/opencode.providers.api.test.ts`, route tests to add for function defaults/council/presets                                                                                                                                                                 | In progress |
| TRACE-TST-NEG | Negative behavior coverage       | Error model         | SET-CONN-002, SET-PROV-002, SET-MOD-003, SET-CAT-003, SET-PRESET-004   | Integration/Component/E2E | `tests/server/routes/opencode.providers.api.test.ts`, `e2e/settings.spec.ts`, new validator/route negative tests                                                                                                                                                               | Planned     |

## Maintenance Rule

Whenever a new setting contract is added or changed:

1. Add/modify one trace row.
2. Link at least one good and one bad test ID.
3. Mark status only after automation exists.
