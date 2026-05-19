# Coding Conventions

**Analysis Date:** 2026-02-14

## Naming Patterns

**Files:**

- TypeScript files: lowercase with dashes (e.g., `prompts.service.ts`, `jwt.ts`)
- Svelte components: lowercase with dashes (e.g., `prompt-editor.svelte`, `judge-results.svelte`)
- Test files: lowercase with dashes, `.test.ts` or `.spec.ts` suffix (e.g., `prompts.test.ts`, `prompts.spec.ts`)
- Barrel files: `index.ts` for re-exporting modules

**Functions:**

- camelCase for all functions (e.g., `createPrompt`, `listPrompts`, `fetchApi`)
- Async functions: same convention, no `async` prefix in name
- Private methods: no underscore prefix, just camelCase
- Helper functions: descriptive verbs (e.g., `getScoreColor`, `countWords`, `formatScore`)

**Variables:**

- camelCase for all variables (e.g., `promptsList`, `totalCount`, `searchParams`)
- Constants: UPPER_SNAKE_CASE for config values (e.g., `RATE_LIMIT_MAX_REQUESTS`)
- State variables in Svelte: camelCase (e.g., `loading`, `selectedPrompt`)

**Types/Interfaces:**

- PascalCase for interfaces and types (e.g., `Prompt`, `CreatePromptInput`, `ListPromptsResult`)
- Input types: suffixed with `Input` (e.g., `CreatePromptInput`, `UpdatePromptInput`)
- Result types: suffixed with `Result` (e.g., `ListPromptsResult`)
- Props interface in Svelte: named `Props`

```typescript
// Example interface naming
export interface Prompt { ... }
export interface CreatePromptInput { ... }
export interface ListPromptsResult { ... }
```

## Code Style

**Formatting:**

- Tool: Prettier with `prettier-plugin-svelte` and `prettier-plugin-tailwindcss`
- Indentation: Tabs
- Quotes: Single quotes for strings
- Trailing commas: None
- Print width: 100 characters
- Config: `.prettierrc`

**Linting:**

- Tool: ESLint with flat config format (`eslint.config.js`)
- Extends: `@eslint/js`, `typescript-eslint`, `eslint-plugin-svelte`
- TypeScript handles undefined variable checks (`no-undef: off`)
- Svelte files use project service for type checking

## Import Organization

**Order:**

1. External libraries (SvelteKit, Node, npm packages)
2. `$lib` alias imports
3. Relative imports (same directory or parent)

**Path Aliases:**

- `$lib` → `src/lib`
- `$app` → SvelteKit app module

```typescript
// Example import order
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

import { listPrompts, createPrompt } from '$lib/server/services/prompts.service';
import { createVersion } from '$lib/server/services/versions.service';
import { optionalAuthenticateRequest, authenticateRequest } from '$lib/server/auth/jwt';
```

**Barrel Exports:**

- Use `index.ts` files for re-exporting components
- Example: `src/lib/components/ui/button/index.ts`

## Error Handling

**Server Routes:**

- Use `throw error(status, message)` from `@sveltejs/kit`
- Wrap async operations in try-catch blocks
- Log errors with `console.error()` including context
- Return JSON error format: `{ message: string, errors: unknown | null }`

```typescript
// Server error pattern
try {
	const result = await db.insert(prompts).values(data).returning();
	return json(result);
} catch (err) {
	console.error('Failed to create prompt:', err);
	throw error(500, JSON.stringify({ message: 'Failed to create prompt', errors: null }));
}
```

**Validation:**

- Use Zod schemas with `safeParse()` for request validation
- Return validation errors using `parsed.error.flatten()`

```typescript
const createPromptSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	content: z.string().min(1).max(50000)
});

const parsed = createPromptSchema.safeParse(data);
if (!parsed.success) {
	throw error(
		400,
		JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
	);
}
```

**Client Stores:**

- Store error messages in state: `error = $state<string | null>(null)`
- Clear errors before operations, set on failure
- Throw errors after setting state for caller handling

## Logging

**Framework:** Console (no external logging service detected)

**Patterns:**

- Use `console.error()` for errors with context
- Use `console.log()` with `[AUDIT]` prefix for security events
- Include relevant identifiers in log messages

```typescript
// Audit logging pattern
console.log(`[AUDIT] User ${user.userId} (${user.email}) created prompt: ${promptData.title}`);

// Error logging pattern
console.error('Failed to fetch prompts:', err);
```

