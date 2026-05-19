# 09 -- Testing Strategy

## Operational Testing Contract

| Work Type | Required Verification | Evidence | Timing |
|-----------|-----------------------|----------|--------|
| build | story-specific tests + acceptance evidence | assertion output, runtime/log/console | before verified |
| fix | regression proof + affected callsite check | assertion output + bug reproduction | before verified |
| research | hypothesis evidence | note, spike result | before downstream build ready |
| enable | tool/runtime smoke | command output | before dependent work starts |
| verify | acceptance/audit evidence | artifact links | before story status verified |
| release | package/install/rollback proof | release command output | before release_ready |

## Active Test Commands
```bash
# Unit tests (headless)
bun run test              # Vitest
bun run test:coverage     # Coverage report

# E2E tests (server required)
bun run test:e2e          # Chromium
bun run test:e2e:all      # All browsers

# Type checking
bun run check             # svelte-check + tsc
```

## Test File Discovery
- Unit: tests/unit/**/*.test.ts
- E2E: e2e/**/*.spec.ts
- Setup: tests/setup.ts

## Known Gaps
- 3 failing tests in judge.api.test.ts (ws module shim issue)
- 57 svelte-check warnings (pre-existing, not blocking)
- Coverage gap: instrumentation shim not tested
