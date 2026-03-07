<!-- Context: testing/test-enforcement | Priority: critical | Version: 2.0 | Updated: 2026-03-06 -->

# Test Enforcement

**Kern**: Gefaseerde testing met kwaliteitsgarantie. ALLE fases verplicht.

---

## Quick Routes

| Wat je wilt       | Path                   |
| ----------------- | ---------------------- |
| Testing fases     | `fases.md`             |
| Actor testing     | `actor-testing.md`     |
| State transitions | `state-management.md`  |
| Test templates    | `test-templates.md`    |
| Service isolation | `service-isolation.md` |

---

## De 3 Fases

```
FASE 1: CLI/Unit (Vitest)        → Geen server, geen browser
FASE 2: Server-Side (Playwright) → Server, browser headless
FASE 3: Visual (Playwright UI)   → Server, browser zichtbaar

Elke fase MOET passeren → Volgende fase starten
```

---

## Commands

```bash
# Fase 1: CLI/Unit
bun run test              # Vitest
bun run test:coverage     # Met coverage

# Fase 2 + 3: E2E
bun run dev               # Start server!
bun run test:e2e          # Headless (Fase 2)
bun run test:e2e -- --ui --headed  # Visual (Fase 3)
lsof -ti:45678 | xargs kill -9      # Stop server
```

---

## Quality Gates

| Fase   | Pass Criteria                         |
| ------ | ------------------------------------- |
| Fase 1 | All tests pass, coverage targets      |
| Fase 2 | Server tests pass, API contracts OK   |
| Fase 3 | Visual tests pass, actor scenarios OK |

---

## Related

- `fases.md` - Detailed fase specifications
- `philosophy.md` - CLI + Browser philosophy
- `actor-testing.md` - Multi-actor test matrix
