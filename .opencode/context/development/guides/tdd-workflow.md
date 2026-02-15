<!-- Context: development/guides | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Guide: TDD Workflow

**Purpose**: Test-Driven Development methodology - write tests first, always.
**Audience**: Developers, AI agents

---

## Core Concept

Red → Green → Refactor. Write a failing test first, write minimal code to pass, then clean up while tests stay green.

---

## Key Points

- No code without a failing test
- Write simplest code to pass (YAGNI)
- Refactor only when tests are green
- One assertion per test when possible

---

## Workflow

```
┌─────────────────────────────────────────────────┐
│  1. RED      → Write a failing test             │
│  2. GREEN    → Write MINIMAL code to pass       │
│  3. REFACTOR → Clean up while keeping green     │
│  4. REPEAT   → Next feature/edge case           │
└─────────────────────────────────────────────────┘
```

---

## Example Flow

```bash
# Step 1: RED - Write failing test
test("formatCurrency returns formatted string", () => {
  expect(formatCurrency(1234.5)).toBe("$1,234.50")
})
# Result: FAIL - formatCurrency not defined

# Step 2: GREEN - Minimal implementation
function formatCurrency(amount: number): string {
  return "$" + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}
# Result: PASS

# Step 3: REFACTOR - Improve if needed (tests still pass)
```

---

## Red Flags (Avoid)

- Writing code before tests
- Skipping tests "just this once"
- Writing complex implementation before simple one passes

---

## Reference

- Kent Beck - Test-Driven Development
- Related: `development/lookup/quality-gates.md`
