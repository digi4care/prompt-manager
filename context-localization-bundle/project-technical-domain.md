<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.0 | Updated: 2026-02-12 -->

# Technical Domain

**Purpose**: Tech stack, architecture, and coding patterns for prompt-management.
**Last Updated**: 2026-02-12

## Quick Reference

- **Update Triggers**: Tech stack changes | New patterns | Architecture decisions
- **Audience**: Developers, AI agents

---

## Primary Stack

| Layer      | Technology      | Version | Rationale                                   |
| ---------- | --------------- | ------- | ------------------------------------------- |
| Framework  | SvelteKit       | 2.x     | File-based routing, SSR/SSG, full-stack     |
| Runtime    | Svelte          | 5.x     | Runes ($state, $derived), compiled, minimal |
| Language   | TypeScript      | 5.x     | Type safety, strict mode                    |
| Database   | libsql (SQLite) | -       | Embedded, zero-config, Turso compatible     |
| ORM        | Drizzle ORM     | 0.45    | Type-safe SQL, lightweight, migrations      |
| Styling    | Tailwind CSS    | 4.x     | Utility-first, CSS-first config             |
| Validation | Zod             | 4.x     | Runtime type validation, schema inference   |
| Auth       | better-auth     | 1.x     | Session-based, multi-provider               |
| Unit Tests | Vitest          | 4.x     | Fast, ESM-native, coverage                  |
| E2E Tests  | Playwright      | 1.x     | Cross-browser, reliable                     |

---

## Code Patterns

### API Endpoint (+server.ts)

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { authenticateRequest } from '$lib/server/auth';

const createSchema = z.object({
	title: z.string().min(1).max(200),
	content: z.string().min(1)
});

export const POST: RequestHandler = async (event) => {
	const userId = await authenticateRequest(event);
	const body = await event.request.json();

	const parsed = createSchema.safeParse(body);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({
				message: 'Validation failed',
				errors: parsed.error.flatten()
			})
		);
	}

	try {
		const result = await createPrompt(parsed.data);
		console.log(`[AUDIT] User ${userId} created prompt ${result.id}`);
		return json({ data: result }, { status: 201 });
	} catch (err) {
		console.error('Failed to create prompt:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create prompt' }));
	}
};
```

**Key patterns**: RequestHandler type, Zod safeParse, authenticateRequest, json() with status, error() with JSON body, audit logging.

### Component (Svelte 5)

```svelte
<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Prompt } from '$lib/server/db/schema';

	interface Props {
		prompt: Prompt;
		onedit?: (id: number) => void;
		class?: string;
	}

	let { prompt, onedit, class: className }: Props = $props();
	let isExpanded = $state(false);
	let wordCount = $derived(prompt.content.split(/\s+/).length);
</script>

<article class={cn('rounded-lg border p-4', className)}>
	<h3>{prompt.title}</h3>
	<p>{wordCount} words</p>
	<button onclick={() => onedit?.(prompt.id)}>Edit</button>
</article>
```

**Key patterns**: Props interface, $props(), $state(), $derived(), optional callbacks with `?.()`, cn() for classes.

### Service Layer (Drizzle)

```typescript
import { db } from '../db/client';
import { prompts, type NewPrompt, type Prompt } from '../db/schema';
import { eq, isNull, and } from 'drizzle-orm';

export async function getPrompt(id: number): Promise<Prompt | null> {
	const [prompt] = await db
		.select()
		.from(prompts)
		.where(and(eq(prompts.id, id), isNull(prompts.deletedAt)))
		.limit(1);
	return prompt || null;
}

export async function deletePrompt(id: number): Promise<void> {
	// Soft delete pattern
	await db.update(prompts).set({ deletedAt: new Date() }).where(eq(prompts.id, id));
}
```

**Key patterns**: Import db/schema, explicit return types, soft delete with deletedAt, null returns.

---

## Naming Conventions

| Type             | Convention  | Example                                     |
| ---------------- | ----------- | ------------------------------------------- |
| Files (TS)       | kebab-case  | `prompts.service.ts`, `auth.guard.ts`       |
| Files (Svelte)   | kebab-case  | `prompt-card.svelte`, `user-profile.svelte` |
| Components       | PascalCase  | `PromptCard`, `UserProfile`                 |
| Functions        | camelCase   | `createPrompt`, `getPromptById`             |
| Constants        | UPPER_SNAKE | `RATE_LIMIT_MAX_REQUESTS`                   |
| Database tables  | snake_case  | `prompts`, `llm_providers`                  |
| Database columns | snake_case  | `created_at`, `deleted_at`                  |

---

## Code Standards

1. **TypeScript strict mode** - noImplicitAny, strictNullChecks enabled
2. **Validate with Zod** - all API inputs use safeParse()
3. **Drizzle ORM** - type-safe queries, no raw SQL unless necessary
4. **Soft delete** - use `deletedAt` column, never hard delete
5. **Error handling** - try/catch with console.error, JSON error responses
6. **Return null** - for not found, not undefined
7. **Prettier formatting** - tabs, single quotes, no trailing commas, 100 char width

---

## Security Requirements

1. **Input validation** - All user input validated with Zod schemas
2. **Authentication** - JWT/better-auth for all protected routes
3. **Soft delete** - Prevents accidental data loss
4. **Audit logging** - Log security events (auth failures, rate limits)
5. **Error sanitization** - No stack traces in production responses
6. **Rate limiting** - In-memory Map with window-based tracking

---

## Project Structure

```
src/
├── routes/              # SvelteKit file-based routing
│   ├── api/            # REST endpoints (+server.ts)
│   └── (app)/          # Page routes (+page.svelte)
├── lib/
│   ├── components/     # Svelte components (ui/, layout/, features)
│   ├── server/
│   │   ├── db/        # Drizzle schema, client, migrations
│   │   ├── services/  # Business logic layer
│   │   └── auth.ts    # Authentication helpers
│   └── utils.ts       # Shared utilities (cn, etc.)
├── app.css             # Global styles + Tailwind
└── app.html            # HTML template
```

---

## 📂 Codebase References

| Pattern   | Location                                        | Description              |
| --------- | ----------------------------------------------- | ------------------------ |
| API CRUD  | `src/routes/api/prompts/+server.ts`             | Full REST implementation |
| Component | `src/lib/components/prompts/prompt-card.svelte` | Svelte 5 patterns        |
| Service   | `src/lib/server/services/prompts.service.ts`    | Drizzle queries          |
| Schema    | `src/lib/server/db/schema.ts`                   | All table definitions    |
| Auth      | `src/lib/server/auth.ts`                        | Request authentication   |
| Config    | `package.json`, `tsconfig.json`, `.prettierrc`  | Tooling config           |

---

## Commands & Related Files

`npm run dev` (port 45678) | `npm run test` (Vitest) | `npm run check` (types) | `npm run lint`

- AI settings testing context (lazy-load first): `docs/plans/ai-settings-architecture/test/TEST_STRATEGY.md`
- Additional AI settings test docs (load on demand): `docs/plans/ai-settings-architecture/test/`

- [Navigation](navigation.md) - Quick overview | [AGENTS.md](/AGENTS.md) - Full commands
