# Phase 8: Snippet Library - Research

**Researched:** 2026-02-28
**Domain:** Template library management, CRUD operations, search/filter UI, template insertion
**Confidence:** HIGH

## Summary

The Snippet Library phase builds a standalone repository of reusable template fragments (snippets) separate from prompts. Each snippet can contain `{{VAR}}` placeholders (Phase 4 already implements variable extraction/resolution). The implementation requires: (1) a new `snippets` database table following the existing `prompts` pattern, (2) CRUD services and API endpoints matching existing conventions, (3) a browse/search UI modeled after the prompts list page, and (4) a snippet picker component for inserting snippets into prompt editors.

**Primary recommendation:** Follow the existing prompts architecture exactly: Drizzle SQLite schema with soft-delete, service layer in `src/lib/server/services/snippets.service.ts`, REST API in `src/routes/api/snippets/`, and UI pages in `src/routes/snippets/`. Reuse Phase 4's variable utilities (`extractVariables`, `resolveVariables`, `SnippetVariableSchema`).

## Standard Stack

### Core (Existing - Use These)

| Library       | Version | Purpose                        | Why Standard                   |
| ------------- | ------- | ------------------------------ | ------------------------------ |
| Drizzle ORM   | ^0.45.x | Database operations            | Existing DB layer              |
| Zod           | ^3.24.x | Request/response validation    | Used in all API endpoints      |
| Svelte 5      | ^5.x    | Reactive UI with runes         | Project standard               |
| yaml          | 2.8.2   | Frontmatter parsing            | Already used in frontmatter.ts |
| shadcn-svelte | latest  | UI components (Dialog, Button) | Existing component library     |
| lucide-svelte | latest  | Icons                          | Consistent with existing UI    |

### Supporting (Existing - Reuse from Phase 4)

| Utility                     | Location                                         | Purpose                          |
| --------------------------- | ------------------------------------------------ | -------------------------------- |
| `VARIABLE_REGEX`            | `$lib/utils/snippet-variables.ts`                | Extract {{VAR}} placeholders     |
| `SnippetVariableSchema`     | `$lib/utils/snippet-variables.ts`                | Validate variable definitions    |
| `extractVariables()`        | `$lib/utils/snippet-variables.ts`                | Parse placeholders from text     |
| `resolveVariables()`        | `$lib/utils/snippet-variables.ts`                | Replace placeholders with values |
| `escapeVariableValue()`     | `$lib/utils/snippet-variables.ts`                | Security: prevent injection      |
| `parseSnippetFrontmatter()` | `$lib/opencode/frontmatter.ts`                   | Parse variables from YAML        |
| `SnippetPreview` component  | `$lib/components/prompts/snippet-preview.svelte` | Live variable preview            |

### No New Dependencies Required

All functionality exists in current stack.

## Architecture Patterns

### Database Schema Pattern

Follow the existing `prompts` table pattern exactly:

```typescript
// src/lib/server/db/schema.ts (add to existing)

export const snippets = sqliteTable('snippets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	description: text('description'),
	content: text('content').notNull(),
	category: text('category'), // For grouping: "headers", "formatting", etc.
	tags: text('tags'), // JSON array for flexible tagging
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	deletedAt: integer('deleted_at', { mode: 'timestamp' })
});

export type Snippet = typeof snippets.$inferSelect;
export type NewSnippet = typeof snippets.$inferInsert;
```

### Service Layer Pattern

Follow existing `prompts.service.ts` pattern:

