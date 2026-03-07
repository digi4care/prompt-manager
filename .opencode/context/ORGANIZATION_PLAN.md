# Context Organisatie Plan - AI-Generated Files Only

**Project**: Prompt Manager Context Organisatie  
**Scope**: Alleen AI-gegenereerde bestanden (summaries, context, etc.)  
**Exclusie**: Framework documentatie (React, Svelte, etc.) blijft intact  
**Gemaakt**: 2026-03-07

---

## Scope Definitie

### ✅ WEL Organiseren (AI-Generated)

- AI summaries (SESSION-*.md, *SUMMARY.md, \*OVERVIEW.md)
- Context bestanden die wij hebben gemaakt
- Project-specifieke documentatie
- Interne workflows en standaarden

### ❌ NIET Organiseren (Framework Docs)

- React documentatie
- Svelte/SvelteKit documentatie
- Testing framework docs (Playwright, Vitest)
- UI framework docs (Tailwind, shadcn)
- Database docs (Drizzle, etc.)

---

## Huidige Inventarisatie - AI-Generated Files Only

### Categorie 1: Context System (WEL organiseren)

```
opencode/context/core/
├── context-system/          # ✅ Onze documentatie
│   ├── operations/
│   ├── standards/
│   └── guides/
├── standards/               # ✅ Onze standaarden
│   ├── code-quality.md
│   ├── documentation.md
│   └── test-coverage.md
└── workflows/               # ✅ Onze workflows
    ├── task-delegation-basics.md
    ├── code-review.md
    └── design-iteration-overview.md
```

### Categorie 2: Project Intelligence (WEL organiseren)

```
opencode/context/project-intelligence/
├── sveltekit.md             # ✅ Onze samenvatting
├── drizzle-orm.md           # ✅ Onze samenvatting
├── bun.md                   # ✅ Onze samenvatting
├── tailwind-v4.md           # ✅ Onze samenvatting
└── shadcn-svelte.md         # ✅ Onze samenvatting
```

### Categorie 3: Development Principles (WEL organiseren)

```
opencode/context/development/
├── principles/              # ✅ Onze principes
│   ├── clean-code.md
│   ├── solid.md
│   ├── dry.md
│   └── kiss.md
└── frontend/
    └── when-to-delegate.md  # ✅ Onze guide
```

### Categorie 4: Testing (WEL organiseren)

```
opencode/context/testing/
├── philosophy.md            # ✅ Onze filosofie
├── fases.md                 # ✅ Onze fase-indeling
├── cli-vs-browser.md        # ✅ Onze analyse
└── [overige testing docs]   # ✅ Onze documentatie
```

### Categorie 5: UI/Web Design (DEELS - alleen onze content)

```
opencode/context/ui/web/
├── design/                  # ✅ Onze design system docs
└── [framework docs]         # ❌ NIET aanraken
```

### Categorie 6: Svelte (DEELS - alleen onze content)

```
opencode/context/svelte/
├── [onze svelte docs]       # ✅ Onze Svelte content
└── [framework docs]         # ❌ NIET aanraken
```

---

## Nieuwe Structuur - AI-Generated Only

### 1. Context System → Al georganiseerd ✅

```
core/context-system/
├── operations/     # ✅ Bestaat al
├── standards/      # ✅ Bestaat al
└── guides/         # ✅ Bestaat al
```

### 2. Project Intelligence → Hernoemen naar `tech-stack/`

```
tech-stack/                    # was: project-intelligence/
├── navigation.md
├── concepts/
│   └── stack-overview.md
├── guides/
│   ├── sveltekit-guide.md     # was: sveltekit.md
│   ├── drizzle-guide.md       # was: drizzle-orm.md
│   ├── bun-guide.md           # was: bun.md
│   ├── tailwind-v4-guide.md   # was: tailwind-v4.md
│   └── shadcn-svelte-guide.md # was: shadcn-svelte.md
├── examples/
│   └── [voorbeelden]
├── lookup/
│   └── quick-reference.md
└── errors/
    └── common-issues.md
```

### 3. Development → Hernoemen naar `engineering/`

