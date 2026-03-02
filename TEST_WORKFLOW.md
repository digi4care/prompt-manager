# Test Workflow

> **Voor LLMs**: Lees dit bestand volledig voordat je tests uitvoert. Volg de fases in volgorde.

---

## Doel

Dit bestand beschrijft de complete test workflow voor dit project. Het is herbruikbaar in elke repository en helpt LLMs om de juiste tests uit te voeren op het juiste moment.

---

## Belangrijk: Test Context

**Voordat je tests uitvoert, moet je weten:**

| Vraag                          | Waar te vinden                                      |
| ------------------------------ | --------------------------------------------------- |
| Welke runtime?                 | `package.json` → scripts, dependencies              |
| Welk test framework?           | `package.json` → vitest, playwright, jest, etc.     |
| Welke database?                | `.env`, `drizzle.config.ts`, `prisma/schema.prisma` |
| Welke features zijn gewijzigd? | Vraag de gebruiker of check git diff                |

---

## Fase 0: TDD (Alleen bij nieuwe code)

**Wanneer**: Voordat je nieuwe code schrijft

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   NIEUWE FEATURE = EERST TEST SCHRIJVEN                     │
│                                                             │
│   1. Schrijf test die faalt (feature bestaat nog niet)      │
│   2. Implementeer minimale code om test te laten slagen    │
│   3. Refactor indien nodig                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Skip deze fase als**: Je alleen bestaande code test na wijzigingen.

---

## Fase 1: CLI Tests (Unit/Integration)

**Wanneer**: Na code completion, voordat je naar E2E gaat

**Doel**: Testen wat geautomatiseerd kan worden zonder browser

### Wat te testen

| Type                | Voorbeelden                      | Tool              |
| ------------------- | -------------------------------- | ----------------- |
| API Endpoints       | REST routes, request/response    | Vitest, Supertest |
| Business Logic      | Services, helpers, utilities     | Vitest            |
| Database Operations | CRUD, queries, migrations        | Vitest + test DB  |
| Server-side Code    | SvelteKit server routes, Express | Vitest            |

### Commando's (project-specifiek)

```bash
# TypeScript validatie (altijd eerst)
npm run check          # of: bun run check

# Unit/Integration tests
npm run test           # of: bun run test
npm run test:watch     # Watch mode

# Coverage
npm run test:coverage  # Bekijk coverage report
```

### Checklist CLI Tests

```
□ TypeScript check gepasseerd? (geen errors)
□ Alle unit tests geslaagd?
□ Coverage > 80% voor gewijzigde modules?
□ Geen console errors in test output?
```

### Bij falende tests

1. **RAPPORTEREN** → Welke test faalt, waarom
2. **NIET automatisch fixen** → Vraag gebruiker om bevestiging
3. **Analyses aanleveren** → Wat is de oorzaak?

---

## Fase 2: E2E Tests (Playwright/Cypress)

**Wanneer**: Na CLI tests succesvol

**Doel**: Geautomatiseerde browser tests voor user flows

### Wat te testen

| Type             | Voorbeelden                           |
| ---------------- | ------------------------------------- |
| User Flows       | Login → Dashboard → Actie → Resultaat |
| Form Submissions | Validatie, success, error states      |
| Navigation       | Menu links, breadcrumbs, redirects    |
| CRUD Operations  | Create, Read, Update, Delete via UI   |

### Commando's (project-specifiek)

```bash
# E2E tests (chromium only - sneller)
npm run test:e2e

# E2E tests (all browsers - trager, meer coverage)
npm run test:e2e:all

# E2E tests met UI (handmatig debuggen)
npx playwright test --ui
```

### Checklist E2E Tests

```
□ Alle E2E tests geslaagd?
□ Geen console errors in browser?
□ Geen network errors (404, 500)?
□ Screenshots correct (indien visual tests)?
```

---

## Fase 3: Handmatige Browser Tests

**Wanneer**: Na E2E tests succesvol

**Doel**: Testen wat niet geautomatiseerd kan worden

**Dit is de belangrijkste fase voor web applicaties!**

### Waarom handmatig testen?

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   AUTOMATISCHE TESTS CHECKEN CODE                           │
│   HANDMATIGE TESTS CHECKEN EXPERIENCE                       │
│                                                             │
│   Dingen die alleen handmatig te testen zijn:               │
│   • Visuele layout en spacing                               │
│   • State integratie tussen componenten                     │
│   • Auth states (ingelogd vs uitgelogd)                     │
│   • Responsive design (mobile, tablet, desktop)             │
│   • Animaties en transitions                                │
│   • User feedback (toasts, loaders, errors)                 │
│   • Full stack integratie (backend + frontend samen)        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Setup voor handmatige tests

```bash
# Start development server
npm run dev    # of: bun run dev

# Noteer de URL (meestal http://localhost:3000 of 5173)
```

### Test Scenarios (per feature)

#### A. Auth State Testing

| State                | Wat te testen                                                  |
| -------------------- | -------------------------------------------------------------- |
| **Uitgelogd**        | Login form, geen toegang tot protected routes, juiste redirect |
| **Ingelogd (user)**  | Dashboard toegang, user-specifieke data, juiste menu items     |
| **Ingelogd (admin)** | Admin panelen, extra rechten, admin-only features              |

#### B. Component State Testing

| Scenario          | Wat te testen                             |
| ----------------- | ----------------------------------------- |
| **Lege state**    | Geen data → juiste empty state message    |
| **Loading state** | Loaders, skeletons, disabled buttons      |
| **Error state**   | Error messages, retry buttons, geen crash |
| **Success state** | Data wordt getoond, acties werken         |

#### C. Form Testing

