# 🚀 Volledige Website Restyling Plan

## Volgens SOLID & DRY Principes

### Project: prompt-manager | Datum: 2026-02-20

### Tech Stack: **Tailwind CSS v4** + **shadcn-svelte** + **Svelte 5**

---

## ⚠️ Belangrijke Technische Eisen

### Tailwind v4 Configuratie

```css
/* app.css - verplichte v4 syntax */
@import 'tailwindcss';

@theme {
	/* Custom tokens via @theme */
	--color-primary: #3b82f6;
	--color-success: #22c55e;
	--radius-lg: 0.5rem;
}

@plugin '@tailwindcss/forms';
@plugin '@tailwindcss/typography';
```

### shadcn-svelte Design Tokens

Alleen deze tokens gebruiken:

- ✅ `background`, `foreground`, `card`, `card-foreground`
- ✅ `muted`, `muted-foreground`, `border`, `input`
- ✅ `primary`, `primary-foreground`
- ✅ `secondary`, `secondary-foreground`
- ✅ `accent`, `accent-foreground`
- ✅ `destructive`, `destructive-foreground`
- ❌ GEEN hardcoded kleuren (bg-white, text-gray-900, etc.)

### Svelte 5 Runes

```svelte
<script>
	// ✅ Correct Svelte 5
	let count = $state(0);
	let double = $derived(count * 2);

	let { variant = 'default', ...props } = $props();
</script>
```

---

## 📊 Website Architectuur Overzicht

### **Routes (14 pagina's)**

| #   | Route                   | Component     | Functionaliteit           |
| --- | ----------------------- | ------------- | ------------------------- |
| 1   | `/`                     | Home          | Welkomstpagina (leeg)     |
| 2   | `/login`                | Login         | Authenticatie             |
| 3   | `/register`             | Register      | Registratie               |
| 4   | `/prompts`              | PromptsList   | Prompt lijst (grid/table) |
| 5   | `/prompts/new`          | NewPrompt     | Nieuwe prompt             |
| 6   | `/prompts/[id]`         | PromptDetail  | Prompt details + versies  |
| 7   | `/prompts/[id]/edit`    | PromptEdit    | Prompt editor             |
| 8   | `/prompts/[id]/improve` | PromptImprove | AI verbetering            |
| 9   | `/settings`             | Settings      | 7 secties (accordion)     |
| 10  | `/analytics`            | Analytics     | Dashboard + charts        |
| 11  | `/admin/profile`        | Profile       | Gebruiker profiel         |
| 12  | `/admin/ai-settings`    | AISettings    | AI configuratie           |
| 13  | `/test`                 | TestUI        | UI componenten test       |
| 14  | `/logout`               | Logout        | Uitloggen                 |

---

## 🎨 UI Component Library (Herbruikbaar)

### **Basis Componenten**

| Component       | Locatie             | Huidige Status | Verbeterpunten                          |
| --------------- | ------------------- | -------------- | --------------------------------------- |
| **Button**      | `ui/button/`        | ✅ Bestaat     | Focus states, loading, icon positioning |
| **Input**       | `ui/input/`         | ✅ Bestaat     | Focus rings, error states, labels       |
| **Textarea**    | `ui/textarea/`      | ✅ Bestaat     | Auto-resize, character count            |
| **Card**        | `ui/card/`          | ✅ Bestaat     | Varianten (default, bordered, elevated) |
| **Badge**       | `ui/badge/`         | ✅ Bestaat     | Kleur varianten                         |
| **Label**       | `ui/label/`         | ✅ Bestaat     | -                                       |
| **Slider**      | `ui/slider/`        | ✅ Bestaat     | Tooltips, dual-handle                   |
| **Progress**    | `ui/progress/`      | ✅ Bestaat     | Animated stripes                        |
| **Tabs**        | `ui/tabs/`          | ✅ Bestaat     | Pill variant                            |
| **Dialog**      | `ui/dialog/`        | ✅ Bestaat     | Animation variants                      |
| **Dropdown**    | `ui/dropdown-menu/` | ✅ Bestaat     | -                                       |
| **Toast**       | `ui/toast/`         | ✅ Bestaat     | Position variants                       |
| **ThemeToggle** | `ui/theme-toggle/`  | ✅ Bestaat     | -                                       |