```
engineering/                   # was: development/
├── navigation.md
├── concepts/
│   ├── clean-code.md          # van principles/
│   ├── solid.md               # van principles/
│   ├── dry.md                 # van principles/
│   ├── kiss.md                # van principles/
│   └── delegation-concepts.md # van frontend/
├── guides/
│   └── delegation-guide.md    # was: when-to-delegate.md
├── examples/
│   └── delegation-examples.md
├── lookup/
│   └── principles-quick-ref.md
└── errors/
    └── common-mistakes.md
```

### 4. Testing → Hernoemen naar `testing-strategy/`

```
testing-strategy/              # was: testing/
├── navigation.md
├── concepts/
│   ├── testing-philosophy.md  # was: philosophy.md
│   ├── cli-vs-browser.md
│   └── [andere concepten]
├── guides/
│   ├── testing-fases.md       # was: fases.md
│   └── [andere guides]
├── examples/
│   └── [voorbeelden]
├── lookup/
│   └── quick-reference.md
└── errors/
    └── common-failures.md
```

### 5. UI/Web → Alleen onze design docs

```
ui/
├── design/                    # ✅ Al georganiseerd
└── [framework docs blijven]   # ❌ NIET aanraken
```

### 6. Svelte → Alleen onze content

```
svelte/
├── [onze docs]                # ✅ Organiseren
└── [framework docs]           # ❌ NIET aanraken
```

---

## Files om NIET te Organiseren

Deze bestanden zijn framework documentatie en blijven intact:

```
❌ svelte/svelte-5-patterns.md        (framework doc)
❌ svelte/svelte-5-migration.md       (framework doc)
❌ svelte/runes-guide.md              (framework doc)
❌ svelte/component-lifecycle.md      (framework doc)
❌ svelte/store-patterns.md           (framework doc)
❌ svelte/testing-svelte.md           (framework doc)
❌ svelte/performance.md              (framework doc)
❌ svelte/common-pitfalls.md          (framework doc)
❌ svelte/best-practices.md           (framework doc)
❌ svelte/reactivity.md               (framework doc)

❌ ui/web/design-systems.md           (framework doc)
❌ ui/web/ui-styling-standards.md     (framework doc)
❌ ui/web/animation-patterns.md       (framework doc)
❌ ui/web/animation-basics.md         (framework doc)
❌ ui/web/design-assets.md            (framework doc)
❌ ui/web/responsive-design.md        (framework doc)
❌ ui/web/accessibility.md            (framework doc)

❌ development/frontend/react/        (framework docs)
❌ development/security/auth/         (framework docs)

❌ testing/playwright-mcp.md          (framework doc)
❌ testing/vitest-patterns.md         (framework doc)
❌ testing/test-data-factories.md     (framework doc)
❌ testing/actor-testing.md           (framework doc)
❌ testing/state-analysis.md          (framework doc)
❌ testing/state-management.md        (framework doc)
❌ testing/service-isolation.md       (framework doc)
❌ testing/performance-testing.md     (framework doc)
```

---

## Uitvoeringsplan

### Fase 1: Hernoem Categories (30 min)

1. `project-intelligence/` → `tech-stack/`
2. `development/` → `engineering/`
3. `testing/` → `testing-strategy/`

### Fase 2: Organiseer tech-stack/ (20 min)

- Maak 5 folders aan
- Verplaats 5 bestanden naar guides/
- Update navigation.md

### Fase 3: Organiseer engineering/ (30 min)

- Maak 5 folders aan
- Verplaats principles/ → concepts/
- Verplaats when-to-delegate.md → guides/
- Update navigation.md

### Fase 4: Organiseer testing-strategy/ (20 min)

- Maak 5 folders aan
- Hernoem philosophy.md → concepts/testing-philosophy.md
- Hernoem fases.md → guides/testing-fases.md
- Update navigation.md

### Fase 5: Update Navigation (15 min)

- Update alle navigation.md bestanden
- Controleer interne links

### Fase 6: Validatie (10 min)

- Controleer structuur
- Controleer links
- Maak back-up

**Totaal**: ~2 uur (veel minder dan originele 6 uur!)

---

## Goedkeuring

Wil je dit aangepaste plan uitvoeren?

**Opties:**

- **A** - Ja, start met Fase 1 (Hernoem categories)
- **B** - Preview wijzigingen eerst
- **C** - Pas plan nog aan
- **D** - Annuleren
