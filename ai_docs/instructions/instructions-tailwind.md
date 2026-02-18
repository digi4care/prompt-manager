# Tailwind v4 Setup & Design System Guidelines

> **🚨 CRITICAL - ALTIJD DIT BESTAND LEZEN VOOR CODE SCHRIJVEN**

Dit project gebruikt **shadcn-svelte** design tokens. Alle styling moet met deze tokens.

---

## ✅ Geldige Design Tokens

Dit zijn de ENIGE tokens die je mag gebruiken:

### Kleuren (shadcn tokens)

| Token                    | Gebruik                    |
| ------------------------ | -------------------------- |
| `background`             | Hoofd achtergrond          |
| `foreground`             | Hoofd tekst                |
| `card`                   | Card achtergrond           |
| `card-foreground`        | Card tekst                 |
| `muted`                  | Subtiele achtergrond       |
| `muted-foreground`       | Subtiele tekst             |
| `border`                 | Randen                     |
| `input`                  | Input velden               |
| `primary`                | Primaire acties (blauw)    |
| `primary-foreground`     | Tekst op primary           |
| `secondary`              | Secundaire acties (grijs)  |
| `secondary-foreground`   | Tekst op secondary         |
| `accent`                 | Accent kleur               |
| `accent-foreground`      | Tekst op accent            |
| `destructive`            | Destructieve acties (rood) |
| `destructive-foreground` | Tekst op destructive       |

### Overige

| Token                                 | Gebruik     |
| ------------------------------------- | ----------- |
| `shadow-sm`, `shadow-md`, `shadow-lg` | Schaduwen   |
| `radius-sm`, `radius-md`, `radius-lg` | Rand radius |

---

## ❌ Verboden

**NOOIT gebruiken:**

```svelte
<!-- ❌ WRONG - hardcoded kleuren -->
<div class="bg-white text-gray-900">
<div class="bg-green-500 text-white">
<div class="bg-red-600">
<div class="text-slate-500">
<div class="border-gray-200">

<!-- ❌ WRONG - custom tokens die niet bestaan -->
<div class="bg-success">
<div class="bg-status-ready">
<div class="text-agent-running">
<div class="bg-surface-0">

<!-- ❌ WRONG - opacity modifiers -->
<div class="bg-primary/50">
<div class="text-foreground/30">
```

---

## ✅ Correct Voorbeeld

```svelte
<!-- ✅ CORRECT - shadcn tokens -->
<div class="bg-background text-foreground">
<div class="bg-card border-border">
<div class="bg-muted text-muted-foreground">

<!-- Primary button - gebruik Button component -->
<Button variant="default">Primary</Button>

<!-- Secondary button -->
<Button variant="secondary">Secondary</Button>

<!-- Destructive button -->
<Button variant="destructive">Delete</Button>

<!-- Card voorbeeld -->
<Card>
  <CardHeader>
    <CardTitle class="text-foreground">Titel</CardTitle>
    <CardDescription class="text-muted-foreground">Beschrijving</CardDescription>
  </CardHeader>
  <CardContent>
    <p class="text-foreground">Content</p>
  </CardContent>
</Card>
```

---

## Badge Variants

Alleen deze variants zijn beschikbaar:

```svelte
<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
```

---

## Status Weergave

Gebruik primary/destructive voor status:

```svelte
<!-- Connected / Actief -->
<Badge variant="default">Connected</Badge>

<!-- Not Connected / Inactief -->
<Badge variant="destructive">Disconnected</Badge>

<!-- Of met tekst kleur -->
<span class="text-primary">Actief</span>
<span class="text-destructive">Error</span>
```

---

## Belangrijk

1. **Geen custom kleuren toevoegen** - alleen shadcn tokens
2. **Dark mode werkt automatisch** - tokens passen zich aan
3. **Gebruik shadcn components** - Button, Card, Badge, etc.
4. **Geen opacity** - `bg-primary/50` werkt niet goed

---

## Component Library

Gebruik deze shadcn-svelte components:

```
src/lib/components/ui/
├── button/
├── badge/
├── card/
├── input/
├── dialog/
├── dropdown-menu/
└── ...
```

Import voorbeeld:

```svelte
import {Button} from '$lib/components/ui/button'; import {(Card,
CardHeader,
CardTitle,
CardContent)} from '$lib/components/ui/card';
```

## LLM TXT Shadcn Docs

[Documentatie](https://shadcn-svelte.com/llms.txt)
