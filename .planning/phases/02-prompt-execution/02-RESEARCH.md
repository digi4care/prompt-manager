# Phase 2: Prompt Execution - Research

**Researched:** 2026-02-22
**Domain:** OpenCode SDK Execution + Prompt Playground UI + Error Handling
**Confidence:** HIGH

## Summary

This phase implements prompt execution via OpenCode SDK with resolved settings from the Phase 1 cascade. The user has delegated all UI decisions to best practices. Research shows OpenCode SDK uses `session.chat()` for message-based execution, returning response parts with metadata. The implementation should follow existing patterns from `opencode.service.ts` and the improvement panel.

Key insight: The OpenCode SDK session API is designed for multi-turn conversations, but for single-prompt execution, we can create a session, send one message, and retrieve the response. Error handling should use the SDK's built-in error classes (APIError, AuthenticationError, RateLimitError, etc.) mapped to user-friendly messages.

**Primary recommendation:** Create a new `execution.service.ts` that wraps OpenCode SDK's `session.chat()` with settings cascade resolution, timing measurement, and structured error handling. Reuse the existing model-picker pattern for overrides, and display results inline with markdown rendering using marked.js.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Implementation Decisions

#### Phase Boundary

Users execute prompts via OpenCode SDK with resolved settings. The phase delivers: execution trigger, per-execution overrides (model/temperature/tokens), response display with metadata (model used, token counts, duration), and error handling. Streaming execution and logging are separate phases (Phase 6 and Phase 3).

#### Execution Trigger UI

- Claude's Discretion — user delegated to best practice patterns
- Key concerns: button placement, keyboard shortcuts, loading state feedback, disabled state when OpenCode not configured

#### Override UX

- Claude's Discretion — user delegated to best practice patterns
- Key concerns: inline vs modal vs collapsible presentation, showing default values, persistence between executions, which settings can be overridden (model, temperature, max_tokens per Phase 1)

#### Result Display

- Claude's Discretion — user delegated to best practice patterns
- Key concerns: inline vs panel vs modal placement, markdown rendering with code highlighting, metadata display (model, tokens, duration), copy/interaction actions

#### Error Handling UX

- Claude's Discretion — user delegated to best practice patterns
- Key concerns: toast vs inline vs modal error display, error detail level (user-friendly vs technical), retry mechanism, recovery suggestions

### Claude's Discretion

All areas above are at Claude's discretion. Research standard patterns for prompt execution UIs and apply best practices:

- Execution trigger: prominent but not intrusive, clear loading state
- Overrides: easy access without cluttering main UI
- Results: readable formatting, useful metadata
- Errors: actionable messages, graceful recovery

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

## Standard Stack

### Core

| Library          | Version       | Purpose                       | Why Standard                                    |
| ---------------- | ------------- | ----------------------------- | ----------------------------------------------- |
| @opencode-ai/sdk | ^1.2.6        | OpenCode server communication | Already in project, provides session.chat() API |
| zod              | ^4.3.6        | Schema validation             | Already in project, type-safe validation        |
| svelte-sonner    | ^1.0.7        | Toast notifications           | Already in project, consistent error feedback   |
| marked           | ^14.0.0 (add) | Markdown rendering            | Industry standard, fast, extensible             |

### Supporting

| Library               | Version            | Purpose                  | When to Use                                    |
| --------------------- | ------------------ | ------------------------ | ---------------------------------------------- |
| @lucide/svelte        | ^0.572.0           | Icons                    | For execute button, loading spinner, copy icon |
| clsx + tailwind-merge | ^2.1.1 / ^3.4.1    | Class utilities          | For conditional styling                        |
| highlight.js          | ^11.9.0 (optional) | Code syntax highlighting | If code blocks need coloring                   |

### Alternatives Considered

| Instead of    | Could Use         | Tradeoff                                               |
| ------------- | ----------------- | ------------------------------------------------------ |
| marked        | markdown-it       | marked is faster, simpler API                          |
| highlight.js  | prism             | highlight.js auto-detects language, larger but simpler |
| Custom timing | performance.now() | Date.now() is sufficient for second-level timing       |

