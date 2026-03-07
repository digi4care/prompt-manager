<!-- Context: testing/fases | Priority: critical | Version: 1.0 | Updated: 2026-03-06 -->

# Testing Fases

**Doel**: Gefaseerde test compliance met kwaliteitsgarantie

---

## Overview

```
FASE 1: CLI/Unit Testing        → Playwright headless / Vitest
FASE 2: Server-Side Testing     → Playwright headless (server focus)
FASE 3: Visual Frontend Testing → Playwright headed (browser zichtbaar)

Elke fase MOET passeren voordat de volgende start
Geen fase mag worden overgeslagen
```

---

## Fase 1: CLI/Unit Testing

**Doel**: Pure logica, utilities, services zonder UI/server dependency

| Aspect   | Specificatie                                           |
| -------- | ------------------------------------------------------ | ---------- | ------------ |
| Tool     | Vitest (unit) / Playwright CLI (integration)           |
| Mode     | Headless (geen browser, geen server)                   |
| Focus    | Business logic, pure functions, API contracts, schemas |
| Coverage | Critical: 100%                                         | High: 90%+ | Medium: 80%+ |
| Server   | NEE                                                    |

**Commando's:**

```bash
bun run test              # Vitest unit tests
bun run test:watch        # Watch mode
bun run test:coverage     # Met coverage rapport
```

**Checklist:**

```
□ Alle unit tests pass
□ Coverage target behaald
□ Geen TypeScript errors
□ Geen console errors/warnings
```

---

## Fase 2: Server-Side Integration Testing

**Doel**: Server routes, API endpoints, database operaties, authentication

| Aspect  | Specificatie                                        |
| ------- | --------------------------------------------------- |
| Tool    | Playwright (headless mode)                          |
| Mode    | Headless (browser onzichtbaar, snel)                |
| Focus   | HTTP responses, auth flows, API contracts, database |
| Server  | JA - Dev server MOET draaien                        |
| Browser | NEE - headless                                      |

**Procedure:**

```bash
# Stap 1: Start dev server
bun run dev  # Output: http://127.0.0.1:45678

# Stap 2: Registreer service
echo '{"project":"prompt-manager","services":[{"name":"dev-server","port":45678}]}' > .tmp/services/prompt-manager/registry.json

# Stap 3: Run server tests
bun run test:e2e -- --grep "@server" --project=chromium

# Stap 4: Stop server (ALLEEN deze port!)
lsof -ti:45678 | xargs kill -9
```

**Test Focus:**

- API response codes (200, 201, 400, 401, 403, 404, 500)
- Request/response payload validation
- Authentication token flows
- Authorization checks per actor
- Rate limiting behavior
- Database CRUD operations

---

## Fase 3: Visual Frontend Testing

**Doel**: UI rendering, user interactions, state transitions, actor flows

| Aspect  | Specificatie                             |
| ------- | ---------------------------------------- |
| Tool    | Playwright (headed mode, UI mode)        |
| Mode    | HEADED (browser zichtbaar)               |
| Focus   | Visual states, actor scenarios, UX flows |
| Server  | JA - Dev server MOET draaien             |
| Browser | JA - browser opent visueel               |

**Procedure:**

```bash
# Stap 1: Start dev server (indien niet draaiend)
bun run dev

# Stap 2: Run visual tests in UI mode
bun run test:e2e -- --ui --headed

# Stap 3: Observe en verifieer visueel
# Stap 4: Stop server (ALLEEN deze port!)
lsof -ti:45678 | xargs kill -9
```

**Checklist:**

```
□ Browser tests uitgevoerd (headed mode)
□ Alle actors getest
□ Good states geverifieerd
□ Bad states geverifieerd
□ State transitions correct
□ Accessibility checks pass
```

---

## Related

- `testing/actor-testing.md` - Multi-actor test matrix
- `testing/state-management.md` - State verification
- `testing/service-isolation.md` - Multi-project isolation