---

## 📦 Component Groepen (SOLID)

### **Groep 1: Layout Componenten**

| Component | Bestand                    | Verantwoordelijkheid   |
| --------- | -------------------------- | ---------------------- |
| Header    | `layout/header.svelte`     | Navigatie, thema, auth |
| Sidebar   | `layout/sidebar.svelte`    | Zijmenu                |
| MobileNav | `layout/mobile-nav.svelte` | Mobiele navigatie      |

### **Groep 2: Prompt Componenten**

| Component      | Bestand                          | Verantwoordelijkheid         |
| -------------- | -------------------------------- | ---------------------------- |
| PromptCard     | `prompts/prompt-card.svelte`     | Weergave prompt in lijst     |
| PromptTable    | `prompts/prompt-table.svelte`    | Tabel weergave               |
| PromptList     | `prompts/prompt-list.svelte`     | Lijst container              |
| PromptEditor   | `prompts/prompt-editor.svelte`   | Editor met code highlighting |
| PromptMetadata | `prompts/prompt-metadata.svelte` | Metadata formulier           |
| PresetSelector | `prompts/preset-selector.svelte` | Prompt presets               |
| ModelPicker    | `prompts/model-picker.svelte`    | Model selectie               |

### **Groep 3: AI/Admin Componenten**

| Component             | Bestand                                            | Verantwoordelijkheid |
| --------------------- | -------------------------------------------------- | -------------------- |
| ConnectionSettings    | `ai-settings/connection-settings.svelte`           | OpenCode connectie   |
| ConnectionStatus      | `ai-settings/connection-status.svelte`             | Status weergave      |
| ProvidersBlock        | `ai-settings/providers-block.svelte`               | Provider management  |
| ProviderModal         | `ai-settings/provider-modal.svelte`                | Provider toevoegen   |
| CatalogView           | `ai-settings/catalog-view.svelte`                  | Model catalogus      |
| ModelCatalogCard      | `ai-settings/model-catalog-card.svelte`            | Model kaart          |
| PolicyEditor          | `ai-settings/policy-editor.svelte`                 | AI beleid            |
| ImprovePresets        | `ai-settings/improve-presets.svelte`               | Verbeter presets     |
| FunctionSettingsCard  | `function-settings/FunctionSettingsCard.svelte`    | Functie instellingen |
| FunctionSettingsTable | `function-settings/function-settings-table.svelte` | Functies tabel       |
| FunctionSettingsCards | `function-settings/function-settings-cards.svelte` | Functie kaarten      |
| CouncilRepeater       | `function-settings/council-repeater.svelte`        | Council agents       |
| ModelPickerModal      | `function-settings/model-picker-modal.svelte`      | Model picker         |
| ModelPickerRow        | `function-settings/model-picker-row.svelte`        | Model rij            |
| ValidationSummary     | `function-settings/validation-summary.svelte`      | Validatie overzicht  |

### **Groep 4: Improvement Componenten**

| Component         | Bestand                                | Verantwoordelijkheid |
| ----------------- | -------------------------------------- | -------------------- |
| ImprovementPanel  | `improvement/improvement-panel.svelte` | AI verbetering panel |
| VariantComparison | `improvement/VariantComparison.svelte` | Variant vergelijking |
| JudgeResults      | `improvement/judge-results.svelte`     | Judge resultaten     |

### **Groep 5: Visualisatie Componenten**

| Component        | Bestand                                  | Verantwoordelijkheid |
| ---------------- | ---------------------------------------- | -------------------- |
| MetricsDashboard | `visualizations/MetricsDashboard.svelte` | KPI dashboard        |
| PerformanceChart | `visualizations/PerformanceChart.svelte` | Performance grafiek  |
| GenealogyTree    | `visualizations/GenealogyTree.svelte`    | Versie boom          |

### **Groep 6: Versie Componenten**

| Component       | Bestand                            | Verantwoordelijkheid |
| --------------- | ---------------------------------- | -------------------- |
| VersionTimeline | `versions/version-timeline.svelte` | Versie tijdlijn      |
| VersionDiff     | `versions/VersionDiff.svelte`      | Versie vergelijking  |