| Scenario       | Wat te testen                                    |
| -------------- | ------------------------------------------------ |
| **Validatie**  | Required fields, format checks, inline errors    |
| **Submission** | Loading state, success feedback, data opgeslagen |
| **Cancel**     | Wijzigingen verworpen, terug naar vorige state   |

#### D. Visual Testing

| Aspect           | Wat te checken                             |
| ---------------- | ------------------------------------------ |
| **Layout**       | Spacing, alignment, responsive breakpoints |
| **Typography**   | Font sizes, line heights, headings         |
| **Colors**       | Consistent palette, contrast, dark mode    |
| **Interactions** | Hover states, focus states, active states  |

### Handmatige Test Checklist Template

```markdown
## Feature: [Feature Naam]

### Setup

- [ ] Dev server gestart
- [ ] Test data beschikbaar
- [ ] Test account ingelogd (indien nodig)

### Auth States

- [ ] Uitgelogd: juiste UI
- [ ] Ingelogd: juiste UI

### Component States

- [ ] Leeg: correcte empty state
- [ ] Loading: loader zichtbaar
- [ ] Error: foutmelding getoond
- [ ] Success: data correct

### Forms (indien van toepassing)

- [ ] Validatie werkt
- [ ] Submit werkt
- [ ] Cancel werkt

### Visual

- [ ] Layout correct
- [ ] Responsive (mobile/tablet/desktop)
- [ ] Dark mode (indien van toepassing)

### Integratie

- [ ] Werkt samen met andere componenten
- [ ] State updates propagaten correct
- [ ] Navigation werkt

### Issues gevonden

1. [Beschrijving van issue]
2. [Beschrijving van issue]
```

---

## Fase 4: Rapportage

**Wanneer**: Na alle test fases

### Rapport Template

```markdown
# Test Rapport - [Datum]

## Samenvatting

- CLI Tests: ✅/❌ (X/Y geslaagd)
- E2E Tests: ✅/❌ (X/Y geslaagd)
- Handmatig: ✅/❌ (X/Y scenarios OK)

## CLI Tests

### Geslaagd

- [test naam]

### Gefaald

- [test naam]: [reden]

## E2E Tests

### Geslaagd

- [test naam]

### Gefaald

- [test naam]: [reden]

## Handmatige Tests

### Geconstateerd

- [scenario]: ✅/❌ [opmerking]

### Issues

1. **[Issue titel]**
   - Severity: Critical/High/Medium/Low
   - Description: [wat is er mis]
   - Steps to reproduce: [stappen]
   - Expected: [wat verwacht je]
   - Actual: [wat gebeurt er]

## Aanbevelingen

- [aanbeveling 1]
- [aanbeveling 2]

## Conclusie

[Klaar voor release? / Meer werk nodig? / Blocked door X?]
```

---

## Workflow Samenvatting

```
┌─────────────────────────────────────────────────────────────┐
│                    TEST WORKFLOW                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FASE 0: TDD (alleen bij nieuwe code)                       │
│  └─→ Schrijf test → Code → Refactor                         │
│                                                              │
│  FASE 1: CLI TESTS                                           │
│  └─→ npm run check                                           │
│  └─→ npm run test                                            │
│  └─→ npm run test:coverage                                   │
│                                                              │
│  FASE 2: E2E TESTS                                           │
│  └─→ npm run test:e2e                                        │
│  └─→ npm run test:e2e:all (optioneel, trager)               │
│                                                              │
│  FASE 3: HANDMATIGE TESTS ⭐ BELANGRIJKSTE                   │
│  └─→ npm run dev                                             │
│  └─→ Open browser                                            │
│  └─→ Test alle scenarios (zie checklists)                   │
│  └─→ Check visual, state, integratie                         │
│                                                              │
│  FASE 4: RAPPORTAGE                                          │
│  └─→ Maak test rapport                                       │
│  └─→ Lijst issues                                            │
│  └─→ Geef conclusie                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Instructies voor LLMs

### Als gebruiker zegt: "Lees @TEST_WORKFLOW.md en voer tests uit"

1. **Lees dit bestand volledig**
2. **Identificeer project context** (package.json, frameworks)
3. **Voer fases uit in volgorde**: CLI → E2E → Handmatig
4. **Rapporteer na elke fase**
5. **Vraag goedkeuring voor handmatige tests** (gebruiker moet browser openen)

### Als gebruiker zegt: "Lees @TEST_WORKFLOW.md en test [feature]"

1. **Focus op specifieke feature**
2. **Identificeer welke tests relevant zijn**
3. **Voer relevante tests uit**
4. **Rapporteer specifiek over die feature**

### Belangrijke regels

```
□ Sla geen fases over
□ Rapporteer altijd, ook bij succes
□ Bij falen: STOP, rapporteer, vraag instructies
□ Handmatige tests = gebruiker moet meedoen
□ Wees thorough, niet lazy
```

---

## Project-Specifieke Configuratie

> **Vul dit in per project**

### Runtime

- [ ] SvelteKit
- [ ] Next.js
- [ ] React
- [ ] Vue
- [ ] Anders: \_\_\_

### Test Frameworks

- [ ] Vitest (unit/integration)
- [ ] Playwright (E2E)
- [ ] Cypress (E2E)
- [ ] Jest (unit)
- [ ] Anders: \_\_\_

### Database

- [ ] PostgreSQL
- [ ] MySQL
- [ ] SQLite
- [ ] MongoDB
- [ ] Anders: \_\_\_

### Commands

```bash
# TypeScript check
npm run check

# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Dev server
npm run dev
```

### Test Accounts

- User: [email/password]
- Admin: [email/password]

---

## Changelog

| Datum      | Versie | Wijziging       |
| ---------- | ------ | --------------- |
| 2026-03-02 | 1.0    | Initiële versie |

---

_Laatst bijgewerkt: 2026-03-02_
