# Traceability Matrix

| Trace ID       | Rule/Spec                                 | Area                           | Test IDs                                                                              | Target Files                                                                      | Status  |
| -------------- | ----------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------- |
| TRACE-CORE-001 | Test workflow mandatory phases            | Planning gates                 | SET-CONN-001, SET-POL-001                                                             | `docs/testing/ANALYSIS_STRATEGY.md`, `docs/testing/REGRESSION_GATE_CHECKLIST.md`  | Covered |
| TRACE-AIC-001  | `AIC-*` variant-aware settings contracts  | Policy + variant enforcement   | SET-POL-002, SET-FDEF-002, SET-COUNC-002, SET-PRESET-002                              | `src/lib/server/validators/model-variant.validator.ts`, `src/routes/api/admin/**` | Partial |
| TRACE-TST-001  | `TST-*` good/bad behavior coverage        | Matrix completeness            | SET-CONN-001, SET-CONN-002, SET-PROV-001, SET-PROV-002, SET-MODEL-001, SET-MODEL-002  | `docs/testing/DEPENDENCY_TEST_MATRIX.md`                                          | Covered |
| TRACE-XBD-001  | Cross-boundary FE/BE interaction contract | Request/response/error mapping | SET-CONN-002, SET-PROV-002, SET-FDEF-001, SET-FDEF-002, SET-COUNC-001, SET-PRESET-001 | `src/routes/api/admin/**`, `src/lib/components/admin/**`, `e2e/settings.spec.ts`  | Partial |
| TRACE-REG-001  | Regression-first bugfix policy            | Defect prevention              | SET-POL-002, SET-PRESET-002                                                           | `docs/testing/TEST_ENFORCEMENT_GUIDELINE.md`                                      | Covered |

Trace IDs must map to matrix IDs and concrete file paths.