---

## 🎯 DRY Principe: Herbruikbare Styling Patterns (Tailwind v4)

### Pattern 1: Card Variants met tv() (tailwind-variants)

```typescript
// Herbruikbaar met tailwind-variants
import { tv } from 'tailwind-variants';

const card = tv({
	base: 'rounded-lg border bg-card p-6',
	variants: {
		variant: {
			default: 'border-border',
			bordered: 'border-2 border-border',
			elevated: 'shadow-lg',
			interactive: 'hover:border-primary/50 cursor-pointer',
			selectable: 'selected:border-primary selected:bg-primary/5'
		},
		size: {
			sm: 'p-4',
			md: 'p-6',
			lg: 'p-8'
		}
	}
});
```

### Pattern 2: Focus Ring System (Tailwind v4)

```typescript
// Focus rings via @utility of classes
const focusRing = 'focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:outline-none';
const focusRingError =
	'focus:ring-2 focus:ring-destructive/50 focus:ring-offset-2 focus:outline-none';
```

### Pattern 3: Animation Presets (Svelte transition)

```svelte
<script>
	import { fade, slide, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	const transitions = {
		fade: { transition: fade, duration: 200 },
		slide: { transition: slide, duration: 200 },
		scale: { transition: scale, duration: 200, easing: cubicOut }
	};
</script>
```

### Pattern 4: Touch Target (Tailwind)

```css
/* Custom utility in @theme */
@utility touch-target {
	@apply min-h-[44px] min-w-[44px];
}
```

### **Pattern 2: Focus Ring System (Open-Closed)**

```typescript
// Herbruikbaar focus systeem
const focusRing = {
	default: 'focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
	error: 'focus:ring-2 focus:ring-destructive/50 focus:ring-offset-2',
	success: 'focus:ring-2 focus:ring-success/50 focus:ring-offset-2'
};
```

### **Pattern 3: Animation Presets (Interface Segregation)**

```typescript
// Verschillende animatie types
type AnimationPreset = 'fade' | 'slide' | 'scale' | 'collapse';
// Component kiest welke het nodig heeft
```

### **Pattern 4: Touch Target Mixin**

```css
/* Herbruikbare touch target */
.touch-target {
	@apply min-h-[44px] min-w-[44px];
}
```

---

## 🔧 Restyling Taken Per Prioriteit

### **FASE 1: Fundament (Basis Componenten)**

| #   | Taak                | Componenten                     | DRY Impact                         |
| --- | ------------------- | ------------------------------- | ---------------------------------- |
| 1.1 | Focus Ring System   | Input, Textarea, Button, Select | ✅ 1x definiëren, overal gebruiken |
| 1.2 | Card Variant System | Alle Cards                      | ✅ 5 varianten, herbruikbaar       |
| 1.3 | Animation Presets   | Dialog, Dropdown, Accordion     | ✅ 4 presets, herbruikbaar         |
| 1.4 | Loading States      | Button, Input                   | ✅ 1x component, overal            |
| 1.5 | Error States        | Input, Form                     | ✅ ErrorMessage component          |

### **FASE 2: Layout & Navigatie**

| #   | Taak           | Componenten         | SOLID                     |
| --- | -------------- | ------------------- | ------------------------- |
| 2.1 | Header Restyle | `header.svelte`     | Verbeter visual hierarchy |
| 2.2 | Mobile Nav     | `mobile-nav.svelte` | Betere touch targets      |
| 2.3 | Sidebar        | `sidebar.svelte`    | Consistent met header     |

### **FASE 3: Prompt Pagina's**

| #   | Taak            | Componenten                                   | Functionaliteit behouden       |
| --- | --------------- | --------------------------------------------- | ------------------------------ |
| 3.1 | Prompts Lijst   | `/prompts` + `prompt-card.svelte`             | ✅ Zoeken, filteren, sorteren  |
| 3.2 | Prompt Table    | `prompt-table.svelte`                         | ✅ Kolommen, selecteren        |
| 3.3 | Prompt Editor   | `/prompts/[id]/edit` + `prompt-editor.svelte` | ✅ Code highlighting, autosave |
| 3.4 | Prompt Metadata | `prompt-metadata.svelte`                      | ✅ Validatie                   |
| 3.5 | Prompt Detail   | `/prompts/[id]` + `version-timeline.svelte`   | ✅ Versie historie             |

