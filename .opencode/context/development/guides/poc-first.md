<!-- Context: development/guides | Priority: high | Version: 1.0 | Updated: 2026-02-12 -->

# Guide: PoC First (Proof of Concept)

**Purpose**: Prove it works before building the full solution.
**Audience**: Developers, AI agents

---

## Core Concept

Build minimal proof of concept first. Time-box 1-4 hours max. Validate assumptions before investing in full implementation.

---

## When to PoC

- New technology integration
- Complex algorithm
- Performance-critical code
- External API integration

---

## Workflow

```
┌──────────────────────────────────────────────────────────┐
│  1. SCOPE    → Define minimal success criteria           │
│  2. BUILD    → Quick, dirty implementation               │
│  3. VERIFY   → Does it work? Does it meet criteria?      │
│  4. DECIDE   → Continue, pivot, or abandon               │
│  5. POLISH   → Only if decision is "continue"            │
└──────────────────────────────────────────────────────────┘
```

---

## Rules

- Time-box 1-4 hours max
- No tests needed for PoC (yet)
- Throw away if needed - don't get attached
- Document learnings - even failed PoCs have value

---

## Red Flags (Avoid)

- "Let me build a complete solution first"
- "I need to architect the perfect system"
- Adding features nobody asked for

---

## Green Flags (Do)

- "Let me quickly prove this works"
- "I'll build the happy path first"
- "We can expand after validation"

---

## Reference

- Related: `development/guides/tdd-workflow.md`
