# Context Organisatie TODO Lijst

**Project**: Prompt Manager Context Organisatie  
**Gemaakt**: 2026-03-07  
**Status**: Wacht op goedkeuring

---

## FASE 0: Voorbereiding (30 min)

- [ ] **0.1** Inventariseer alle 89 bestanden met metadata (regels, type, doelgroep)
- [ ] **0.2** Maak back-up structuur aan: `.tmp/backup/context-organize-{timestamp}/`
- [ ] **0.3** Bereid goedkeuring UI voor per categorie

---

## FASE 1: Testing Category (45 min)

### Setup

- [ ] **1.1** Maak folder `testing/concepts/`
- [ ] **1.2** Maak folder `testing/guides/`
- [ ] **1.3** Maak folder `testing/examples/`
- [ ] **1.4** Maak folder `testing/lookup/`
- [ ] **1.5** Maak folder `testing/errors/`

### Bestanden verplaatsen/hernoemen

- [ ] **1.6** `git mv testing/philosophy.md testing/concepts/testing-philosophy.md`
- [ ] **1.7** `git mv testing/fases.md testing/guides/testing-fases.md`
- [ ] **1.8** `git mv testing/cli-vs-browser.md testing/concepts/cli-vs-browser.md`
- [ ] **1.9** `git mv testing/actor-testing.md testing/guides/actor-testing.md`
- [ ] **1.10** `git mv testing/state-analysis.md testing/concepts/state-analysis.md`
- [ ] **1.11** `git mv testing/state-management.md testing/concepts/state-management.md`
- [ ] **1.12** `git mv testing/service-isolation.md testing/guides/service-isolation.md`
- [ ] **1.13** `git mv testing/performance-testing.md testing/guides/performance-testing.md`
- [ ] **1.14** `git mv testing/playwright-mcp.md testing/lookup/playwright-mcp.md`
- [ ] **1.15** `git mv testing/vitest-patterns.md testing/examples/vitest-patterns.md`
- [ ] **1.16** `git mv testing/test-data-factories.md testing/examples/test-data-factories.md`

### Navigation

- [ ] **1.17** Update `testing/navigation.md` met nieuwe structuur

---

## FASE 2: Development Category (60 min)

### Setup

- [ ] **2.1** Maak folder `development/concepts/`
- [ ] **2.2** Maak folder `development/guides/`
- [ ] **2.3** Maak folder `development/examples/`
- [ ] **2.4** Maak folder `development/lookup/`
- [ ] **2.5** Maak folder `development/errors/`

### Principles verplaatsen

- [ ] **2.6** `git mv development/principles/clean-code.md development/concepts/clean-code-principles.md`
- [ ] **2.7** `git mv development/principles/solid.md development/concepts/solid-principles.md`
- [ ] **2.8** `git mv development/principles/dry.md development/concepts/dry-principle.md`
- [ ] **2.9** `git mv development/principles/kiss.md development/concepts/kiss-principle.md`
- [ ] **2.10** Verwijder lege `development/principles/` folder

### ⚠️ SPLIT: when-to-delegate.md (468 regels)

- [ ] **2.11** Maak `development/guides/when-to-delegate-guide.md` (deel 1: ~200 regels)
- [ ] **2.12** Maak `development/guides/frontend-delegation-patterns.md` (deel 2: ~150 regels)
- [ ] **2.13** Maak `development/lookup/delegation-decision-matrix.md` (deel 3: ~100 regels)
- [ ] **2.14** Verwijder origineel `development/frontend/when-to-delegate.md`
- [ ] **2.15** Verwijder lege `development/frontend/` folder

### Overige bestanden

- [ ] **2.16** `git mv development/frontend/react/react-patterns.md development/examples/react-patterns.md`
- [ ] **2.17** `git mv development/frontend/react/component-patterns.md development/examples/react-component-patterns.md`
- [ ] **2.18** Verwijder lege `development/frontend/react/` folder
- [ ] **2.19** `git mv development/security/auth/jwt-patterns.md development/examples/jwt-implementation-patterns.md`
- [ ] **2.20** `git mv development/security/auth/oauth-flows.md development/guides/oauth-flows.md`
- [ ] **2.21** Verwijder lege `development/security/auth/` folder
- [ ] **2.22** Verwijder lege `development/security/` folder