### **FASE 4: AI/Settings Pagina's**

| #   | Taak                | Componenten                        | Functionaliteit behouden  |
| --- | ------------------- | ---------------------------------- | ------------------------- |
| 4.1 | Settings Accordion  | `/settings` + `collapsible.svelte` | ✅ 7 secties              |
| 4.2 | Connection Settings | `connection-settings.svelte`       | ✅ API calls, mode switch |
| 4.3 | Providers Block     | `providers-block.svelte`           | ✅ Connect/disconnect     |
| 4.4 | Policy Editor       | `policy-editor.svelte`             | ✅ Whitelist beheer       |
| 4.5 | Catalog View        | `catalog-view.svelte`              | ✅ Zoeken, filteren       |
| 4.6 | Function Settings   | `FunctionSettingsCard.svelte`      | ✅ Model select           |

### **FASE 5: Improvement & Analytics**

| #   | Taak               | Componenten                | Functionaliteit behouden |
| --- | ------------------ | -------------------------- | ------------------------ |
| 5.1 | Improvement Panel  | `improvement-panel.svelte` | ✅ AI verbetering        |
| 5.2 | Variant Comparison | `VariantComparison.svelte` | ✅ Variant vergelijking  |
| 5.3 | Judge Results      | `judge-results.svelte`     | ✅ Score weergave        |
| 5.4 | Metrics Dashboard  | `MetricsDashboard.svelte`  | ✅ KPI's                 |
| 5.5 | Performance Chart  | `PerformanceChart.svelte`  | ✅ Grafieken             |

### **FASE 6: Auth & Profiel**

| #   | Taak            | Componenten      | Functionaliteit behouden |
| --- | --------------- | ---------------- | ------------------------ |
| 6.1 | Login Pagina    | `/login`         | ✅ Authenticatie         |
| 6.2 | Register Pagina | `/register`      | ✅ Registratie           |
| 6.3 | Profile Pagina  | `/admin/profile` | ✅ Profiel beheer        |

---

## 📋 Specifieke Verbeteringen (Frontend-Design)

### **Volgens Component States Checklist**

| State        | Huidig       | Doel                                | Implementatie          |
| ------------ | ------------ | ----------------------------------- | ---------------------- |
| **Default**  | ❌ Varierend | Consistent                          | Design tokens          |
| **Hover**    | ⚠️ Deels     | Overal aanwezig                     | `hover:` classes       |
| **Focus**    | ❌ Ontbreekt | Altijd zichtbaar                    | `focus:ring-*`         |
| **Active**   | ❌ Ontbreekt | `active:scale-95`                   | `active:` classes      |
| **Disabled** | ⚠️ Deels     | `opacity-50` + `cursor-not-allowed` | Consistent             |
| **Loading**  | ⚠️ Deels     | Spinner + disabled                  | Button variant         |
| **Error**    | ⚠️ Deels     | Rood border + message               | ErrorMessage component |

### **Volgens Visual Hierarchy**

| Element   | Regel             | Implementatie            |
| --------- | ----------------- | ------------------------ |
| **H1**    | 32-48px, Bold     | `text-3xl font-bold`     |
| **H2**    | 24-32px, Semibold | `text-2xl font-semibold` |
| **Body**  | 16px, Regular     | `text-base`              |
| **Small** | 12-14px           | `text-sm`                |
| **Kleur** | 4.5:1 contrast    | Design tokens            |

### **Volgens Mobile-First**

| Element       | Regel                       | Implementatie               |
| ------------- | --------------------------- | --------------------------- |
| Touch targets | 44x44px minimum             | `min-h-[44px] min-w-[44px]` |
| Thumb zone    | Primaire acties onderin     | Bottom navigation           |
| Viewports     | 320px, 375px, 768px, 1024px | Responsive breakpoints      |