## Comments

**When to Comment:**

- JSDoc comments for public API functions and class methods
- Inline comments for complex logic or workarounds
- Section headers with `// ======` separators for file organization

**JSDoc/TSDoc:**

- Use for documenting function purpose and parameters
- Include `@returns` for non-void functions

```typescript
/**
 * Fetch all prompts with optional pagination and search
 */
async fetchPrompts(params?: PaginationParams): Promise<void> { ... }
```

## Function Design

**Size:** Functions should be focused and single-purpose. Large functions are acceptable if cohesive.

**Parameters:**

- Use interfaces for objects with multiple properties
- Optional parameters with `?` suffix
- Destructure in function signature when appropriate

```typescript
// Good: interface for complex params
async function listPrompts(
	limit = 100,
	offset = 0,
	search?: string,
	tags?: string[],
	sortField: SortField = 'updatedAt',
	sortDirection: SortDirection = 'desc'
): Promise<ListPromptsResult>;
```

**Return Values:**

- Explicit return types on public functions
- Use `Promise<T>` for async functions
- Return `null` for not found cases (not `undefined`)
- Use `| null` in return type when null is possible

```typescript
// Good: explicit return type with null possibility
export async function getPrompt(id: number): Promise<Prompt | null> {
	const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
	return prompt || null;
}
```

## Module Design

**Exports:**

- Named exports preferred for utility functions
- Default exports for page components and routes
- Export types alongside implementations

```typescript
// Named exports for services
export async function createPrompt(data: NewPrompt): Promise<Prompt> { ... }
export async function getPrompt(id: number): Promise<Prompt | null> { ... }

// Type exports
export type { Prompt, NewPrompt } from './schema';
```

**Barrel Files:**

- Use `index.ts` to re-export from directories
- Group related exports together

```typescript
// src/lib/components/improvement/index.ts
export { default as JudgeResults } from './judge-results.svelte';
export { default as VariantComparison } from './VariantComparison.svelte';
export { default as ImprovementPanel } from './improvement-panel.svelte';
```

## Svelte 5 Patterns

**Runes:**

- Use `$state()` for reactive state
- Use `$derived()` for computed values
- Use `$props()` for component props
- Use `$effect()` for side effects

```typescript
// State
let prompts = $state<Prompt[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

// Derived
let wordCount = $derived(countWords(value));
let hasPrompts = $derived(prompts.length > 0);

// Props with defaults
let { value = $bindable(''), onchange, class: className = '' }: Props = $props();

// Effects
$effect(() => {
	if (editor && value !== editor.getValue()) {
		editor.setValue(value);
	}
});
```

**Event Handlers:**

- Use lowercase event names: `onclick`, `onchange` (no "on" prefix in HTML attributes)
- Optional chaining for callback props: `onchange?.(newValue)`

**Bindable Props:**

- Use `$bindable()` for two-way binding
- Provide default values: `value = $bindable('')`

## Database Operations (Drizzle ORM)

**Patterns:**

- Import schema from `$lib/server/db/schema`
- Use `returning()` for insert/update to get created/updated records
- Soft delete pattern: Use `deletedAt` column instead of hard delete
- Use `isNull()` for checking non-deleted records

```typescript
// Insert with returning
const [prompt] = await db.insert(prompts).values(data).returning();

// Soft delete
await db.update(prompts).set({ deletedAt: new Date() }).where(eq(prompts.id, id));

// Query non-deleted
const results = await db.select().from(prompts).where(isNull(prompts.deletedAt));
```

**Type Inference:**

- Use `$inferSelect` for select types
- Use `$inferInsert` for insert types

```typescript
export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
```

## API Design

**Request Handling:**

- Use Zod schemas for validation
- Consistent response format with `json()` helper
- Pagination: `{ data, pagination: { limit, offset, hasMore } }`
- Authentication: JWT-based with `authenticateRequest()` helper

```typescript
// Pagination response pattern
return json({
	data: { prompts: promptsList, totalCount },
	pagination: { limit, offset, hasMore: promptsList.length === limit }
});
```

**Authentication:**

- `authenticateRequest(event)` - Required auth, throws on failure
- `optionalAuthenticateRequest(event)` - Optional auth, returns user or null

---

_Convention analysis: 2026-02-14_
