# AI Settings Regression Gate Checklist

Last updated: 2026-02-25

## 1) Pre-Implementation Gate

- [ ] Requirement mapped to dependency block (`Connection`, `Provider`, `Models`, `Policy`, `Defaults`, `Council`, `Catalog`, `Presets`).
- [ ] `DEPENDENCY_TEST_MATRIX.md` updated with at least 1 good + 1 bad row.
- [ ] `CONTRACT_TRACEABILITY_MATRIX.md` updated for changed specs/contracts.
- [ ] `TEST_STRATEGY.md` section "Procedure: Add Tests for a New Feature (LLM-Executable)" executed.
- [ ] Evidence prepared: test IDs, trace row, and target test file paths.

## 2) Implementation Gate

- [ ] Unit tests added/updated for changed validation/derivation logic.
- [ ] Integration tests added/updated for API/service persistence behavior.
- [ ] Component tests added/updated for UI state + error rendering.
- [ ] E2E updated for critical workflow if user flow changed.

## 3) Variant Enforcement Gate

- [ ] `MODEL_NOT_ALLOWED` tested where relevant.
- [ ] `VARIANT_REQUIRED` tested where relevant.
- [ ] `VARIANT_NOT_ALLOWED` tested where relevant.
- [ ] `VARIANT_NOT_AVAILABLE` tested where relevant.

## 4) CI Gate

- [ ] `npm run check` passes.
- [ ] `npm run test` passes.
- [ ] Relevant e2e scope passes (at least changed user flow).

## 5) Release Gate

- [ ] No unresolved P0 rows in `DEPENDENCY_TEST_MATRIX.md` for modified blocks.
- [ ] Failure catalog mappings still valid.
- [ ] Docs updated for any behavior change.

## 6) Rule for Future Features

No new settings option/function is complete unless all gates above pass and matrix entries are present.
