<!-- Context: testing/test-guide | Priority: critical | Version: 3.1 | Updated: 2026-03-03 -->

# Test Guide - Svelte Runtime

Purpose: Overzicht van actieve testcommando's en guardrails voor gefaseerde testing in multi-project environment.

**Runtime: Bun** 🥟

---

## 🎯 Testing in 3 Fasen

```
Fase 1: CLI/Unit      → bun run test / test:coverage
Fase 2: Server (E2E)  → bun run test:e2e (headless)
Fase 3: Visual        → bun run test:e2e -- --ui --headed
```

---

## Quick Commands

### Fase 1: CLI/Unit Testing (geen server nodig)

```bash
# Type checking
bun run check
bun run check:watch

# Unit tests
bun run test
bun run test:watch

# Coverage rapport
bun run test:coverage
```

### Fase 2: Server-Side E2E Testing (server required, headless)

```bash
# Start dev server (NOTEER POORT!)
bun run dev
# Output: Server started on http://127.0.0.1:45678

# Run E2E tests headless (chromium only - snel)
bun run test:e2e

# Run E2E tests all browsers
bun run test:e2e:all

# Stop server (ALLEEN deze poort!)
lsof -ti:45678 | xargs kill -9
```

### Fase 3: Visual Testing (server required, headed/browser zichtbaar)

```bash
# Start dev server (indien niet draaiend)
bun run dev

# Run in UI mode (browser opent visueel)
bun run test:e2e -- --ui --headed

# Run specific visual/actor tests
bun run test:e2e -- --grep "@visual|@actor" --headed

# Stop server (ALLEEN deze poort!)
lsof -ti:45678 | xargs kill -9
```

---

## ⚠️ Multi-Project Service Rules

Dit systeem draait **meerdere projecten**. Volg deze regels:

| Actie          | ✅ Correct                    | ❌ Verboden       |
| -------------- | ----------------------------- | ----------------- |
| Server starten | Noteer port in registry       | Zonder tracking   |
| Server stoppen | `lsof -ti:PORT \| xargs kill` | `killall node`    |
| Port checken   | `lsof -i :PORT`               | Aannemen dat vrij |

### Service Registry

```bash
# Registreer actieve service
mkdir -p .tmp/services/prompt-manager
echo '{"project":"prompt-manager","services":[{"name":"dev-server","port":45678,"pid":'$!'}]}' > .tmp/services/prompt-manager/registry.json

# Kill alleen jouw service
lsof -ti:45678 | xargs kill -9
```

---

## Runtime Assumptions

- **Primary runtime:** SvelteKit app (frontend + API routes)
- **Auth model:** Cookie-based sessions (zie `development/security/auth/`)
- **localStorage:** Alleen voor non-sensitive UI preferences
- **Legacy backend:** Deprecated, niet nodig voor normale tests

---

## Actor Testing

### Actors in dit project

| Actor    | Email             | Route na login | Test focus              |
| -------- | ----------------- | -------------- | ----------------------- |
| Guest    | (niet ingelogd)   | /login         | Public pages, redirects |
| Customer | customer@test.com | /dashboard     | Eigen data, CRUD        |
| Admin    | admin@test.com    | /admin         | Alle data, beheer       |

### Manual Verification Checklist (Fase 3)

```
□ Guest
  □ Kan public pages bekijken
  □ Wordt geredirect naar /login bij protected routes

□ Customer
  □ Login → /dashboard
  □ Kan eigen prompts beheren
  □ Kan NIET bij admin routes
  □ Kan NIET bij andere users' data

□ Admin
  □ Login → /admin
  □ Kan alle users bekijken
  □ Kan alle prompts beheren
  □ Admin controls zichtbaar

□ Session
  □ Logout cleared session
  □ Session expiry handling correct
```

---

## Monitoring Expectations

Elke E2E test MOET gebruik maken van monitoring fixtures:

```typescript
test('example', async ({ page, consoleErrors, networkErrors }) => {
	// ... test code ...

	// VERPLICHT: Check voor errors
	expect(consoleErrors).toHaveLength(0);
	expect(networkErrors).toHaveLength(0);
});
```

- Capture console errors → fail on unexpected
- Capture failed network requests (4xx/5xx)
- Use deterministic waits (`waitForURL`, `expect(locator).toBeVisible()`)
- **Avoid fixed sleeps** in critical flows

---

## Test File Organization

```
tests/
├── e2e/
│   ├── features/           # Feature tests (Fase 2+3)
│   ├── actors/             # Actor-specific tests
│   │   ├── guest.spec.ts
│   │   ├── customer.spec.ts
│   │   └── admin.spec.ts
│   ├── states/             # State transition tests
│   └── visual/             # Visual regression tests
├── unit/                   # Fase 1: Unit tests
└── fixtures/
    └── test-helpers.ts     # Monitoring fixtures + actor helpers
```

---

## References

- **test-enforcement.md** - Complete testing standard (3 fases, actors, states)
- **philosophy.md** - Waarom CLI + Browser testing verplicht is
- **development/security/auth/patterns.md** - Auth patterns
