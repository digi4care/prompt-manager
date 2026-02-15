<!-- Context: development/lookup | Priority: critical | Version: 1.0 | Updated: 2026-02-12 -->

# Checklist: Quality Gates

**Purpose**: Must pass before every commit.
**Audience**: Developers, AI agents

---

## Before Every Commit

- [ ] Tests written FIRST (TDD)
- [ ] All tests pass
- [ ] No console errors
- [ ] Visual check in browser (frontend)
- [ ] Code follows SOLID
- [ ] Code is simple (KISS)

---

## Code Review Checklist

- [ ] Is it the simplest solution? (KISS)
- [ ] Does each function have one responsibility? (SRP)
- [ ] Can this be extended without modification? (OCP)
- [ ] Are dependencies injected? (DIP)
- [ ] Are there tests? Were they written first? (TDD)

---

## Anti-Patterns to Avoid

| Anti-Pattern           | What It Looks Like              |
| ---------------------- | ------------------------------- |
| Big Design Up Front    | Weeks of planning before coding |
| Gold Plating           | Adding "nice to have" features  |
| Copy-Paste Driven      | Duplicating code everywhere     |
| No Testing             | "I'll test later"               |
| Skip Browser Check     | Only reading code               |
| Premature Optimization | "Let me optimize first"         |

---

## Reference

- Related: `development/guides/tdd-workflow.md`
- Related: `development/lookup/frontend-qa-checklist.md`