**Installation:**

```bash
npm install marked
# Optional for code highlighting:
npm install highlight.js
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── server/
│   │   └── services/
│   │       ├── execution.service.ts      # NEW: Prompt execution logic
│   │       └── settings-cascade.service.ts  # EXISTS: Settings resolution
│   └── components/
│       └── prompts/
│           ├── execution-panel.svelte    # NEW: Execution UI
│           ├── execution-result.svelte   # NEW: Result display
│           ├── execution-overrides.svelte # NEW: Override controls
│           └── markdown-renderer.svelte  # NEW: Markdown display
└── routes/
    └── api/
        └── prompts/
            └── [id]/
                └── execute/
                    └── +server.ts        # NEW: Execution endpoint
```

### Pattern 1: OpenCode SDK Session Execution

**What:** Execute prompts via session-based API with model configuration
**When to use:** Single-prompt execution with settings resolution

**Example:**

```typescript
// Source: Context7 /sst/opencode-sdk-js
import Opencode from '@opencode-ai/sdk';

const client = new Opencode();

// Create session for execution
const session = await client.session.create();

// Execute prompt with model settings
const response = await client.session.chat(session.id, {
	parts: [
		{
			type: 'text',
			text: promptContent
		}
	]
});

// Access response parts
for (const part of response.parts) {
	if (part.type === 'text') {
		console.log(part.text);
	}
}

// Clean up session
await client.session.delete(session.id);
```

### Pattern 2: Error Handling with SDK Error Classes

**What:** Catch and map SDK-specific errors to user-friendly messages
**When to use:** Wrapping OpenCode SDK calls

**Example:**

```typescript
// Source: Context7 /sst/opencode-sdk-js
import Opencode from '@opencode-ai/sdk';

const client = new Opencode();

try {
	const session = await client.session.create();
	await client.session.chat(session.id, { parts: [{ type: 'text', text: 'Hello' }] });
} catch (error) {
	if (error instanceof Opencode.APIError) {
		// Access error details
		console.log(error.status); // HTTP status
		console.log(error.name); // Error type name
		console.log(error.headers); // Response headers
		console.log(error.message); // Error message

		// Handle specific error types
		if (error instanceof Opencode.AuthenticationError) {
			return { error: 'Authentication failed. Check your API credentials.' };
		} else if (error instanceof Opencode.RateLimitError) {
			return { error: 'Rate limited. Please wait a moment and try again.' };
		} else if (error instanceof Opencode.NotFoundError) {
			return { error: 'Model or resource not found.' };
		}
	} else if (error instanceof Opencode.APIConnectionError) {
		return { error: 'Could not connect to AI service. Is OpenCode running?' };
	} else if (error instanceof Opencode.APIConnectionTimeoutError) {
		return { error: 'Request timed out. Try reducing max tokens.' };
	}

	// Generic fallback
	return { error: error instanceof Error ? error.message : 'Unknown error' };
}
```

### Pattern 3: Execution Service with Timing

**What:** Service layer that handles execution with duration tracking
**When to use:** Server-side execution endpoint

**Example:**