```typescript
// src/lib/server/services/snippets.service.ts

import { db } from '../db/client';
import { snippets, type NewSnippet, type Snippet } from '../db/schema';
import { eq, desc, asc, like, isNull, and, or } from 'drizzle-orm';

export async function createSnippet(data: NewSnippet): Promise<Snippet> {
	const [snippet] = await db.insert(snippets).values(data).returning();
	return snippet;
}

export async function getSnippet(id: number): Promise<Snippet | null> {
	const [snippet] = await db
		.select()
		.from(snippets)
		.where(and(eq(snippets.id, id), isNull(snippets.deletedAt)))
		.limit(1);
	return snippet || null;
}

export interface ListSnippetsResult {
	snippets: Snippet[];
	totalCount: number;
}

export async function listSnippets(
	limit = 100,
	offset = 0,
	search?: string,
	category?: string
): Promise<ListSnippetsResult> {
	const conditions = [isNull(snippets.deletedAt)];

	if (search) {
		conditions.push(
			or(
				like(snippets.title, `%${search}%`),
				like(snippets.description, `%${search}%`),
				like(snippets.content, `%${search}%`)
			)!
		);
	}

	if (category) {
		conditions.push(eq(snippets.category, category));
	}

	const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

	const allSnippets = await db
		.select()
		.from(snippets)
		.where(whereCondition)
		.orderBy(desc(snippets.updatedAt));

	return {
		snippets: allSnippets.slice(offset, offset + limit),
		totalCount: allSnippets.length
	};
}

export async function updateSnippet(id: number, data: Partial<NewSnippet>): Promise<Snippet> {
	const [updated] = await db
		.update(snippets)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(snippets.id, id))
		.returning();
	return updated;
}

export async function deleteSnippet(id: number): Promise<void> {
	// Soft delete (same pattern as prompts)
	await db.update(snippets).set({ deletedAt: new Date() }).where(eq(snippets.id, id));
}
```

### API Endpoint Pattern

Follow existing `/api/prompts` structure:

```typescript
// src/routes/api/snippets/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listSnippets, createSnippet } from '$lib/server/services/snippets.service';
import { z } from 'zod';
import { authenticateRequest, optionalAuthenticateRequest } from '$lib/server/auth/jwt';

const createSnippetSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	content: z.string().min(1).max(50000),
	category: z.string().optional(),
	tags: z.array(z.string()).optional()
});

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const search = url.searchParams.get('search') || undefined;
	const category = url.searchParams.get('category') || undefined;

	optionalAuthenticateRequest(event);

	try {
		const { snippets: snippetsList, totalCount } = await listSnippets(
			limit,
			offset,
			search,
			category
		);
		return json({
			data: { snippets: snippetsList, totalCount },
			pagination: { limit, offset, hasMore: snippetsList.length === limit }
		});
	} catch (err) {
		console.error('Failed to fetch snippets:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch snippets', errors: null }));
	}
};

export const POST: RequestHandler = async (event) => {
	const { request } = event;
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	authenticateRequest(event);

	const parsed = createSnippetSchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	const { tags, ...snippetData } = parsed.data;

	try {
		const snippet = await createSnippet({
			...snippetData,
			tags: tags && tags.length > 0 ? JSON.stringify(tags) : null
		});

		return json({ ...snippet }, { status: 201 });
	} catch (err) {
		console.error('Failed to create snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create snippet', errors: null }));
	}
};
```

### Snippet Picker Component Pattern