### Navigation

- [ ] **2.23** Update `development/navigation.md` met nieuwe structuur

---

## FASE 3: UI/Web Category (75 min)

### Setup

- [ ] **3.1** Maak folder `ui/web/concepts/`
- [ ] **3.2** Maak folder `ui/web/guides/`
- [ ] **3.3** Maak folder `ui/web/examples/`
- [ ] **3.4** Maak folder `ui/web/lookup/`
- [ ] **3.5** Maak folder `ui/web/errors/`

### ⚠️ SPLIT: design-systems.md (381 regels)

- [ ] **3.6** Maak `ui/web/concepts/design-systems-overview.md` (deel 1)
- [ ] **3.7** Maak `ui/web/concepts/design-systems-themes.md` (deel 2)
- [ ] **3.8** Maak `ui/web/concepts/design-systems-components.md` (deel 3)
- [ ] **3.9** Verwijder origineel `ui/web/design-systems.md`

### Overige bestanden

- [ ] **3.10** `git mv ui/web/ui-styling-standards.md ui/web/guides/ui-styling-standards.md`
- [ ] **3.11** `git mv ui/web/animation-patterns.md ui/web/examples/animation-patterns.md`
- [ ] **3.12** `git mv ui/web/animation-basics.md ui/web/guides/animation-basics.md`
- [ ] **3.13** `git mv ui/web/design-assets.md ui/web/lookup/design-assets.md`
- [ ] **3.14** `git mv ui/web/responsive-design.md ui/web/guides/responsive-design.md`
- [ ] **3.15** `git mv ui/web/accessibility.md ui/web/guides/accessibility-guide.md`

### Navigation

- [ ] **3.16** Update `ui/web/navigation.md` met nieuwe structuur

---

## FASE 4: Svelte Category (45 min)

### Setup

- [ ] **4.1** Maak folder `svelte/concepts/`
- [ ] **4.2** Maak folder `svelte/guides/`
- [ ] **4.3** Maak folder `svelte/examples/`
- [ ] **4.4** Maak folder `svelte/lookup/`
- [ ] **4.5** Maak folder `svelte/errors/`

### Bestanden verplaatsen/hernoemen

- [ ] **4.6** `git mv svelte/svelte-5-patterns.md svelte/examples/svelte-5-patterns.md`
- [ ] **4.7** `git mv svelte/svelte-5-migration.md svelte/guides/svelte-5-migration.md`
- [ ] **4.8** `git mv svelte/runes-guide.md svelte/guides/runes-guide.md`
- [ ] **4.9** `git mv svelte/component-lifecycle.md svelte/concepts/component-lifecycle.md`
- [ ] **4.10** `git mv svelte/store-patterns.md svelte/examples/store-patterns.md`
- [ ] **4.11** `git mv svelte/testing-svelte.md svelte/guides/testing-svelte.md`
- [ ] **4.12** `git mv svelte/performance.md svelte/guides/performance-optimization.md`
- [ ] **4.13** `git mv svelte/common-pitfalls.md svelte/errors/common-pitfalls.md`
- [ ] **4.14** `git mv svelte/best-practices.md svelte/guides/best-practices.md`
- [ ] **4.15** `git mv svelte/reactivity.md svelte/concepts/reactivity-system.md`

### Navigation

- [ ] **4.16** Update `svelte/navigation.md` met nieuwe structuur

---

## FASE 5: Project-Intelligence Category (30 min)

### Setup

- [ ] **5.1** Maak folder `project-intelligence/concepts/`
- [ ] **5.2** Maak folder `project-intelligence/guides/`
- [ ] **5.3** Maak folder `project-intelligence/examples/`
- [ ] **5.4** Maak folder `project-intelligence/lookup/`
- [ ] **5.5** Maak folder `project-intelligence/errors/`

### Bestanden verplaatsen/hernoemen