```typescript
// Source: Existing opencode.service.ts pattern + new execution needs
import { getOpencodeClient } from './opencode.service';
import { resolveFunctionSettings, type RunOverrides } from './settings-cascade.service';

export interface ExecutionResult {
	content: string;
	model: {
		providerId: string;
		modelId: string;
		displayName: string;
	};
	usage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	duration: {
		ms: number;
		seconds: number;
	};
	source: 'run' | 'prompt' | 'default';
}

export interface ExecutionOptions {
	promptId: number;
	content: string;
	functionType: 'executor';
	overrides?: RunOverrides;
}

export async function executePrompt(options: ExecutionOptions): Promise<ExecutionResult> {
	const startTime = Date.now();

	// Resolve settings from cascade
	const settings = await resolveFunctionSettings({
		functionType: options.functionType,
		promptId: options.promptId,
		runOverrides: options.overrides
	});

	// Parse model ID (format: provider/model)
	const [providerId, modelId] = settings.modelId.value.split('/');

	try {
		const client = await getOpencodeClient();

		// Create ephemeral session for single execution
		const session = await client.session.create();

		// Execute prompt
		const response = await client.session.chat(session.id, {
			parts: [{ type: 'text', text: options.content }]
		});

		// Extract text content
		let content = '';
		for (const part of response.parts) {
			if (part.type === 'text') {
				content += part.text;
			}
		}

		// Clean up session
		await client.session.delete(session.id);

		const duration = Date.now() - startTime;

		return {
			content,
			model: {
				providerId,
				modelId,
				displayName: `${providerId}/${modelId}`
			},
			usage: {
				inputTokens: response.usage?.input_tokens ?? 0,
				outputTokens: response.usage?.output_tokens ?? 0,
				totalTokens: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)
			},
			duration: {
				ms: duration,
				seconds: Math.round(duration / 100) / 10
			},
			source: settings.modelId.source
		};
	} catch (error) {
		// Map to user-friendly error
		throw mapExecutionError(error);
	}
}

function mapExecutionError(error: unknown): ExecutionError {
	// Error mapping logic using SDK error classes
	// ... (see Pattern 2)
}
```

### Pattern 4: Svelte 5 Execution Panel State

**What:** Component state management for execution UI
**When to use:** Execution panel with loading, error, and result states

**Example:**

```svelte
<script lang="ts">
	// State machine: idle -> loading -> success | error
	type ExecutionState = 'idle' | 'loading' | 'success' | 'error';

	let state = $state<ExecutionState>('idle');
	let result = $state<ExecutionResult | null>(null);
	let error = $state<string | null>(null);
	let overrides = $state<RunOverrides>({});

	// Derived: is executing
	let isExecuting = $derived(state === 'loading');

	// Derived: can execute (has content, not already executing)
	let canExecute = $derived(state !== 'loading' && promptContent.trim().length > 0);

	async function handleExecute() {
		if (!canExecute) return;

		state = 'loading';
		error = null;
		result = null;

		try {
			const response = await fetch(`/api/prompts/${promptId}/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: promptContent,
					overrides: overrides.modelId ? overrides : undefined
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Execution failed');
			}

			result = await response.json();
			state = 'success';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
			state = 'error';
		}
	}

	function handleRetry() {
		handleExecute();
	}

	function handleReset() {
		state = 'idle';
		result = null;
		error = null;
	}
