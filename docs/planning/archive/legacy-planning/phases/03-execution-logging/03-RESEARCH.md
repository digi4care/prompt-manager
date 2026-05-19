# Phase 3: Execution Logging - Research

**Researched:** 2026-02-26
**Domain:** Audit logging, async database operations, history UI
**Confidence:** HIGH

## Summary

Execution logging adds auditability to the prompt execution flow. The existing `execution.service.ts` already captures all required data (model_id, model_source, tokens, duration) in the `ExecutionResult` type. The primary work is persisting this data to a new database table and building a history UI. The existing codebase has established patterns for services, API routes, and UI components that should be followed.

**Primary recommendation:** Add an async logging function that fire-and-forget writes to a new `executionLogs` table without blocking the execution response.

## Standard Stack

### Core (Existing - Use These)

| Library       | Version | Purpose                            | Why Standard                      |
| ------------- | ------- | ---------------------------------- | --------------------------------- |
| Drizzle ORM   | ^0.39.x | Database operations                | Already in use with SQLite/libsql |
| Zod           | ^3.24.x | Request validation                 | Used in all API endpoints         |
| Svelte 5      | ^5.x    | UI with runes ($state, $derived)   | Project standard                  |
| shadcn-svelte | latest  | UI components (Table, Card, Badge) | Already installed                 |

### Supporting (Existing)

| Library       | Version | Purpose                             | When to Use                           |
| ------------- | ------- | ----------------------------------- | ------------------------------------- |
| lucide-svelte | latest  | Icons (History, Clock, AlertCircle) | Already in use                        |
| Winston       | ^3.x    | File-based audit logging            | Existing in `src/lib/server/audit.ts` |

### No New Dependencies Required

All required functionality exists in the current stack.

## Architecture Patterns

### Recommended Schema Addition

```typescript
// src/lib/server/db/schema.ts

export const executionLogs = sqliteTable('execution_logs', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	promptId: integer('prompt_id')
		.notNull()
		.references(() => prompts.id, { onDelete: 'cascade' }),
	versionId: integer('version_id').references(() => promptVersions.id, { onDelete: 'set null' }),

	// Execution context
	inputContent: text('input_content').notNull(), // Resolved prompt (with variables substituted)
	outputContent: text('output_content'), // AI response or null if error

	// Model provenance (from ExecutionResult.model)
	modelId: text('model_id').notNull(), // Format: providerID/modelID
	modelSource: text('model_source').$type<'run' | 'prompt' | 'default'>().notNull(),

	// Usage metrics (from ExecutionResult.usage)
	inputTokens: integer('input_tokens').notNull().default(0),
	outputTokens: integer('output_tokens').notNull().default(0),
	totalTokens: integer('total_tokens').notNull().default(0),

	// Timing (from ExecutionResult.duration)
	durationMs: integer('duration_ms').notNull(),

	// Error handling
	status: text('status').$type<'success' | 'error'>().notNull(),
	errorCode: text('error_code'), // ExecutionError.code if error
	errorMessage: text('error_message'), // User-friendly error message

	// Metadata
	functionType: text('function_type')
		.$type<'executor' | 'judge' | 'improve' | 'council'>()
		.notNull()
		.default('executor'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
```

### Async Logging Service Pattern