```svelte
<!-- src/lib/components/snippets/snippet-picker.svelte -->
<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Search, Plus, Copy } from 'lucide-svelte';
	import { extractVariables } from '$lib/utils/snippet-variables';
	import type { SnippetVariable } from '$lib/utils/snippet-variables';

	interface Snippet {
		id: number;
		title: string;
		description?: string | null;
		content: string;
		category?: string | null;
		tags?: string | null;
	}

	interface Props {
		open: boolean;
		onclose: () => void;
		onselect: (snippet: Snippet) => void;
	}

	let { open, onclose, onselect }: Props = $props();

	let searchQuery = $state('');
	let snippets = $state<Snippet[]>([]);
	let isLoading = $state(false);
	let selectedCategory = $state<string | null>(null);

	// Fetch snippets on mount and when search changes
	$effect(() => {
		if (open) {
			fetchSnippets();
		}
	});

	async function fetchSnippets() {
		isLoading = true;
		try {
			const params = new URLSearchParams();
			if (searchQuery) params.set('search', searchQuery);
			if (selectedCategory) params.set('category', selectedCategory);

			const response = await fetch(`/api/snippets?${params}`);
			if (response.ok) {
				const data = await response.json();
				snippets = data.data.snippets;
			}
		} catch (err) {
			console.error('Failed to fetch snippets:', err);
		} finally {
			isLoading = false;
		}
	}

	// Get unique categories from snippets
	let categories = $derived(() => {
		const cats = new Set<string>();
		for (const s of snippets) {
			if (s.category) cats.add(s.category);
		}
		return Array.from(cats);
	});

	function handleSelect(snippet: Snippet) {
		onselect(snippet);
		onclose();
	}

	function getPreview(content: string): string {
		// Show first 100 chars
		return content.length > 100 ? content.slice(0, 100) + '...' : content;
	}

	function getVariableCount(content: string): number {
		return extractVariables(content).length;
	}
</script>

<Dialog {open} onOpenChange={(open) => !open && onclose()}>
	<DialogContent class="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
		<DialogHeader>
			<DialogTitle>Insert Snippet</DialogTitle>
		</DialogHeader>

		<!-- Search -->
		<div class="relative">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				placeholder="Search snippets..."
				bind:value={searchQuery}
				oninput={() => fetchSnippets()}
				class="pl-9"
			/>
		</div>

		<!-- Category filters -->
		{#if categories().length > 0}
			<div class="flex flex-wrap gap-2">
				<Button
					variant={selectedCategory === null ? 'default' : 'outline'}
					size="sm"
					onclick={() => {
						selectedCategory = null;
						fetchSnippets();
					}}
				>
					All
				</Button>
				{#each categories() as category}
					<Button
						variant={selectedCategory === category ? 'default' : 'outline'}
						size="sm"
						onclick={() => {
							selectedCategory = category;
							fetchSnippets();
						}}
					>
						{category}
					</Button>
				{/each}
			</div>
		{/if}

		<!-- Snippets list -->
		<div class="flex-1 space-y-2 overflow-y-auto">
			{#if isLoading}
				<div class="py-8 text-center text-muted-foreground">Loading...</div>
			{:else if snippets.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					No snippets found. Create one first!
				</div>
			{:else}
				{#each snippets as snippet (snippet.id)}
					<button
						type="button"
						class="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
						onclick={() => handleSelect(snippet)}
					>
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="font-medium">{snippet.title}</div>
								{#if snippet.description}
									<div class="text-sm text-muted-foreground">{snippet.description}</div>
								{/if}
								<pre class="mt-2 rounded bg-muted p-2 text-xs">{getPreview(snippet.content)}</pre>
							</div>
							<div class="flex flex-col items-end gap-1">
								{#if snippet.category}
									<Badge variant="secondary">{snippet.category}</Badge>
								{/if}
								{#if getVariableCount(snippet.content) > 0}
									<Badge variant="outline">{getVariableCount(snippet.content)} vars</Badge>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			{/if}
		</div>
	</DialogContent>
</Dialog>
```

### Integration with Prompt Editor

```typescript
// In prompt editor component, add snippet insertion:

import SnippetPicker from '$lib/components/snippets/snippet-picker.svelte';

let showSnippetPicker = $state(false);
let cursorPosition = $state(0);

function handleSnippetSelect(snippet: Snippet) {
	// Insert at cursor position
	const before = content.slice(0, cursorPosition);
	const after = content.slice(cursorPosition);
	content = before + snippet.content + after;
}

// In template:
<Button variant="outline" onclick={() => showSnippetPicker = true}>
	<Copy class="mr-2 h-4 w-4" />
	Insert Snippet
</Button>

<SnippetPicker
	open={showSnippetPicker}
	onclose={() => showSnippetPicker = false}
	onselect={handleSnippetSelect}
/>
```

### Anti-Patterns to Avoid

- **Duplicating prompt-snippet relationship** - Don't create junction table unless snippets belong to specific prompts; snippets are standalone
- **Re-implementing variable extraction** - Use existing Phase 4 utilities
- **Complex nested snippet references** - Snippets should be flat, no `{{> include}}` style references
- **Server-side preview for every keystroke** - Already solved in Phase 4 with client-side `$derived`

## Don't Hand-Roll

| Problem             | Don't Build                  | Use Instead                            | Why                                |
| ------------------- | ---------------------------- | -------------------------------------- | ---------------------------------- |
| Variable extraction | Custom regex/parser          | `extractVariables()` from Phase 4      | Already tested, handles edge cases |
| Variable resolution | Custom replacement logic     | `resolveVariables()` from Phase 4      | Includes injection prevention      |
| Variable schema     | Custom validation            | `SnippetVariableSchema` from Phase 4   | Consistent Zod patterns            |
| Search filter logic | Custom filter implementation | `like()`, `or()` from Drizzle          | SQL injection protection           |
| Soft delete         | Hard delete or custom flag   | `deletedAt` column pattern             | Consistent with prompts            |
| Pagination          | Custom slice logic           | `limit`/`offset` URL params pattern    | Same as prompts list               |
| Debounced search    | Custom debounce              | `setTimeout` pattern from prompts page | Already implemented, works well    |

**Key insight:** This phase is mostly CRUD boilerplate following existing patterns. The unique value is the snippet picker component and integration with the prompt editor.

