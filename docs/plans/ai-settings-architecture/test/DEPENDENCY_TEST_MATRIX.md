# AI Settings Dependency Test Matrix

Last updated: 2026-02-25

## Matrix Columns

- Test ID
- Block
- Depends On
- Scenario
- Behavior (Good/Bad)
- Layer
- Route/Service Under Test
- Existing Coverage
- Gap / Next Test
- Priority
- Status

## Dependency-Driven Coverage Matrix

| Test ID        | Block             | Depends On        | Scenario                                                       | Behavior | Layer       | Route/Service Under Test                                                                                  | Existing Coverage                                                       | Gap / Next Test                                                                      | Priority | Status  |
| -------------- | ----------------- | ----------------- | -------------------------------------------------------------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- | ------- |
| SET-CONN-001   | Connection        | -                 | OpenCode connection health check succeeds                      | Good     | Integration | `src/routes/api/admin/opencode-connection/+server.ts`                                                     | `e2e/smoke-opencode.spec.ts`                                            | Add dedicated route test for GET success payload shape                               | P0       | Partial |
| SET-CONN-002   | Connection        | -                 | OpenCode connection check fails/timeout                        | Bad      | Integration | `src/routes/api/admin/opencode-connection/+server.ts`                                                     | `e2e/smoke-opencode.spec.ts`                                            | Add route test for error mapping + status code                                       | P0       | Planned |
| SET-PROV-001   | Provider block    | Connection        | Providers endpoint returns provider list + cache metadata      | Good     | Integration | `src/routes/api/opencode/providers/+server.ts`                                                            | `tests/server/routes/opencode.providers.api.test.ts`                    | Keep passing in CI gate                                                              | P0       | Covered |
| SET-PROV-002   | Provider block    | Connection        | Providers endpoint failure returns deterministic error payload | Bad      | Integration | `src/routes/api/opencode/providers/+server.ts`                                                            | `tests/server/routes/opencode.providers.api.test.ts` (503 path)         | Add assertion for stable error code contract                                         | P0       | Partial |
| SET-PROV-003   | Provider block    | Connection        | Admin AI settings renders provider cards and counts            | Good     | E2E         | `/settings` UI + provider catalog panel                                                                   | `e2e/settings.spec.ts`                                                  | Add assertion for provider status badges/details                                     | P1       | Partial |
| SET-MOD-001    | Models block      | Provider block    | Model picker lists selectable models                           | Good     | E2E         | `/settings` model picker modal                                                                            | `e2e/settings.spec.ts`                                                  | Keep passing in CI gate                                                              | P0       | Covered |
| SET-MOD-002    | Models block      | Provider block    | Model picker search filters model list                         | Good     | E2E         | `/settings` model picker modal search                                                                     | `e2e/settings.spec.ts`                                                  | Add exact expected filtered result assertion                                         | P1       | Partial |
| SET-MOD-003    | Models block      | Provider block    | Invalid/inactive model payload is ignored without UI crash     | Bad      | Integration | `src/lib/server/services/opencode.service.ts` + `/api/opencode/providers`                                 | `tests/server/routes/opencode.providers.api.test.ts` (structure checks) | Add service-level sanitization test for inactive/malformed models                    | P0       | Planned |
| SET-POL-001    | AI policy         | Models block      | `getOpenCodePolicy` parses allowlist and defaults correctly    | Good     | Unit        | `src/lib/server/services/admin-settings.service.ts`                                                       | `tests/server/services/admin-settings.service.test.ts`                  | Keep passing in CI gate                                                              | P0       | Covered |
| SET-POL-002    | AI policy         | Models block      | Disallowed model rejected by policy validation                 | Bad      | Unit        | `src/lib/server/services/admin-settings.service.ts` + `isModelAllowed`                                    | `tests/server/services/admin-settings.service.test.ts`                  | Add explicit mapping to `MODEL_NOT_ALLOWED` in validator tests                       | P0       | Partial |
| SET-POL-003    | AI policy         | Models block      | Variant required when policy defines variants                  | Bad      | Unit        | `src/lib/server/validators/model-variant.validator.ts`                                                    | (no direct dedicated test file yet)                                     | Add `tests/server/validators/model-variant.validator.test.ts` for `VARIANT_REQUIRED` | P0       | Planned |
| SET-POL-004    | AI policy         | Models block      | Variant not allowed for scope returns strict error             | Bad      | Unit        | `src/lib/server/validators/model-variant.validator.ts`                                                    | (no direct dedicated test file yet)                                     | Add tests for `VARIANT_NOT_ALLOWED` and `VARIANT_NOT_AVAILABLE`                      | P0       | Planned |
| SET-FDEF-001   | Function defaults | AI policy         | Function defaults page renders executor/judge/improve cards    | Good     | E2E         | `/settings` function defaults UI                                                                          | `e2e/settings.spec.ts`                                                  | Keep passing in CI gate                                                              | P0       | Covered |
| SET-FDEF-002   | Function defaults | AI policy         | Save function defaults with allowed model/variant              | Good     | Integration | `src/routes/api/admin/function-defaults/[type]/+server.ts`                                                | indirect via `e2e/settings.spec.ts`                                     | Add direct route tests for PUT success with `modelVariant`                           | P0       | Planned |
| SET-FDEF-003   | Function defaults | AI policy         | Save disallowed model/variant is rejected                      | Bad      | Integration | `src/routes/api/admin/function-defaults/[type]/+server.ts`                                                | none                                                                    | Add route tests for `MODEL_NOT_ALLOWED`/`VARIANT_NOT_ALLOWED`                        | P0       | Planned |
| SET-COUNC-001  | LLM council       | AI policy         | Create/update council agent with allowed model/variant         | Good     | Integration | `src/routes/api/admin/council-agents/+server.ts`, `src/routes/api/admin/council-agents/[id]/+server.ts`   | none                                                                    | Add POST/PUT route tests for valid persist path                                      | P0       | Planned |
| SET-COUNC-002  | LLM council       | AI policy         | Council update with forbidden model/variant is rejected        | Bad      | Integration | `src/routes/api/admin/council-agents/[id]/+server.ts`                                                     | none                                                                    | Add route tests validating strict variant errors                                     | P0       | Planned |
| SET-CAT-001    | Model catalog     | Provider + Models | Catalog endpoint returns stable provider/model structure       | Good     | Integration | `src/routes/api/opencode/providers/+server.ts`                                                            | `tests/server/routes/opencode.providers.api.test.ts`                    | Keep passing in CI gate                                                              | P1       | Covered |
| SET-CAT-002    | Model catalog     | Provider + Models | Refresh=true bypasses cache and returns fresh catalog          | Good     | Integration | `src/routes/api/opencode/providers/+server.ts`                                                            | `tests/server/routes/opencode.providers.api.test.ts`                    | Keep passing in CI gate                                                              | P1       | Covered |
| SET-CAT-003    | Model catalog     | Provider + Models | Cache mismatch/stale catalog does not break settings UI        | Bad      | E2E         | `/settings` catalog + model picker                                                                        | `e2e/settings.spec.ts` (basic catalog visibility)                       | Add stale-cache simulation test path                                                 | P1       | Planned |
| SET-PRESET-001 | Improve presets   | Policy + Catalog  | Preset validation accepts allowed model and bounds             | Good     | Unit        | `src/lib/server/services/improve-presets.service.ts`                                                      | `tests/server/services/improve-presets.service.test.ts`                 | Keep passing in CI gate                                                              | P0       | Covered |
| SET-PRESET-002 | Improve presets   | Policy + Catalog  | Preset validation rejects disallowed model                     | Bad      | Unit        | `src/lib/server/services/improve-presets.service.ts`                                                      | `tests/server/services/improve-presets.service.test.ts`                 | Add explicit `modelVariant` validation assertions                                    | P0       | Partial |
| SET-PRESET-003 | Improve presets   | Policy + Catalog  | Improve presets API create/update handles `modelVariant`       | Good     | Integration | `src/routes/api/admin/improve-presets/+server.ts`, `src/routes/api/admin/improve-presets/[id]/+server.ts` | none                                                                    | Add route tests for POST/PUT with `modelVariant`                                     | P0       | Planned |
| SET-PRESET-004 | Improve presets   | Policy + Catalog  | Improve presets API rejects invalid `modelVariant` payload     | Bad      | Integration | `src/routes/api/admin/improve-presets/+server.ts`, `src/routes/api/admin/improve-presets/[id]/+server.ts` | none                                                                    | Add route tests asserting validation error payload                                   | P0       | Planned |

## Build Order for New Test Implementation

1. P0 validator/policy tests (`SET-POL-003`, `SET-POL-004`).
2. P0 function-defaults + council route tests (`SET-FDEF-002`, `SET-FDEF-003`, `SET-COUNC-001`, `SET-COUNC-002`).
3. P0 improve-presets API route tests (`SET-PRESET-003`, `SET-PRESET-004`).
4. P0/P1 connection/provider contract hardening (`SET-CONN-001`, `SET-CONN-002`, `SET-PROV-002`).
5. P1 catalog/model resilience tests (`SET-MOD-003`, `SET-CAT-003`).

## Expansion Rule

For every new settings capability:

1. Add at least one Good and one Bad row.
2. Map each row to route/service and test file.
3. Mark status as `Covered` only after CI-automated test exists.