```typescript
// src/lib/server/services/execution-log.service.ts

import { db } from '../db/client';
import { executionLogs, type NewExecutionLog } from '../db/schema';
import type { ExecutionResult } from './execution.service';

export interface CreateLogEntry {
	promptId: number;
	versionId?: number;
	inputContent: string;
	result: ExecutionResult | null;
	error?: { code: string; message: string };
	functionType?: 'executor' | 'judge' | 'improve' | 'council';
}

/**
 * Log execution result asynchronously (fire-and-forget)
 * Does NOT block execution response - errors are logged, not thrown
 */
export function logExecution(entry: CreateLogEntry): void {
	// Don't await - let it complete in background
	logExecutionAsync(entry).catch((err) => {
		console.error('[ExecutionLog] Failed to log execution:', err);
	});
}

async function logExecutionAsync(entry: CreateLogEntry): Promise<void> {
	const logData: NewExecutionLog = {
		promptId: entry.promptId,
		versionId: entry.versionId,
		inputContent: entry.inputContent,
		outputContent: entry.result?.content ?? null,
		modelId: entry.result?.model
			? `${entry.result.model.providerId}/${entry.result.model.modelId}`
			: 'unknown',
		modelSource: entry.result?.source ?? 'default',
		inputTokens: entry.result?.usage.inputTokens ?? 0,
		outputTokens: entry.result?.usage.outputTokens ?? 0,
		totalTokens: entry.result?.usage.totalTokens ?? 0,
		durationMs: entry.result?.duration.ms ?? 0,
		status: entry.error ? 'error' : 'success',
		errorCode: entry.error?.code ?? null,
		errorMessage: entry.error?.message ?? null,
		functionType: entry.functionType ?? 'executor'
	};

	await db.insert(executionLogs).values(logData);
}

/**
 * Get execution history for a prompt (paginated)
 */
export async function getExecutionHistory(
	promptId: number,
	limit = 50,
	offset = 0
): Promise<{ logs: ExecutionLog[]; totalCount: number }> {
	const { eq, desc, count, sql } = await import('drizzle-orm');

	const logs = await db
		.select()
		.from(executionLogs)
		.where(eq(executionLogs.promptId, promptId))
		.orderBy(desc(executionLogs.createdAt))
		.limit(limit)
		.offset(offset);

	const [countResult] = await db
		.select({ count: count() })
		.from(executionLogs)
		.where(eq(executionLogs.promptId, promptId));

	return { logs, totalCount: countResult?.count ?? 0 };
}
```

### Integration Point in Execution Service

```typescript
// In src/routes/api/prompts/[id]/execute/+server.ts

import { logExecution } from '$lib/server/services/execution-log.service';

export const POST: RequestHandler = async (event) => {
	// ... existing auth/validation code ...

	try {
		const result = await executePrompt({ promptId, content, functionType: 'executor', overrides });

		// Log successful execution (async, non-blocking)
		logExecution({
			promptId,
			inputContent: content,
			result,
			functionType: 'executor'
		});

		return json(result);
	} catch (err) {
		// Log failed execution (async, non-blocking)
		if (err instanceof ExecutionError) {
			logExecution({
				promptId,
				inputContent: content,
				result: null,
				error: { code: err.code, message: err.userMessage },
				functionType: 'executor'
			});
		}

		// ... existing error handling ...
	}
};
```

### UI Pattern: History Panel

Follow existing patterns from `execution-result.svelte` and `VersionTimeline`:

```svelte
<!-- src/lib/components/prompts/execution-history.svelte -->
<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import Clock from 'lucide-svelte/icons/clock';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import XCircle from 'lucide-svelte/icons/x-circle';

	interface ExecutionLog {
		id: number;
		modelId: string;
		modelSource: string;
		totalTokens: number;
		durationMs: number;
		status: 'success' | 'error';
		createdAt: Date;
	}

	interface Props {
		logs: ExecutionLog[];
		onselect?: (log: ExecutionLog) => void;
		selectedLogId?: number | null;
		class?: string;
	}

	let { logs, onselect, selectedLogId, class: className }: Props = $props();

	function formatDuration(ms: number): string {
		return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleString();
	}
</script>

<div class={cn('space-y-2', className)}>
	{#each logs as log (log.id)}
		<button
			class={cn(
				'w-full rounded-lg border p-3 text-left transition-colors',
				'hover:bg-muted/50',
				selectedLogId === log.id && 'border-primary bg-primary/5'
			)}
			onclick={() => onselect?.(log)}
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if log.status === 'success'}
						<CheckCircle class="h-4 w-4 text-green-500" />
					{:else}
						<XCircle class="h-4 w-4 text-red-500" />
					{/if}
					<span class="text-sm font-medium">{log.modelId}</span>
				</div>
				<Badge variant="outline">{log.modelSource}</Badge>
			</div>
			<div class="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
				<span>{log.totalTokens} tokens</span>
				<span>·</span>
				<span class="flex items-center gap-1">
					<Clock class="h-3 w-3" />
					{formatDuration(log.durationMs)}
				</span>
				<span>·</span>
				<span>{formatDate(log.createdAt)}</span>
			</div>
		</button>
	{:else}
		<p class="py-4 text-center text-sm text-muted-foreground">No execution history</p>
	{/each}
</div>
```