## Common Pitfalls

### Pitfall 1: Copying Snippets Instead of Referencing

**What goes wrong:** Users expect snippet changes to propagate to prompts where they were used
**Why it happens:** Inserting snippet content directly instead of storing a reference
**How to avoid:** Make it clear in UI that snippets are "inserted" (copied), not "linked". Consider adding "Insert as reference" as a future enhancement.
**Warning signs:** Users asking "why didn't my snippet update propagate?"

### Pitfall 2: Not Reusing Phase 4 Variable System

**What goes wrong:** Inconsistent variable handling between snippets and prompts
**Why it happens:** Building new variable extraction/resolution instead of reusing Phase 4
**How to avoid:** Import from `$lib/utils/snippet-variables.ts` for all variable operations
**Warning signs:** Different regex patterns, different escaping behavior

### Pitfall 3: Missing Category/Tag Organization

**What goes wrong:** Large snippet libraries become unmanageable
**Why it happens:** Not implementing categorization from the start
**How to avoid:** Include `category` and `tags` fields in schema, even if lightly used initially
**Warning signs:** Users creating "Work - Header - Email" style titles to organize

### Pitfall 4: No Preview Before Insertion

**What goes wrong:** Users insert wrong snippet, have to undo
**Why it happens:** Only showing snippet title in picker
**How to avoid:** Show content preview (first 100 chars) and variable count in picker
**Warning signs:** Frequent undo operations after snippet insertion

### Pitfall 5: Ignoring Cursor Position

**What goes wrong:** Snippet inserted at wrong location
**Why it happens:** Not tracking editor cursor position when picker opens
**How to avoid:** Capture cursor position before opening picker, insert at that position
**Warning signs:** Users manually moving cursor after insertion

## Code Examples

### Snippet List Page (following prompts pattern)

```svelte
<!-- src/routes/snippets/+page.svelte -->
<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Search, Plus, FileText } from 'lucide-svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let searchQuery = $state('');
	let snippets = $derived(data.snippets || []);

	function handleCreate() {
		goto('/snippets/new');
	}

	function handleEdit(snippet: any) {
		goto(`/snippets/${snippet.id}/edit`);
	}

	async function handleDelete(snippet: any) {
		if (!confirm(`Delete "${snippet.title}"?`)) return;

		await fetch(`/api/snippets/${snippet.id}`, { method: 'DELETE' });
		location.reload();
	}
</script>

<svelte:head>
	<title>Snippets - Prompt Wallet</title>
</svelte:head>

<div class="p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-semibold">Snippets</h1>
		<Button onclick={handleCreate}>
			<Plus class="mr-2 h-4 w-4" />
			Create Snippet
		</Button>
	</div>

	<div class="relative mb-4">
		<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input placeholder="Search snippets..." bind:value={searchQuery} class="pl-9" />
	</div>

	{#if snippets.length > 0}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each snippets as snippet (snippet.id)}
				<div class="rounded-lg border p-4 transition-colors hover:bg-muted/50">
					<h3 class="font-medium">{snippet.title}</h3>
					{#if snippet.description}
						<p class="mt-1 text-sm text-muted-foreground">{snippet.description}</p>
					{/if}
					<pre class="mt-2 overflow-hidden rounded bg-muted p-2 text-xs text-ellipsis">
						{snippet.content.slice(0, 100)}{snippet.content.length > 100 ? '...' : ''}
					</pre>
					<div class="mt-3 flex gap-2">
						<Button size="sm" variant="outline" onclick={() => handleEdit(snippet)}>Edit</Button>
						<Button size="sm" variant="destructive" onclick={() => handleDelete(snippet)}>
							Delete
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="py-16 text-center">
			<FileText class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
			<h3 class="mb-2 text-lg font-semibold">No snippets yet</h3>
			<p class="mb-4 text-muted-foreground">Create reusable template fragments</p>
			<Button onclick={handleCreate}>Create Your First Snippet</Button>
		</div>
	{/if}
</div>
```

### Snippet with Variables (YAML Frontmatter)

```yaml
# Example snippet with variable definitions in frontmatter
category: email-headers
tags:
  - professional
  - business
variables:
  - name: RECIPIENT_NAME
    description: Name of the email recipient
    required: true
  - name: SENDER_NAME
    description: Your name
    default: Support Team
    required: false
---
Dear {{RECIPIENT_NAME}},

Thank you for reaching out. We appreciate your patience.

Best regards,
{{SENDER_NAME}}
```

