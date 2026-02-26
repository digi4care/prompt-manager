# Implementation Plan

## Phases

| Phase | Objective                                                                       | Inputs                                           | Output                                         | Verification                |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- | --------------------------- |
| IP-01 | Add missing validator unit tests for model-variant rules                        | `ANALYSIS_LOG.md`, matrix P0 rows                | validator test file with good/bad assertions   | `npm run test` targeted run |
| IP-02 | Add route-level contract tests for function defaults and council agents         | matrix rows `SET-FDEF-*`, `SET-COUNC-*`          | integration tests for success/failure payloads | `npm run test` subset       |
| IP-03 | Add route-level contract tests for improve presets with `modelVariant` behavior | matrix rows `SET-PRESET-*`                       | integration tests for valid/invalid payloads   | `npm run test` subset       |
| IP-04 | Add cross-boundary E2E failure-path scenarios for settings interactions         | matrix rows with `Cross-Boundary Required = yes` | e2e cases mapped to E2E IDs                    | `npm run test:e2e` scoped   |
| IP-05 | Sync matrix, traceability, and checklist statuses                               | outputs from IP-01..IP-04                        | updated docs/testing artifacts                 | validator script + review   |

## Risks and Mitigations

| Risk                                            | Impact           | Mitigation                                                |
| ----------------------------------------------- | ---------------- | --------------------------------------------------------- |
| Route tests are flaky due external dependencies | CI instability   | use deterministic mocks/fixtures for provider responses   |
| FE/BE contract drift                            | runtime failures | enforce contract IDs + mandatory error mapping assertions |
| Scope creep in one pass                         | delayed delivery | execute P0 first then expand to P1 in next iteration      |