### Anti-Patterns to Avoid

- **Awaiting log writes in request handler** - Would slow down execution response
- **Storing raw request body** - Store resolved content, not JSON
- **Missing cascade deletion** - Logs should cascade delete with prompt
- **Sync logging on error path** - Even errors should return fast

## Don't Hand-Roll

| Problem            | Don't Build         | Use Instead                             | Why                                            |
| ------------------ | ------------------- | --------------------------------------- | ---------------------------------------------- |
| Async queue/buffer | Custom job queue    | Fire-and-forget with .catch()           | SQLite writes are fast, no need for complexity |
| Date formatting    | Custom formatter    | toLocaleString() / toLocaleDateString() | Native, locale-aware                           |
| Pagination         | Custom offset logic | Existing pattern in prompts.service.ts  | Proven, handles edge cases                     |
| State management   | Custom store        | Svelte 5 $state rune                    | Already in use                                 |

**Key insight:** The execution log table is write-heavy, read-light. No need for complex indexing beyond promptId + createdAt.

## Common Pitfalls

### Pitfall 1: Blocking Execution Response

**What goes wrong:** Awaiting database insert slows down API response by 10-50ms
**Why it happens:** Natural instinct to await all async operations
**How to avoid:** Use fire-and-forget pattern with `logExecution().catch(console.error)`
**Warning signs:** Execution feels sluggish, latency > 500ms

### Pitfall 2: Missing Error Context

**What goes wrong:** Failed executions logged without error code/message
**Why it happens:** Only logging on success path, or error object structure misunderstood
**How to avoid:** Always include error fields in log entry, null on success
**Warning signs:** History shows "error" but no details visible

### Pitfall 3: Large Content Storage

**What goes wrong:** outputContent can be very large (10K+ tokens), database bloats
**Why it happens:** Not considering content size limits
**How to avoid:**

- Consider truncating very long outputs (keep first 10K chars + "...")
- Or add a separate table for full output with reference
- For now, store full output (SQLite handles TEXT well)
  **Warning signs:** Database file growing rapidly

### Pitfall 4: Model ID Format Inconsistency

**What goes wrong:** Some logs have `claude-3-5-sonnet`, others have `anthropic/claude-3-5-sonnet`
**Why it happens:** Not normalizing model ID before storage
**How to avoid:** Always store as `providerId/modelId` format (match existing pattern)
**Warning signs:** History shows inconsistent model names

## Code Examples

### API Endpoint for History

```typescript
// src/routes/api/prompts/[id]/history/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { getExecutionHistory } from '$lib/server/services/execution-log.service';
import { authenticateWithBetterAuth } from '$lib/server/auth/jwt';

const querySchema = z.object({
	limit: z.coerce.number().min(1).max(100).default(50),
	offset: z.coerce.number().min(0).default(0)
});

export const GET: RequestHandler = async (event) => {
	authenticateWithBetterAuth(event);

	const promptId = parseInt(event.params.id, 10);
	if (isNaN(promptId) || promptId <= 0) {
		throw error(400, 'Invalid prompt ID');
	}

	const query = querySchema.safeParse(Object.fromEntries(event.url.searchParams));
	if (!query.success) {
		throw error(400, 'Invalid query parameters');
	}

	const { logs, totalCount } = await getExecutionHistory(
		promptId,
		query.data.limit,
		query.data.offset
	);

	return json({
		data: logs,
		pagination: {
			limit: query.data.limit,
			offset: query.data.offset,
			totalCount,
			hasMore: query.data.offset + logs.length < totalCount
		}
	});
};
```