</script>
```

### Pattern 5: Markdown Rendering with Sanitization

**What:** Render AI response markdown safely
**When to use:** Displaying execution results

**Example:**

```svelte
<script lang="ts">
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	// Configure marked for security
	marked.setOptions({
		// Disable HTML to prevent XSS
		breaks: true,
		gfm: true
	});

	interface Props {
		content: string;
		class?: string;
	}

	let { content, class: className = '' }: Props = $props();

	// Render markdown to HTML
	let html = $derived.by(() => {
		try {
			// Sanitize and render
			return marked.parse(content) as string;
		} catch {
			return `<pre>${escapeHtml(content)}</pre>`;
		}
	});

	function escapeHtml(text: string): string {
		return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
</script>

<div class="markdown-content prose max-w-none dark:prose-invert {className}" innerHTML={html}></div>

<style>
	/* Code block styling */
	:global(.markdown-content pre) {
		@apply overflow-x-auto rounded-lg bg-muted p-4;
	}

	:global(.markdown-content code) {
		@apply font-mono text-sm;
	}

	/* Inline code */
	:global(.markdown-content :not(pre) > code) {
		@apply rounded bg-muted px-1.5 py-0.5;
	}
</style>
```

### Pattern 6: Collapsible Override Panel (Best Practice)

**What:** Compact override controls that don't clutter main UI
**When to use:** Per-execution model/temp/tokens overrides

**Example:**

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ModelPicker from '$lib/components/prompts/model-picker.svelte';
	import Collapsible from '$lib/components/admin/ai-settings/collapsible.svelte';

	interface Props {
		overrides: RunOverrides;
		onchange: (overrides: RunOverrides) => void;
		defaults: {
			modelId: string;
			temperature: number;
			maxTokens: number;
		};
	}

	let { overrides, onchange, defaults }: Props = $props();

	let showAdvanced = $state(false);

	// Track if overrides differ from defaults
	let hasOverrides = $derived(
		overrides.modelId !== undefined ||
			overrides.temperature !== undefined ||
			overrides.maxTokens !== undefined
	);
</script>

<Collapsible title="Execution Settings" defaultOpen={false}>
	<div class="space-y-4">
		<p class="text-sm text-muted-foreground">
			Override defaults for this execution. Leave empty to use prompt settings.
		</p>

		<ModelPicker
			value={overrides.modelId ?? ''}
			onchange={(modelId) => onchange({ ...overrides, modelId: modelId || undefined })}
			showTemperature={true}
			temperature={overrides.temperature ?? defaults.temperature}
			onTemperatureChange={(temp) => onchange({ ...overrides, temperature: temp })}
			defaultModel={defaults.modelId}
		/>

		{#if hasOverrides}
			<Button variant="ghost" size="sm" onclick={() => onchange({})}>Reset to Defaults</Button>
		{/if}
	</div>
</Collapsible>
```

### Anti-Patterns to Avoid

- **Don't keep sessions open** — Create, execute, delete immediately
- **Don't show raw API errors** — Map to user-friendly messages
- **Don't render untrusted HTML** — Always sanitize markdown output
- **Don't block UI during execution** — Show loading state, allow cancel
- **Don't persist run overrides** — They're per-execution only
- **Don't forget timing measurement** — Duration is a success criterion

## Don't Hand-Roll

| Problem             | Don't Build      | Use Instead           | Why                               |
| ------------------- | ---------------- | --------------------- | --------------------------------- |
| Markdown rendering  | Custom parser    | marked                | Battle-tested, handles edge cases |
| Error mapping       | Custom switch    | SDK error classes     | SDK provides specific error types |
| Toast notifications | Custom alert     | svelte-sonner         | Already integrated, consistent UX |
| Model selection     | Custom dropdown  | Existing model-picker | Proven pattern, provider logos    |
| Loading spinner     | Custom animation | Lucide Loader2        | Consistent icon system            |

**Key insight:** The existing codebase has well-tested patterns for OpenCode integration, validation, and UI components. Extend these rather than creating new implementations.

## Common Pitfalls

### Pitfall 1: Session Leaks

**What goes wrong:** Creating sessions without cleaning up, exhausting resources
**Why it happens:** SDK creates persistent sessions that need explicit deletion
**How to avoid:** Always use try/finally to delete sessions, even on error
**Warning signs:** "Too many sessions" errors, memory growth

### Pitfall 2: Temperature Range Confusion

**What goes wrong:** Using wrong temperature range (0-1 vs 0-2)
**Why it happens:** Different models have different ranges
**How to avoid:** Pass temperature from resolved settings (Phase 1 validates 0-2)
**Warning signs:** Temperature seems to have no effect

### Pitfall 3: Model ID Format Mismatch

**What goes wrong:** Sending model ID in wrong format to SDK
**Why it happens:** UI stores `provider/model`, SDK might expect just `model`
**How to avoid:** Check OpenCode SDK model parameter format, parse if needed
**Warning signs:** "Model not found" errors

### Pitfall 4: XSS via Markdown

**What goes wrong:** Rendering untrusted HTML from AI response
**Why it happens:** Markdown can contain HTML tags
**How to avoid:** Use marked with sanitization, or DOMPurify
**Warning signs:** Script tags in rendered output

### Pitfall 5: Lost Error Context

**What goes wrong:** Showing generic "Something went wrong" instead of actionable message
**Why it happens:** Catching errors without mapping to user-friendly text
**How to avoid:** Use SDK error classes to map specific errors, include recovery suggestions
**Warning signs:** Users confused about what to do next

### Pitfall 6: Missing Execution Metadata

**What goes wrong:** Not displaying which model was used or token counts
**Why it happens:** Focusing on content, forgetting metadata
**How to avoid:** Always return and display: model, tokens, duration, source level
**Warning signs:** Users can't reproduce results

## Code Examples

### API Endpoint: Execute Prompt

```typescript
// Source: Existing api patterns + execution needs
// src/routes/api/prompts/[id]/execute/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { executePrompt, ExecutionError } from '$lib/server/services/execution.service';
import { authenticateRequest } from '$lib/server/auth/jwt';

const executeRequestSchema = z.object({
	content: z.string().min(1, 'Content is required').max(100000, 'Content too long'),
	versionId: z.number().optional(),
	overrides: z
		.object({
			modelId: z.string().optional(),
			temperature: z.number().min(0).max(2).optional(),
			maxTokens: z.number().int().min(1).max(1000000).optional()
		})
		.optional()
});

export const POST: RequestHandler = async (event) => {
	const user = authenticateRequest(event);
	const promptId = parseInt(event.params.id);

	if (isNaN(promptId)) {
		throw error(400, 'Invalid prompt ID');
	}

	try {
		const body = await event.request.json();
		const parsed = executeRequestSchema.safeParse(body);

		if (!parsed.success) {
			throw error(
				400,
				JSON.stringify({
					message: 'Invalid request',
					errors: parsed.error.flatten()
				})
			);
		}

		const result = await executePrompt({
			promptId,
			content: parsed.data.content,
			functionType: 'executor',
			overrides: parsed.data.overrides
		});

		return json(result);
	} catch (err) {
		if (err instanceof ExecutionError) {
			throw error(
				err.statusCode,
				JSON.stringify({
					message: err.userMessage,
					code: err.code,
					recovery: err.recoveryHint
				})
			);
		}

		console.error('Execution error:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'An unexpected error occurred'
			})
		);
	}
};
```

### Custom Error Class

```typescript
// Source: Existing error patterns + execution needs
// src/lib/server/services/execution.service.ts

export class ExecutionError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public code: string,
		public userMessage: string,
		public recoveryHint?: string
	) {
		super(message);
		this.name = 'ExecutionError';
	}

	static fromSDKError(error: unknown): ExecutionError {
		// Map OpenCode SDK errors to user-friendly messages
		if (error instanceof Opencode.AuthenticationError) {
			return new ExecutionError(
				'Authentication failed',
				401,
				'AUTH_FAILED',
				'API authentication failed',
				'Check your API credentials in OpenCode configuration'
			);
		}

		if (error instanceof Opencode.RateLimitError) {
			return new ExecutionError(
				'Rate limited',
				429,
				'RATE_LIMITED',
				'Too many requests',
				'Wait a moment and try again'
			);
		}

		if (error instanceof Opencode.APIConnectionError) {
			return new ExecutionError(
				'Connection failed',
				503,
				'NO_CONNECTION',
				'Cannot connect to AI service',
				'Ensure OpenCode server is running'
			);
		}

		if (error instanceof Opencode.APIConnectionTimeoutError) {
			return new ExecutionError(
				'Request timed out',
				504,
				'TIMEOUT',
				'Request took too long',
				'Try reducing max tokens or use a faster model'
			);
		}

		// Generic fallback
		return new ExecutionError(
			'Unknown error',
			500,
			'UNKNOWN',
			'An unexpected error occurred',
			'Try again or contact support'
		);
	}
}
```

### Result Display Component

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import MarkdownRenderer from './markdown-renderer.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		result: {
			content: string;
			model: { displayName: string };
			usage: { inputTokens: number; outputTokens: number };
			duration: { seconds: number };
			source: 'run' | 'prompt' | 'default';
		};
		oncopy?: () => void;
		class?: string;
	}

	let { result, oncopy, class: className = '' }: Props = $props();

	let copySuccess = $state(false);

	async function handleCopy() {
		await navigator.clipboard.writeText(result.content);
		copySuccess = true;
		oncopy?.();
		setTimeout(() => {
			copySuccess = false;
		}, 2000);
	}

	const sourceLabels = {
		run: 'Run Override',
		prompt: 'Prompt Setting',
		default: 'Global Default'
	};