- [ ] **5.6** `git mv project-intelligence/sveltekit.md project-intelligence/guides/sveltekit-setup.md`
- [ ] **5.7** `git mv project-intelligence/drizzle-orm.md project-intelligence/guides/drizzle-orm-guide.md`
- [ ] **5.8** `git mv project-intelligence/bun.md project-intelligence/guides/bun-guide.md`
- [ ] **5.9** `git mv project-intelligence/tailwind-v4.md project-intelligence/guides/tailwind-v4-migration.md`
- [ ] **5.10** `git mv project-intelligence/shadcn-svelte.md project-intelligence/guides/shadcn-svelte-setup.md`

### Navigation

- [ ] **5.11** Update `project-intelligence/navigation.md` met nieuwe structuur

---

## FASE 6: Core/Workflows Category (30 min)

### Setup

- [ ] **6.1** Maak folder `core/workflows/concepts/`
- [ ] **6.2** Maak folder `core/workflows/guides/`
- [ ] **6.3** Maak folder `core/workflows/examples/`
- [ ] **6.4** Maak folder `core/workflows/lookup/`
- [ ] **6.5** Maak folder `core/workflows/errors/`

### Bestanden verplaatsen/hernoemen

- [ ] **6.6** `git mv core/workflows/task-delegation-basics.md core/workflows/guides/task-delegation-guide.md`
- [ ] **6.7** `git mv core/workflows/code-review.md core/workflows/guides/code-review-process.md`
- [ ] **6.8** `git mv core/workflows/design-iteration-overview.md core/workflows/guides/design-iteration-workflow.md`

### Navigation

- [ ] **6.9** Update `core/workflows/navigation.md` met nieuwe structuur

---

## FASE 7: Core/Standards Category (30 min)

### Setup

- [ ] **7.1** Maak folder `core/standards/concepts/`
- [ ] **7.2** Maak folder `core/standards/guides/`
- [ ] **7.3** Maak folder `core/standards/examples/`
- [ ] **7.4** Maak folder `core/standards/lookup/`
- [ ] **7.5** Maak folder `core/standards/errors/`

### Bestanden verplaatsen/hernoemen

- [ ] **7.6** `git mv core/standards/code-quality.md core/standards/concepts/quality-principles.md`
- [ ] **7.7** `git mv core/standards/documentation.md core/standards/concepts/documentation-standards.md`
- [ ] **7.8** `git mv core/standards/test-coverage.md core/standards/concepts/testing-standards.md`

### Navigation

- [ ] **7.9** Update `core/standards/navigation.md` met nieuwe structuur

---

## FASE 8: Navigation Updates (45 min)

- [ ] **8.1** Update `testing/navigation.md`
- [ ] **8.2** Update `development/navigation.md`
- [ ] **8.3** Update `ui/web/navigation.md`
- [ ] **8.4** Update `svelte/navigation.md`
- [ ] **8.5** Update `project-intelligence/navigation.md`
- [ ] **8.6** Update `core/workflows/navigation.md`
- [ ] **8.7** Update `core/standards/navigation.md`

---

## FASE 9: Validatie (30 min)

### Bestandsgrootte

- [ ] **9.1** Controleer alle bestanden <200 regels
- [ ] **9.2** Lijst van overtredingen (indien aanwezig)

### Links

- [ ] **9.3** Controleer alle interne links werken
- [ ] **9.4** Controleer geen broken references

### Structuur

- [ ] **9.5** Alle 5 categorieën hebben 5 folders
- [ ] **9.6** Alle navigation.md bestanden bijgewerkt

### Back-up

- [ ] **9.7** Controleer back-up integriteit
- [ ] **9.8** Alle originele bestanden aanwezig in back-up

### Git

- [ ] **9.9** Git history behouden (gebruik git mv)
- [ ] **9.10** Geen onnodige deletes/adds in git status

---

## Statistieken

| Metric            | Waarde   |
| ----------------- | -------- |
| Totale TODO items | 95       |
| Fase 0            | 3 items  |
| Fase 1            | 17 items |
| Fase 2            | 23 items |
| Fase 3            | 16 items |
| Fase 4            | 16 items |
| Fase 5            | 11 items |
| Fase 6            | 9 items  |
| Fase 7            | 9 items  |
| Fase 8            | 7 items  |
| Fase 9            | 10 items |

---

## Notities

- Gebruik altijd `git mv` om history te behouden
- Na elke fase: commit met beschrijvende message
- Back-up maken voor elke wijziging
- Controleer na elke fase of alle links werken
