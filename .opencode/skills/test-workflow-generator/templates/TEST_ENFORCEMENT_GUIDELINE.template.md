# Test Enforcement Guideline

## Non-Negotiable Rules

1. No feature is complete without tests.
2. Every feature must include good and bad behavior coverage.
3. Bug fixes require a regression test first.
4. Matrix and traceability updates are mandatory.

## Minimum Coverage by Change Type

| Change Type      | Minimum Required Tests                    |
| ---------------- | ----------------------------------------- |
| New feature      | 1 happy + 1 error                         |
| Bug fix          | 1 regression + affected path verification |
| UI change        | 1 interaction/state test + error path     |
| Auth/role change | 1 access-control test + error path        |