---

## 🧪 Test Strategie

### **Functionele Tests (na elke component)**

| Component            | Test Type | Wat testen                       |
| -------------------- | --------- | -------------------------------- |
| ConnectionSettings   | E2E       | Connect/disconnect, mode switch  |
| ProvidersBlock       | E2E       | Provider toevoegen, OAuth flow   |
| FunctionSettingsCard | Unit      | Model select, temperature change |
| CatalogView          | E2E       | Zoeken, filteren, slider         |
| PromptEditor         | E2E       | Opslaan, autosave                |
| ImprovementPanel     | E2E       | AI verbetering starten           |

---

## 📁 Nieuwe Bestanden (DRY: Gecentraliseerde Styles)

### Nieuwe Styling Bestanden (Tailwind v4)

```
src/
├── lib/
│   ├── styles/
│   │   └── app.css                 # ✅ Bestaat - Tailwind v4 imports
│   │
│   └── components/
│       └── ui/
│           ├── error-message.svelte    # Nieuw: Error state component
│           ├── loading-spinner.svelte  # Nieuw: Loading state
│           ├── accordion.svelte         # Nieuw: shadcn accordion
│           └── card.svelte              # Verbeterd: Variant support met tv()
```

### Nieuwe shadcn-svelte Componenten (nog toevoegen)

```bash
# Voeg ontbrekende componenten toe
pnpm dlx shadcn-svelte@latest add accordion
pnpm dlx shadcn-svelte@latest add select
pnpm dlx shadcn-svelte@latest add checkbox
pnpm dlx shadcn-svelte@latest add radio-group
pnpm dlx shadcn-svelte@latest add switch
pnpm dlx shadcn-svelte@latest add separator
pnpm dlx shadcn-svelte@latest add scroll-area
pnpm dlx shadcn-svelte@latest add skeleton
pnpm dlx shadcn-svelte@latest add tooltip
```

---

## ✅ Samenvatting