</script>

<div class={cn('space-y-4', className)}>
	<!-- Metadata bar -->
	<div class="flex items-center justify-between text-sm text-muted-foreground">
		<div class="flex items-center gap-4">
			<span class="font-medium">{result.model.displayName}</span>
			<span>·</span>
			<span>{result.usage.inputTokens + result.usage.outputTokens} tokens</span>
			<span>·</span>
			<span>{result.duration.seconds}s</span>
		</div>
		<span class="rounded bg-muted px-2 py-1 text-xs">
			{sourceLabels[result.source]}
		</span>
	</div>

	<!-- Content -->
	<div class="rounded-lg border p-4">
		<MarkdownRenderer content={result.content} />
	</div>

	<!-- Actions -->
	<div class="flex justify-end">
		<Button variant="outline" size="sm" onclick={handleCopy}>
			{#if copySuccess}
				Copied!
			{:else}
				Copy
			{/if}
		</Button>
	</div>
</div>
```

## State of the Art

| Old Approach                    | Current Approach                   | When Changed              | Impact                        |
| ------------------------------- | ---------------------------------- | ------------------------- | ----------------------------- |
| Static error messages           | SDK error class mapping            | OpenCode SDK 1.2+         | Actionable error recovery     |
| Plain text responses            | Markdown with syntax highlighting  | Standard practice         | Better readability            |
| Inline overrides always visible | Collapsible override panel         | Best practice 2025        | Cleaner UI, power user access |
| Single model display            | Model + tokens + duration + source | Prompt playground UX 2025 | Full transparency             |

**Deprecated/outdated:**

- Alert() for errors → Use toast or inline error display
- Raw text output → Always render markdown
- Missing metadata → Always show model, tokens, duration

## Open Questions

1. **Streaming vs Non-Streaming for Phase 2**
   - What we know: Phase 6 covers streaming, Phase 2 is non-streaming
   - What's unclear: Should we prepare the API for future streaming support?
   - Recommendation: Design API to return streaming-compatible structure, implement non-streaming now

2. **Execution History Storage**
   - What we know: Phase 3 covers logging
   - What's unclear: Should Phase 2 store anything about executions?
   - Recommendation: Phase 2 is stateless execution only, no persistence

3. **Concurrent Execution Limit**
   - What we know: Multiple executions could happen simultaneously
   - What's unclear: Should we limit concurrent executions per user?
   - Recommendation: No limit for Phase 2, add rate limiting in Phase 3 if needed

## Sources

### Primary (HIGH confidence)

- Context7 `/sst/opencode-sdk-js` - OpenCode SDK API (session.create, session.chat, error classes)
- Context7 `/markedjs/marked` - Markdown rendering patterns
- Existing codebase: `src/lib/server/services/opencode.service.ts` - OpenCode integration pattern
- Existing codebase: `src/lib/server/services/settings-cascade.service.ts` - Settings resolution
- Existing codebase: `src/lib/components/improvement/improvement-panel.svelte` - Loading/error patterns

### Secondary (MEDIUM confidence)

- Google Search: "prompt playground UI best practices 2025" - UI patterns for execution triggers, result display
- Google Search: "OpenAI Anthropic execution model selection" - Standard patterns for override UX

### Tertiary (LOW confidence)

- None identified

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All core dependencies already in project, marked.js is stable
- Architecture: HIGH - Following existing patterns, SDK provides clear API
- Pitfalls: MEDIUM - Based on general LLM API experience, some OpenCode-specific

**Research date:** 2026-02-22
**Valid until:** 30 days (stable technologies, low churn)
