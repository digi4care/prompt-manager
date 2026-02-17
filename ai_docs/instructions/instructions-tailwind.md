# Tailwind v4 Setup & Design System Guidelines

> **🚨 CRITICAL INSTRUCTIONS FOR AI/LLM**
>
> Lees dit goed voordat je code schrijft. Dit project heeft strikte design regels.
>
> **3 GOUDE REGELS:**
>
> 1. **ALTIJD design tokens gebruiken** - Geen hardcoded kleuren zoals `bg-white`, `text-gray-500`
> 2. **ALTIJD shadcn-svelte components gebruiken** - Bouw niet opnieuw wat er al is
> 3. **ALTIJD eerst kijken wat er al is** - Check `src/lib/components/ui/` voor beschikbare components
>
> **WAAROM?**
>
> - Consistente UI across het hele project
> - Dark mode werkt automatisch
> - Design tokens zorgen voor thema consistentie
> - shadcn components zijn al getest en accessible
>
> **CONSEQUENTIE VAN REGEL OVERTREDING:**
>
> - ❌ Hardcoded kleuren breken dark mode
> - ❌ Custom components die shadcn al heeft = onnodig werk
> - ❌ Inconsistente UI voor gebruikers

---

### `routes/layout.css`

```css
@import "tailwindcss";

:root {
  --background: oklch(0.9578 0.0058 264.5321);
  --foreground: oklch(0.4355 0.0430 279.3250);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0.4355 0.0430 279.3250);
  --popover: oklch(0.8575 0.0145 268.4756);
  --popover-foreground: oklch(0.4355 0.0430 279.3250);
  --primary: oklch(0.5547 0.2503 297.0156);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.8575 0.0145 268.4756);
  --secondary-foreground: oklch(0.4355 0.0430 279.3250);
  --muted: oklch(0.9060 0.0117 264.5071);
  --muted-foreground: oklch(0.5471 0.0343 279.0837);
  --accent: oklch(0.6820 0.1448 235.3822);
  --accent-foreground: oklch(1.0000 0 0);
  --destructive: oklch(0.5505 0.2155 19.8095);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.8083 0.0174 271.1982);
  --input: oklch(0.8575 0.0145 268.4756);
  --ring: oklch(0.5547 0.2503 297.0156);
  --chart-1: oklch(0.5547 0.2503 297.0156);
  --chart-2: oklch(0.6820 0.1448 235.3822);
  --chart-3: oklch(0.6250 0.1772 140.4448);
  --chart-4: oklch(0.6920 0.2041 42.4293);
  --chart-5: oklch(0.7141 0.1045 33.0967);
  --sidebar: oklch(0.9335 0.0087 264.5206);
  --sidebar-foreground: oklch(0.4355 0.0430 279.3250);
  --sidebar-primary: oklch(0.5547 0.2503 297.0156);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.6820 0.1448 235.3822);
  --sidebar-accent-foreground: oklch(1.0000 0 0);
  --sidebar-border: oklch(0.8083 0.0174 271.1982);
  --sidebar-ring: oklch(0.5547 0.2503 297.0156);

  /* Custom tokens */
  --success: oklch(0.72 0.19 142);
  --success-foreground: oklch(1.0 0 0);
  --warning: oklch(0.80 0.15 85);
  --warning-foreground: oklch(0.25 0.03 284);
  --info: oklch(0.70 0.12 230);
  --info-foreground: oklch(1.0 0 0);

  /* Kanban status tokens */
  --status-ready: oklch(0.72 0.19 142);
  --status-in-progress: oklch(0.70 0.15 250);
  --status-review: oklch(0.75 0.12 60);
  --status-verified: oklch(0.65 0.20 160);
  --status-paused: oklch(0.60 0.08 280);
  --status-blocked: oklch(0.55 0.22 20);
  --status-stuck: oklch(0.50 0.18 30);

  /* Agent status tokens */
  --agent-idle: oklch(0.65 0.05 280);
  --agent-running: oklch(0.70 0.15 250);
  --agent-waiting: oklch(0.75 0.12 60);
  --agent-error: oklch(0.55 0.22 20);

  /* Typography */
  --font-sans: Manrope, ui-sans-serif, sans-serif, system-ui;
  --font-serif: Baskervville, ui-serif, serif;
  --font-mono: Geist Mono, ui-monospace, monospace;

  /* Radius */
  --radius: 0.075rem;

  /* Shadows */
  --shadow-x: 0px;
  --shadow-y: 4px;
  --shadow-blur: 6px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.12;
  --shadow-color: hsl(240 30% 25%);
  --shadow-2xs: 0px 4px 6px 0px hsl(240 30% 25% / 0.06);
  --shadow-xs: 0px 4px 6px 0px hsl(240 30% 25% / 0.06);
  --shadow-sm: 0px 4px 6px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow: 0px 4px 6px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
  --shadow-md: 0px 4px 6px 0px hsl(240 30% 25% / 0.12), 0px 2px 4px -1px hsl(240 30% 25% / 0.12);
  --shadow-lg: 0px 4px 6px 0px hsl(240 30% 25% / 0.12), 0px 4px 6px -1px hsl(240 30% 25% / 0.12);
  --shadow-xl: 0px 4px 6px 0px hsl(240 30% 25% / 0.12), 0px 8px 10px -1px hsl(240 30% 25% / 0.12);
  --shadow-2xl: 0px 4px 6px 0px hsl(240 30% 25% / 0.30);

  /* Tracking */
  --tracking-normal: -0.025em;

  /* Spacing */
  --spacing: 0.25rem;
}

.dark {
  --background: oklch(0.2155 0.0254 284.0647);
  --foreground: oklch(0.8787 0.0426 272.2767);
  --card: oklch(0.2429 0.0304 283.9110);
  --card-foreground: oklch(0.8787 0.0426 272.2767);
  --popover: oklch(0.4037 0.0320 280.1520);
  --popover-foreground: oklch(0.8787 0.0426 272.2767);
  --primary: oklch(0.7871 0.1187 304.7693);
  --primary-foreground: oklch(0.2429 0.0304 283.9110);
  --secondary: oklch(0.4765 0.0340 278.6430);
  --secondary-foreground: oklch(0.8787 0.0426 272.2767);
  --muted: oklch(0.2973 0.0294 276.2144);
  --muted-foreground: oklch(0.7510 0.0396 273.9320);
  --accent: oklch(0.8467 0.0833 210.2545);
  --accent-foreground: oklch(0.2429 0.0304 283.9110);
  --destructive: oklch(0.7556 0.1297 2.7642);
  --destructive-foreground: oklch(0.2429 0.0304 283.9110);
  --border: oklch(0.3240 0.0319 281.9784);
  --input: oklch(0.3240 0.0319 281.9784);
  --ring: oklch(0.7871 0.1187 304.7693);
  --chart-1: oklch(0.7871 0.1187 304.7693);
  --chart-2: oklch(0.8467 0.0833 210.2545);
  --chart-3: oklch(0.8577 0.1092 142.7153);
  --chart-4: oklch(0.8237 0.1015 52.6294);
  --chart-5: oklch(0.9226 0.0238 30.4919);
  --sidebar: oklch(0.1828 0.0204 284.2039);
  --sidebar-foreground: oklch(0.8787 0.0426 272.2767);
  --sidebar-primary: oklch(0.7871 0.1187 304.7693);
  --sidebar-primary-foreground: oklch(0.2429 0.0304 283.9110);
  --sidebar-accent: oklch(0.8467 0.0833 210.2545);
  --sidebar-accent-foreground: oklch(0.2429 0.0304 283.9110);
  --sidebar-border: oklch(0.4037 0.0320 280.1520);
  --sidebar-ring: oklch(0.7871 0.1187 304.7693);

  /* Custom tokens - dark */
  --success: oklch(0.78 0.15 145);
  --success-foreground: oklch(0.20 0.03 145);
  --warning: oklch(0.85 0.12 85);
  --warning-foreground: oklch(0.20 0.03 85);
  --info: oklch(0.75 0.10 230);
  --info-foreground: oklch(0.20 0.03 230);

  /* Kanban status tokens - dark */
  --status-ready: oklch(0.78 0.15 145);
  --status-in-progress: oklch(0.75 0.12 250);
  --status-review: oklch(0.80 0.10 60);
  --status-verified: oklch(0.70 0.18 160);
  --status-paused: oklch(0.65 0.06 280);
  --status-blocked: oklch(0.60 0.18 20);
  --status-stuck: oklch(0.55 0.15 30);

  /* Agent status tokens - dark */
  --agent-idle: oklch(0.70 0.04 280);
  --agent-running: oklch(0.75 0.12 250);
  --agent-waiting: oklch(0.80 0.10 60);
  --agent-error: oklch(0.60 0.18 20);
}

@theme inline {
  /* Base colors */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* Chart colors */
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  /* Sidebar colors */
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* Custom colors */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);

  /* Kanban status colors */
  --color-status-ready: var(--status-ready);
  --color-status-in-progress: var(--status-in-progress);
  --color-status-review: var(--status-review);
  --color-status-verified: var(--status-verified);
  --color-status-paused: var(--status-paused);
  --color-status-blocked: var(--status-blocked);
  --color-status-stuck: var(--status-stuck);

  /* Agent status colors */
  --color-agent-idle: var(--agent-idle);
  --color-agent-running: var(--agent-running);
  --color-agent-waiting: var(--agent-waiting);
  --color-agent-error: var(--agent-error);

  /* Typography */
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  /* Radius */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* Shadows */
  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);

  /* Tracking */
  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-normal: var(--tracking-normal);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
}

body {
  letter-spacing: var(--tracking-normal);
}
```

