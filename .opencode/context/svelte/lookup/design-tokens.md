<!-- Context: svelte/lookup | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Lookup: Tailwind Design Tokens

**Purpose**: Design token rules and custom tokens.
**Last Updated**: 2026-02-12

---

## 3 Rules (CRITICAL)

1. **Use design tokens** (never hardcoded colors)
2. **Use shadcn components** (check existing first)
3. **Use cn()** for class merging

---

## Token Reference

### Semantic Tokens

| Token                | Usage              |
| -------------------- | ------------------ |
| `--background`       | Page background    |
| `--foreground`       | Primary text       |
| `--muted`            | Subtle backgrounds |
| `--muted-foreground` | Secondary text     |
| `--border`           | Borders, dividers  |
| `--ring`             | Focus rings        |
| `--primary`          | Primary actions    |
| `--secondary`        | Secondary actions  |

### Status Tokens

```css
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

--status-active: #22c55e;
--status-pending: #f59e0b;
--status-inactive: #6b7280;
```

---

## Forbidden vs Allowed

| ❌ Forbidden      | ✅ Allowed              |
| ----------------- | ----------------------- |
| `bg-white`        | `bg-background`         |
| `bg-black`        | `bg-foreground`         |
| `text-gray-500`   | `text-muted-foreground` |
| `border-gray-200` | `border-border`         |
| `bg-red-500`      | `bg-destructive`        |

---

## cn() Utility

```svelte
<script>
	import { cn } from '$lib/utils';

	interface Props {
		variant?: 'default' | 'outline';
		class?: string;
	}
	let { variant = 'default', class: className }: Props = $props();
</script>

<button
	class={cn(
		'rounded-md px-4 py-2 font-medium',
		variant === 'default' && 'bg-primary text-primary-foreground',
		variant === 'outline' && 'border border-input bg-background',
		className
	)}
>
	<slot />
</button>
```

---

## Common Patterns

```svelte
<!-- Card -->
<div class="rounded-lg border bg-card p-4 shadow-sm">

<!-- Muted section -->
<div class="bg-muted/50 rounded-md p-3">

<!-- Error state -->
<p class="text-destructive text-sm">

<!-- Success badge -->
<span class="bg-success/10 text-success rounded-full px-2 py-1 text-xs">
```

---

## Reference

- Related: [shadcn-reference.md](shadcn-reference.md), [visual-design.md](../concepts/visual-design.md)
