# Analysis Universe

## Domain Inventory

| Domain      | Paths                                                                                                                          | Criticality | Status  | Notes                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------- | ------- | ---------------------------------------------------------------------------- |
| API         | `src/routes/api/admin/**`, `src/routes/api/opencode/**`                                                                        | high        | covered | Settings, providers, connection, defaults, council, presets endpoints mapped |
| UI          | `src/routes/settings/+page.svelte`, `src/lib/components/admin/ai-settings/**`, `src/lib/components/admin/function-settings/**` | high        | covered | Primary FE orchestration and admin settings components identified            |
| Services    | `src/lib/server/services/*.ts` (admin-settings, function-defaults, improve-presets, opencode\*)                                | high        | covered | Core policy and persistence behavior mapped                                  |
| Validators  | `src/lib/server/validators/model-variant.validator.ts`, `src/lib/server/opencode/validate-settings.ts`                         | high        | covered | Variant and connection validation paths identified                           |
| Data/Schema | `src/lib/server/db/schema.ts` and settings keys loaded by admin services                                                       | medium      | covered | Persisted fields and variant-related keys identified                         |
| Tests       | `tests/server/**`, `tests/opencode/**`, `e2e/settings.spec.ts`, `e2e/admin-settings.spec.ts`, `e2e/smoke-opencode.spec.ts`     | high        | covered | Existing baseline tests mapped to domains                                    |
| CI/CD       | npm scripts from `package.json` and test guidance from `AGENTS.md`                                                             | medium      | covered | Validation command chain documented                                          |

Status values: `not_started`, `in_progress`, `covered`, `deferred`, `excluded`.