## State of the Art

| Old Approach           | Current Approach           | When Changed | Impact                     |
| ---------------------- | -------------------------- | ------------ | -------------------------- |
| Snippets in prompts    | Standalone snippet library | This phase   | Reusability across prompts |
| Copy-paste templates   | Snippet picker with search | This phase   | Faster template reuse      |
| Manual variable typing | Live preview with vars     | Phase 4      | Immediate feedback         |

**Deprecated/outdated:**

- Storing snippets as files: Use database for searchability and version control
- Complex snippet inheritance: Keep snippets flat and composable

## Open Questions

1. **Snippet versioning?**
   - What we know: Prompts have version history via `promptVersions` table
   - What's unclear: Should snippets have similar versioning?
   - Recommendation: Start without versioning. Add if users request it. Snippets are simpler than prompts.

2. **Snippet sharing across users?**
   - What we know: Current system has user authentication
   - What's unclear: Should snippets be user-scoped or global?
   - Recommendation: Start with user-scoped (like prompts). Global snippets would require Phase 11 security review.

3. **Snippet categories - predefined or freeform?**
   - What we know: Using freeform string `category` field
   - What's unclear: Should we provide a predefined list?
   - Recommendation: Freeform for flexibility. Can add suggestions from popular categories later.

4. **Insert with variable prompts?**
   - What we know: Snippets can have `{{VAR}}` placeholders
   - What's unclear: When inserting, should we show variable input form?
   - Recommendation: Yes - show SnippetPreview component in picker before insertion, collect variable values, insert resolved content.

## Key Decisions for Planner

1. **Snippets table** - New table with same pattern as `prompts` (soft delete, timestamps)
2. **Variable reuse** - Import from Phase 4, don't reimplement
3. **Category field** - Single string field for grouping (not a separate table)
4. **Tags** - JSON array field (same as prompts)
5. **Snippet picker** - Dialog component with search, preview, and variable input
6. **Insertion behavior** - Copy content to prompt (not reference/link)
7. **API structure** - Follow `/api/prompts` pattern exactly

## Implementation Notes

### Plan 08-01: Snippet Library CRUD and Schema

1. Add `snippets` table to `schema.ts`
2. Create `snippets.service.ts` with CRUD operations
3. Create API endpoints:
   - `GET /api/snippets` - list with search/filter
   - `POST /api/snippets` - create
   - `GET /api/snippets/[id]` - get single
   - `PATCH /api/snippets/[id]` - update
   - `DELETE /api/snippets/[id]` - soft delete
4. Generate and run migration
5. Add unit tests for service functions

### Plan 08-02: Snippet Browser UI with Search

1. Create `/snippets` routes:
   - `+page.svelte` - list page
   - `+page.server.ts` - load snippets
   - `/new/+page.svelte` - create page
   - `/[id]/edit/+page.svelte` - edit page
2. Create snippet card component
3. Implement search with URL params (like prompts page)
4. Add category filter sidebar
5. Add E2E tests for CRUD operations

### Plan 08-03: Snippet Insertion into Prompts

1. Create `SnippetPicker.svelte` component:
   - Dialog with search input
   - Category filter buttons
   - Snippet list with preview
   - Variable input form (reuse SnippetPreview)
2. Integrate with prompt editor:
   - Add "Insert Snippet" button
   - Track cursor position
   - Insert resolved content at cursor
3. Add keyboard shortcut (Cmd+Shift+S)
4. Add E2E tests for insertion flow

## Sources

### Primary (HIGH confidence)

- Existing codebase - `prompts.service.ts`, `prompts` schema, `/api/prompts` endpoints
- Phase 4 research - `.planning/phases/04-snippet-variables/04-RESEARCH.md`
- Context7 `/websites/orm_drizzle_team` - SQLite `ilike`, pagination patterns
- Context7 `/websites/svelte_dev_kit` - URL search params, `goto()` patterns

### Secondary (MEDIUM confidence)

- GitHub search - SQLite snippet table patterns from other projects

### Tertiary (LOW confidence)

- None required - patterns well-established in existing codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All dependencies already in use
- Architecture: HIGH - Following existing prompts pattern exactly
- Pitfalls: HIGH - Common CRUD issues well-understood
- Integration: MEDIUM - Snippet picker UI needs validation with users

**Research date:** 2026-02-28
**Valid until:** 30 days (stable patterns)
