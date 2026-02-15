<!-- Context: project-intelligence/nav | Priority: critical | Version: 1.0 | Updated: 2026-02-12 -->

# Project Intelligence

> Technical patterns and standards for prompt-management. Agents: Load technical-domain.md for code generation.

## Quick Routes

| What You Need     | File                                       | Priority |
| ----------------- | ------------------------------------------ | -------- |
| **Code patterns** | [technical-domain.md](technical-domain.md) | critical |
| Build commands    | [AGENTS.md](/AGENTS.md)                    | -        |

## Tech Stack Summary

- **Framework**: SvelteKit 2.x + Svelte 5.x (runes)
- **Language**: TypeScript 5.x (strict)
- **Database**: libsql + Drizzle ORM
- **Styling**: Tailwind CSS 4.x
- **Validation**: Zod 4.x
- **Auth**: better-auth
- **Testing**: Vitest + Playwright

## Key Patterns (Quick Reference)

| Pattern    | Convention                                |
| ---------- | ----------------------------------------- |
| API routes | `+server.ts` with RequestHandler          |
| Components | Svelte 5 runes ($state, $props, $derived) |
| DB queries | Drizzle with soft delete (deletedAt)      |
| Validation | Zod safeParse() on all inputs             |
| Naming     | kebab-case files, PascalCase components   |

## Full Context

See `technical-domain.md` for complete patterns with code examples.

---

**Management**: Run `/add-context --update` when patterns change.