### Log Detail Endpoint

```typescript
// src/routes/api/prompts/[id]/history/[logId]/+server.ts

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { executionLogs } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticateWithBetterAuth } from '$lib/server/auth/jwt';

export const GET: RequestHandler = async (event) => {
	authenticateWithBetterAuth(event);

	const promptId = parseInt(event.params.id, 10);
	const logId = parseInt(event.params.logId, 10);

	if (isNaN(promptId) || isNaN(logId)) {
		throw error(400, 'Invalid ID');
	}

	const [log] = await db
		.select()
		.from(executionLogs)
		.where(and(eq(executionLogs.id, logId), eq(executionLogs.promptId, promptId)))
		.limit(1);

	if (!log) {
		throw error(404, 'Log not found');
	}

	return json({ data: log });
};
```

## State of the Art

| Old Approach       | Current Approach          | When Changed      | Impact                      |
| ------------------ | ------------------------- | ----------------- | --------------------------- |
| Sync logging       | Async fire-and-forget     | Standard practice | No blocking of API response |
| Separate log files | Database logging          | Project standard  | Queryable, relationable     |
| Custom pagination  | Offset-based with hasMore | Existing pattern  | Consistent API shape        |

**Deprecated/outdated:**

- Message queues for simple logging: Over-engineering for SQLite write volume
- In-memory log buffering: Adds complexity without benefit for single-server app

## Open Questions

1. **Content truncation threshold?**
   - What we know: outputContent can be large, SQLite TEXT is unbounded
   - What's unclear: What's the practical limit before performance degrades?
   - Recommendation: Start with full storage, monitor DB size. Add truncation if needed.

2. **Retention policy?**
   - What we know: Logs grow unbounded, cascade delete on prompt deletion
   - What's unclear: Should we auto-purge old logs? What's the retention period?
   - Recommendation: Defer to Phase 3+ if needed. Start without auto-purge.

3. **Version ID tracking?**
   - What we know: Prompts have versions, executions might want to track which version
   - What's unclear: Should we track versionId in logs?
   - Recommendation: Include versionId field (nullable) for future enhancement

## Key Decisions for Planner

1. **Table schema** - Use the recommended schema with status/error fields
2. **Async logging** - Fire-and-forget with .catch() for error logging
3. **Integration point** - Modify execute endpoint, not execution service
4. **UI placement** - Add History tab or section below execution panel
5. **Pagination** - Use existing pattern (limit/offset with hasMore)

## Implementation Notes

### Plan 03-01: Schema and Service

1. Add `executionLogs` table to schema.ts
2. Run `npm run db:push` to sync schema
3. Create `execution-log.service.ts` with `logExecution()` and `getExecutionHistory()`
4. Modify execute endpoint to call `logExecution()` on both success and error
5. Verify logs are created without blocking response

### Plan 03-02: History UI

1. Create `execution-history.svelte` component (list view)
2. Create `execution-log-detail.svelte` component (detail view with input/output)
3. Add API endpoint `/api/prompts/[id]/history`
4. Add API endpoint `/api/prompts/[id]/history/[logId]`
5. Integrate history into prompt detail page (tab or collapsible section)

## Sources

### Primary (HIGH confidence)

- Existing codebase analysis - execution.service.ts, prompts.service.ts, schema.ts
- Project AGENTS.md - Coding standards and patterns

### Secondary (MEDIUM confidence)

- Drizzle ORM patterns from existing codebase

### Tertiary (LOW confidence)

- None required - all patterns established in codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Using existing libraries and patterns
- Architecture: HIGH - Following established service layer pattern
- Pitfalls: HIGH - Based on common async/logging patterns

**Research date:** 2026-02-26
**Valid until:** 30 days (stable patterns)
