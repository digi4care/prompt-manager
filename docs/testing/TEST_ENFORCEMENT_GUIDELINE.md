# Test Enforcement Guideline

## Non-Negotiable Rules

1. No feature is complete without tests.
2. Every feature must include good and bad behavior coverage.
3. Bug fixes require a regression test first.
4. Matrix and traceability updates are mandatory.
5. FE/BE interaction changes require cross-boundary contract tests.
6. Error handling coverage must validate deterministic `status/code/message` mapping.

## Minimum Coverage by Change Type

| Change Type           | Minimum Required Tests                               |
| --------------------- | ---------------------------------------------------- |
| New feature           | 1 happy + 1 error                                    |
| Bug fix               | 1 regression + affected path verification            |
| UI change             | 1 interaction/state test + error path                |
| Auth/role change      | 1 access-control test + error path                   |
| FE/BE contract change | 1 API contract test + 1 E2E interaction failure test |

## Cross-Boundary Required Assertions

For any matrix row where `Touches FE = yes` and `Touches BE = yes`:

1. Request payload shape is explicitly tested.
2. Response payload shape is explicitly tested.
3. Error payload (`status/code/message`) is explicitly tested.
4. Retry/timeout path is tested for non-duplication and non-silent failure.

## Merge Blockers

- Missing `Contract Test ID` on cross-boundary rows.
- Missing `E2E Test ID` on cross-boundary rows.
- Missing bad-path scenario for changed interaction contracts.
