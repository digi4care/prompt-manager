<!-- Context: testing/philosophy | Priority: critical | Version: 2.0 | Updated: 2026-03-06 -->

# Testing Philosophy

**Kern**: CLI + Browser = VERPLICHT (Beide verplicht voor complete feature)

---

## Quick Routes

| Wat je wilt weten     | Path                |
| --------------------- | ------------------- |
| Waarom beide tests?   | `cli-vs-browser.md` |
| State analysis vooraf | `state-analysis.md` |
| Testing fases         | `fases.md`          |
| Actor testing         | `actor-testing.md`  |
| Test templates        | `test-templates.md` |

---

## De Regel

```
Feature Complete = CLI Tests PASS + Browser Tests PASS

CLI Tests    =  Logica verificatie (snel, geïsoleerd)
Browser Tests =  Gebruikerservaring (echt, geïntegreerd)

"Ik heb de CLI tests" ≠ "Het werkt"
" Het werkt" = CLI PASS + Browser PASS
```

---

## Test Matrix

| Feature   | CLI Test            | Browser Test        | Status |
| --------- | ------------------- | ------------------- | ------ |
| Login     | `auth.test.ts`      | `login.spec.ts`     | ⬜⬜   |
| Cart      | `cart.test.ts`      | `cart.spec.ts`      | ⬜⬜   |
| Dashboard | `dashboard.test.ts` | `dashboard.spec.ts` | ⬜⬜   |

**Status:**

- ⬜⬜ = Geen tests
- ✅⬜ = Alleen CLI (incompleet)
- ⬜✅ = Alleen browser (incompleet)
- ✅✅ = Complete feature

---

## Quick Reference

| Vraag                         | CLI | Browser |
| ----------------------------- | --- | ------- |
| Werkt de logica?              | ✅  | -       |
| Ziet de gebruiker het?        | -   | ✅      |
| Reageren components op state? | -   | ✅      |
| Is de UI correct?             | -   | ✅      |
| Integratie tussen components? | -   | ✅      |

---

## Commands

```bash
# CLI Tests
bun run test              # Vitest unit tests
bun run test:watch        # Watch mode

# Browser Tests
bun run dev               # Start server first!
bun run test:e2e          # Playwright tests
lsof -ti:45678 | xargs kill -9  # Stop server
```

---

## Related Files

- `cli-vs-browser.md` - Waarom CLI ≠ Browser
- `state-analysis.md` - Analysis template VOOR testing
- `fases.md` - 3 testing fases
- `actor-testing.md` - Multi-actor testing matrix
- `state-management.md` - State transitions testing
- `service-isolation.md` - Multi-project isolation
- `test-templates.md` - Templates + fixtures