---

## shadcn-svelte Components

> **🎯 BELANGRIJK: shadcn-svelte is EERSTE keus voor UI components**
>
> **VOORDAT je iets bouwt:**
>
> 1. Check of shadcn het component al heeft
> 2. Gebruik het shadcn component
> 3. Pas het aan met variants en props indien nodig
>
> **NOOIT:**
>
> - ❌ Een button component bouwen (gebruik `<Button>`)
> - ❌ Een dialog component bouwen (gebruik `<Dialog>`)
> - ❌ Een form element bouwen vanaf scratch (gebruik `<Form>`, `<Input>`, etc.)
> - ❌ Custom dropdown maken (gebruik `<DropdownMenu>`)
>
> **WEL:**
>
> - ✅ shadcn components importeren uit `$lib/components/ui/`
> - ✅ Componenten combineren voor complexere UI
> - ✅ Variants gebruiken voor verschillende stijlen
> - ✅ Props gebruiken voor gedrag aanpassingen

### Component Lijst

| Category | Components |
|----------|------------|
| **Layout** | Card, Separator, Resizable, Scroll Area, Sidebar |
| **Forms** | Button, Input, Textarea, Select, Checkbox, Radio Group, Switch, Slider, Form, Label |
| **Feedback** | Alert, Alert Dialog, Badge, Progress, Skeleton, Sonner (Toast) |
| **Overlay** | Dialog, Drawer, Dropdown Menu, Context Menu, Popover, Tooltip, Sheet |
| **Data** | Table, Data Table, Pagination, Tabs, Accordion, Collapsible |
| **Navigation** | Breadcrumb, Command, Menubar, Navigation Menu |
| **Date/Time** | Calendar, Date Picker, Range Calendar |
| **Misc** | Avatar, Aspect Ratio, Carousel, Hover Card, Toggle, Toggle Group |

