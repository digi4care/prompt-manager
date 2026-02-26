# TODO

## Tasks

| ID       | Task                                                                                            | Priority | Depends On                   | Owner         | Status    | Acceptance                                                       |
| -------- | ----------------------------------------------------------------------------------------------- | -------- | ---------------------------- | ------------- | --------- | ---------------------------------------------------------------- |
| TODO-001 | Add validator unit tests for `VARIANT_REQUIRED`, `VARIANT_NOT_ALLOWED`, `VARIANT_NOT_AVAILABLE` | P0       | -                            | test-engineer | completed | validator assertions pass                                        |
| TODO-002 | Add route tests for `/api/admin/function-defaults/[type]` good/bad behavior                     | P0       | TODO-001                     | test-engineer | completed | contract payloads and errors asserted                            |
| TODO-003 | Add route tests for `/api/admin/council-agents` and `[id]`                                      | P0       | TODO-001                     | test-engineer | completed | forbidden model/variant rejection covered                        |
| TODO-004 | Add route tests for `/api/admin/improve-presets` and `[id]` with variant cases                  | P0       | TODO-001                     | test-engineer | completed | valid + invalid payload coverage present                         |
| TODO-005 | Add E2E interaction failures for settings FE/BE paths                                           | P1       | TODO-002, TODO-003, TODO-004 | test-engineer | completed | 7 E2E tests in `e2e/settings-error-interactions.spec.ts` passing |
| TODO-006 | Update matrix/traceability/checklist statuses after implementation                              | P1       | TODO-005                     | planner       | completed | docs synchronized and reviewed                                   |

Status values: `pending`, `in_progress`, `completed`, `blocked`, `cancelled`.