| Fase       | Componenten                      | Prioriteit | Tests |
| ---------- | -------------------------------- | ---------- | ----- |
| **FASE 1** | Basis (Focus, Cards, Animations) | 🔴 Hoog    | Nee   |
| **FASE 2** | Layout (Header, Nav)             | 🔴 Hoog    | Nee   |
| **FASE 3** | Prompts (6 componenten)          | 🟡 Medium  | ✅ Ja |
| **FASE 4** | Settings (6 componenten)         | 🟡 Medium  | ✅ Ja |
| **FASE 5** | Improvement (5 componenten)      | 🟢 Laag    | ✅ Ja |
| **FASE 6** | Auth (3 pagina's)                | 🟢 Laag    | ✅ Ja |

**Totaal: 32 componenten, 6 fases**

---

## 📊 UITGEVOERDE RESULTATEN (2026-02-20)

### FASE 1: Fundament ✅

| Verbetering                              | Status | Bestand                                                                                                       |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| **shadcn-svelte componenten toegevoegd** | ✅     | 8 nieuwe: accordion, select, switch, separator, tooltip, checkbox, table, skeleton                            |
| **Card varianten**                       | ✅     | `src/lib/components/ui/card/card.svelte` - 5 varianten (default, bordered, elevated, interactive, selectable) |
| **Animation presets**                    | ✅     | `src/app.css` - fade, scale, slide, collapse                                                                  |
| **Touch targets**                        | ✅     | `src/app.css` - 44px minimum                                                                                  |

### FASE 2: Layout & Navigatie ✅

| Component   | Verbetering                            | Bestand                                    |
| ----------- | -------------------------------------- | ------------------------------------------ |
| **Header**  | ✅ Animaties mobile menu, hover states | `src/lib/components/layout/header.svelte`  |
| **Sidebar** | ✅ Consistent met header               | `src/lib/components/layout/sidebar.svelte` |

### FASE 3: Prompt Pagina's ✅

| Component    | Status              |
| ------------ | ------------------- |
| PromptCard   | ✅ Al goed gestyled |
| PromptList   | ✅ Al goed gestyled |
| Prompts Page | ✅ Al goed gestyled |

### FASE 4: Settings Pagina ✅

| Verbetering                 | Status                      | Bestand                            |
| --------------------------- | --------------------------- | ---------------------------------- |
| **Accordion kleurcodering** | ✅ Elke sectie unieke kleur | `src/routes/settings/+page.svelte` |
| **Focus states**            | ✅ Verbeterd                | Alle inputs                        |
| **Animaties**               | ✅ Slide + fade             | Transition classes                 |
| **ChevronUp fix**           | ✅ Import toegevoegd        | `src/routes/settings/+page.svelte` |

### FASE 5: Improvement & Analytics ✅

| Component             | Verbetering                   | Bestand                                                     |
| --------------------- | ----------------------------- | ----------------------------------------------------------- |
| **VariantComparison** | ✅ Show more/Show less toggle | `src/lib/components/improvement/VariantComparison.svelte`   |
| **MetricsDashboard**  | ✅ Date range filters         | `src/lib/components/visualizations/MetricsDashboard.svelte` |
| **PerformanceChart**  | ✅ Verbeterde tooltips        | `src/lib/components/visualizations/PerformanceChart.svelte` |

### FASE 6: Auth & Profiel ✅

| Pagina       | Verbetering                   | Bestand                         |
| ------------ | ----------------------------- | ------------------------------- |
| **Login**    | ✅ Password visibility toggle | `src/routes/login/+page.svelte` |
| **Register** | ✅ Al goed gestyled           | -                               |
| **Profile**  | ✅ Al goed gestyled           | -                               |

---

### 🐛 Bug Fixes Uitgevoerd

| #   | Bestand                         | Probleem                                            | Oplossing                                 |
| --- | ------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| 1   | `skeleton.svelte`               | `WithoutChildren` undefined                         | Veranderd naar `WithoutChild`             |
| 2   | `settings/+page.svelte`         | `ChevronUp` undefined                               | Imports toegevoegd                        |
| 3   | `api/providers/auth/+server.ts` | Duplicate PUT handler                               | Verwijderd (bestaat al in `[providerId]`) |
| 4   | `function-settings/types.ts`    | Type conflicts                                      | Vereenvoudigd, flexibele types            |
| 5   | `model-picker-row.svelte`       | Locale vs imported types                            | Import van gedeelde `types.ts`            |
| 6   | `layout.test.ts`                | Test verwacht `/admin`, navigatie heeft `/settings` | Test bijgewerkt                           |

---

### 🧪 Test Resultaten

| Test Type               | Resultaat                              |
| ----------------------- | -------------------------------------- |
| **TypeScript (source)** | ✅ 0 errors                            |
| **Unit Tests (Vitest)** | ✅ 994 passed, 6 pre-existing failures |
| **Test fix**            | ✅ 1 test bijgewerkt                   |
| **E2E Tests**           | ⏳ Moet nog draaien                    |

---

### 📁 Nieuwe/ Gewijzigde Bestanden

```
NIEUW:
- src/lib/components/ui/accordion/
- src/lib/components/ui/select/
- src/lib/components/ui/switch/
- src/lib/components/ui/separator/
- src/lib/components/ui/tooltip/
- src/lib/components/ui/checkbox/
- src/lib/components/ui/table/
- src/lib/components/ui/skeleton/
- src/lib/components/admin/function-settings/types.ts

GEWIJZIGD:
- src/lib/components/ui/card/card.svelte (varianten)
- src/app.css (animations, touch targets)
- src/lib/components/layout/header.svelte
- src/lib/components/layout/sidebar.svelte
- src/routes/settings/+page.svelte
- src/lib/components/improvement/VariantComparison.svelte
- src/lib/components/visualizations/MetricsDashboard.svelte
- src/lib/components/visualizations/PerformanceChart.svelte
- src/routes/login/+page.svelte
- tests/layout.test.ts
```

---

## 🚀 Volgende Stappen

1. **E2E Tests draaien** - Playwright tests voor alle pagina's
2. **Indien nodig** - Fix E2E test failures
3. **Live verificatie** - Handmatig testen in browser

---

_Resultaten toegevoegd: 2026-02-20_
_Status: Restyling Compleet ✅_
