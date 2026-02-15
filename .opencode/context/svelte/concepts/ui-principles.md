<!-- Context: svelte/concepts | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Concept: UI/UX Principles

**Purpose**: Core design principles for good user interfaces.
**Last Updated**: 2026-02-12

---

## Core Concept

Good UI follows visual hierarchy, proximity, contrast, and whitespace. Users should instantly understand what's important and how to act.

---

## Key Principles

### 1. Visual Hierarchy (Size > Color > Weight > Position)

```
Visual Priority:
  Title (24px bold)        ← Most important
  Subtitle (16px medium)   ← Secondary
  Body (14px regular)      ← Tertiary
  Caption (12px)           ← Least important
```

### 2. Proximity

- **12px**: Label to input, related items
- **24px**: Between logical groups
- **32px+**: Unrelated sections

### 3. Contrast

Use multiple types together:

- Color (primary vs muted)
- Weight (bold vs regular)
- Size (large vs small)
- Shadows/Borders (elevated vs flat)

### 4. Whitespace

- Base unit: **4px**
- Work in multiples: 4, 8, 12, 16, 24, 32, 48, 64
- Don't crowd - whitespace is not wasted space

### 5. Alignment

- **Left**: Text content, form labels
- **Right**: Numbers, prices, counts
- **Center**: Titles, icons, short buttons

### 6. Consistency

- Same border radius everywhere
- Same button heights
- Same card styles
- Same spacing patterns

---

## Quick Checklist

- [ ] Most important element stands out?
- [ ] Related items grouped close?
- [ ] Enough whitespace between sections?
- [ ] Alignment consistent?
- [ ] Dark mode tested?

---

## Reference

- Related: [visual-design.md](visual-design.md), [design-tokens.md](../lookup/design-tokens.md)
