<!-- Context: svelte/concepts | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Concept: Visual Design Rules

**Purpose**: Color, typography, and alignment rules for consistent design.
**Last Updated**: 2026-02-12

---

## Core Concept

Color, typography, and alignment create consistency. Stick to conventions and design tokens. Never hardcode values.

---

## Color Rules

### Use Design Tokens (Never Hardcode)

```css
/* ✅ CORRECT */
background: var(--bg-secondary);
color: var(--text-muted);
border-color: var(--border);

/* ❌ WRONG */
background: #f5f5f5;
color: #666;
border-color: #ddd;
```

### Semantic Colors

| Token       | Usage                           |
| ----------- | ------------------------------- |
| `--success` | Positive actions, confirmations |
| `--warning` | Caution, pending states         |
| `--error`   | Errors, destructive actions     |
| `--info`    | Information, tips               |

### Status Colors

```css
--status-active: #22c55e;
--status-pending: #f59e0b;
--status-inactive: #6b7280;
--status-error: #ef4444;
```

---

## Typography Rules

- **Max 2 fonts**: One for body, one for headings (optional)
- **Body size**: 16px minimum
- **Line length**: 45-75 characters per line (desktop)
- **Line height**: 1.5 for body, 1.2 for headings

### Scale

```
text-xs    = 12px (captions, badges)
text-sm    = 14px (secondary text)
text-base  = 16px (body)
text-lg    = 18px (emphasis)
text-xl    = 20px (subheadings)
text-2xl   = 24px (headings)
text-3xl+  = titles
```

---

## Alignment Rules

- **Consistent padding**: Same padding on all sides of similar elements
- **Matching heights**: All buttons same height, all inputs same height
- **Grid alignment**: Use CSS Grid for complex layouts

---

## Dark Mode

Always test in dark mode:

- Ensure contrast is sufficient
- Check all semantic colors
- Verify focus states are visible

---

## Reference

- Related: [ui-principles.md](ui-principles.md), [design-tokens.md](../lookup/design-tokens.md)