### Shadcn Component Usage Examples

```svelte
<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
  import { Input } from '$lib/components/ui/input';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
</script>

<!-- ✅ CORRECT: Shadcn components met design tokens -->
<Card>
  <CardHeader>
    <CardTitle class="text-foreground">Settings</CardTitle>
  </CardHeader>
  <CardContent>
    <Input placeholder="Enter value" class="bg-background" />
    <Button variant="default" class="mt-4">Save</Button>
  </CardContent>
</Card>

<!-- ❌ WRONG: Custom divs in plaats van shadcn components -->
<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
  <h2 class="text-lg font-semibold text-gray-900">Settings</h2>
  <input type="text" placeholder="Enter value" class="w-full rounded border border-gray-300 px-3 py-2" />
  <button class="mt-4 rounded bg-purple-600 px-4 py-2 text-white">Save</button>
</div>
```

### Component Variants & Props

**Button variants:**

```svelte
<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Subtle</Button>
<Button variant="link">Link</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

**Card structure:**

```svelte
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>
```

### Custom Components (Wanneer maken?)

> **🎨 CUSTOM COMPONENTS - Alleen voor herbruikbare patterns**
>
> **WEL custom maken:**
>
> - ✅ Hero sections die op meerdere pagina's terugkomen
> - ✅ Feature grids met specifieke layout
> - ✅ Testimonial/quote cards
> - ✅ Pricing tables
> - ✅ Footer/header layouts
> - ✅ Dashboard widgets
>
> **NIET custom maken:**
>
> - ❌ Buttons, cards, inputs (shadcn heeft dit)
> - ❌ Modals, dropdowns (shadcn heeft dit)
> - ❌ Eenvoudige layouts (gebruik flex/grid directly)
>
> **WAAR PLAATSEN?**
>
> ```text
> src/lib/components/custom/[component-name].svelte
> ```
>
> **VOORBEELD:**
>
> ```svelte
> <!-- src/lib/components/custom/Hero.svelte -->
> <script lang="ts">
>   import { Button } from '$lib/components/ui/button';
>   import { cn } from '$lib/utils';
>
>   let { title, description, cta } = $props();
> </script>
>
> <section class={cn('py-20 px-4', 'bg-background')}>
>   <div class="mx-auto max-w-4xl text-center">
>     <h1 class={cn('text-4xl font-bold tracking-tight', 'text-foreground')}>
>       {title}
>     </h1>
>     <p class={cn('mt-4 text-lg', 'text-muted-foreground')}>
>       {description}
>     </p>
>     <div class="mt-8 flex justify-center gap-4">
>       <Button variant="default" size="lg">{cta.primary}</Button>
>       <Button variant="outline" size="lg">{cta.secondary}</Button>
>     </div>
>   </div>
> </section>
> ```

**BELANGRIJK:** Custom components MOETEN nog steeds:

- shadcn components gebruiken (niet zelf opnieuw bouwen)
- design tokens gebruiken (niet hardcoded colors)
- in `src/lib/components/custom/` staan

---

## Coding Conventions

### ✅ Toegestaan

```svelte
<div class="bg-background text-foreground">
<button class="bg-primary text-primary-foreground">
<span class="text-muted-foreground">
<div class="border-border">
<div class="bg-status-ready">
<span class="text-agent-running">
<div class="bg-success text-success-foreground">
```

### ❌ Verboden

```svelte
<div class="bg-white text-gray-900">
<button class="bg-purple-600 text-white">
<span class="text-slate-500">
<div class="border-gray-200">
<div class="bg-green-500">
```

### Nieuwe Token Toevoegen

Als een kleur ontbreekt:

1. Voeg toe aan `:root` en `.dark` in `routes/layout.css`
2. Voeg toe aan `@theme inline`
3. Gebruik in code

```css
/* Stap 1 & 2 */
:root {
  --new-token: oklch(...);
}
.dark {
  --new-token: oklch(...);
}
@theme inline {
  --color-new-token: var(--new-token);
}
```

```svelte
<!-- Stap 3 -->
<div class="bg-new-token">
```

---

## Dependencies

```json
 "scripts": {
  "dev": "vite dev",
  "build": "vite build",
  "preview": "vite preview",
  "prepare": "svelte-kit sync || echo ''",
  "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
  "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
  "test:unit": "vitest",
  "test": "npm run test:unit -- --run",
  "lint": "eslint . && prettier --check .",
  "format": "prettier --write ."
 },
 "devDependencies": {
  "@eslint/compat": "^1.4.0",
  "@eslint/js": "^9.39.1",
  "@inlang/paraglide-js": "^2.6.0",
  "@internationalized/date": "^3.10.0",
  "@lucide/svelte": "^0.561.0",
  "@sveltejs/adapter-node": "^5.4.0",
  "@sveltejs/kit": "^2.49.1",
  "@sveltejs/vite-plugin-svelte": "^6.2.1",
  "@tailwindcss/forms": "^0.5.10",
  "@tailwindcss/typography": "^0.5.19",
  "@tailwindcss/vite": "^4.1.17",
  "@tanstack/table-core": "^8.21.3",
  "@types/node": "^22",
  "@vitest/browser-playwright": "^4.0.15",
  "bits-ui": "^2.14.4",
  "clsx": "^2.1.1",
  "embla-carousel-svelte": "^8.6.0",
  "eslint": "^9.39.1",
  "eslint-config-prettier": "^10.1.8",
  "eslint-plugin-svelte": "^3.13.1",
  "formsnap": "^2.0.1",
  "globals": "^16.5.0",
  "layerchart": "2.0.0-next.43",
  "mode-watcher": "^1.1.0",
  "paneforge": "^1.0.2",
  "playwright": "^1.57.0",
  "prettier": "^3.7.4",
  "prettier-plugin-svelte": "^3.4.0",
  "prettier-plugin-tailwindcss": "^0.7.2",
  "svelte": "^5.45.6",
  "svelte-check": "^4.3.4",
  "svelte-sonner": "^1.0.7",
  "sveltekit-superforms": "^2.28.1",
  "tailwind-merge": "^3.4.0",
  "tailwind-variants": "^3.2.2",
  "tailwindcss": "^4.1.17",
  "tw-animate-css": "^1.4.0",
  "typescript": "^5.9.3",
  "typescript-eslint": "^8.48.1",
  "vaul-svelte": "^1.0.0-next.7",
  "vite": "^7.2.6",
  "vitest": "^4.0.15",
  "vitest-browser-svelte": "^2.0.1"
 },
 "dependencies": {
  "better-auth": "^1.4.10"
 }
```

---

## Utils

### `src/lib/utils/cn.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Checklist Update

Na dit document kun je afvinken:

- ✅ Project structure
- ✅ Styling (Tailwind v4)
- ✅ Component library (shadcn-svelte)
- ✅ Icons (Lucide)
