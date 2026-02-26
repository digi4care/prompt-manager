# Deep Dive Plan

## Domain Batches

| Batch | Domains                                            | Parallel | Depth  | Owner   | Output Artifact                                |
| ----- | -------------------------------------------------- | -------- | ------ | ------- | ---------------------------------------------- |
| B1    | API routes, backend services, validators           | true     | high   | planner | `ANALYSIS_LOG.md`                              |
| B2    | Frontend settings pages/components                 | true     | high   | planner | `ANALYSIS_LOG.md`                              |
| B3    | Existing unit/integration/e2e test baseline        | true     | medium | planner | `ANALYSIS_LOG.md`                              |
| B4    | Cross-boundary FE/BE contracts and failure mapping | false    | high   | planner | `ANALYSIS_LOG.md`, `DEPENDENCY_TEST_MATRIX.md` |

## Sequencing Rules

1. Critical domains first.
2. One output artifact per domain.
3. No synthesis before omission audit.
