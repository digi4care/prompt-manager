# Stack Research

**Domain:** Prompt Management with AI Execution (Subsequent Milestone)
**Researched:** 2026-02-14
**Confidence:** HIGH

## Recommended Stack

### Core Technologies (Existing - Maintain)

| Technology   | Version | Purpose              | Why Recommended                                                                                                              |
| ------------ | ------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| SvelteKit    | ^2.51.0 | Full-stack framework | Already in use. Svelte 5 runes provide excellent reactivity. Streaming support built-in via ReadableStream.                  |
| Svelte       | ^5.51.0 | UI framework         | Already in use. Svelte 5 runes ($state, $derived, $effect) are ideal for reactive prompt editor and preview.                 |
| Bun          | latest  | Runtime              | Already in use. Fast, native TypeScript, drop-in npm replacement.                                                            |
| Drizzle ORM  | ^0.45.1 | Database ORM         | Already in use. Type-safe, minimal overhead, SQLite compatible.                                                              |
| TypeScript   | ^5.9.3  | Type system          | Already in use. Strict mode provides excellent safety.                                                                       |
| OpenCode SDK | ^1.2.1  | AI execution         | **UPDATE from 1.1.53.** Session-based prompt execution with model selection, temperature, maxTokens. Core to this milestone. |

### Supporting Libraries (Add/Update)

| Library           | Version | Purpose           | When to Use                                                                                         |
| ----------------- | ------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| sveltekit-sse     | ^1.0.0  | SSE streaming     | **NEW.** For streaming AI responses to UI. Provides clean produce/source API for real-time updates. |
| Zod               | ^4.3.6  | Schema validation | Already in use. For API request/response validation, settings schema, frontmatter validation.       |
| yaml              | ^2.8.2  | YAML parsing      | Already in use. For frontmatter parsing in prompts.                                                 |
| tailwind-variants | ^3.2.2  | Styling           | Already in use. For council mode UI variants.                                                       |

## What's Needed for New Features

### Settings Refactor with Function Defaults

**Stack Required:**

- Zod v4 (already installed) - for settings schema validation
- TypeScript strict mode (already enabled) - for type inference

**Why:** Settings already use a key-value store with JSON values. Zod 4 provides excellent type inference for validation. No new dependencies needed.

**Implementation Notes:**

```typescript
// Use Zod v4's safeParse for settings validation
import { z } from 'zod';

const FunctionDefaultsSchema = z.object({
	model: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().int().positive().optional()
});
```

### Prompt Execution Endpoint and UI

**Stack Required:**

- OpenCode SDK ^1.2.1 (UPDATE from 1.1.53) - for session.prompt with model selection
- sveltekit-sse ^1.0.0 (NEW) - for streaming responses to UI

**Why OpenCode SDK 1.2.1:**

- Session-based execution with per-run model selection
- Built-in temperature and maxTokens support
- Provider/model abstraction (e.g., `anthropic/claude-3-5-sonnet-20241022`)

**Why sveltekit-sse:**

- Clean produce/source API for SSE in SvelteKit
- Automatic heartbeat and reconnection handling
- Multi-channel support for different event types
- Benchmark score 92, actively maintained

**Implementation Pattern:**

```typescript
// Server: +server.ts streaming endpoint
import { produce } from 'sveltekit-sse';
import { executeAgentWithSession } from '$lib/server/services/opencode.service';

export function POST() {
	return produce(async function start({ emit, lock }) {
		// Stream AI response chunks
		const result = await executeAgentWithSession({
			model: { providerID: 'anthropic', modelID: 'claude-3-5-sonnet-20241022' },
			agent: 'prompt-executor',
			parts: [{ type: 'text', text: promptContent }],
			temperature: 0.7,
			maxTokens: 4096
		});

		emit('content', JSON.stringify(result));
	});
}
```

```svelte
<!-- Client: consume SSE stream -->
<script>
	import { source } from 'sveltekit-sse';

	const connection = source('/api/execute');
	const content = connection.select('content').json();
</script>

<div class="prose">
	{$content?.text}
</div>
```

### Snippet Variable Replacement and Preview

**Stack Required:**

- Custom regex implementation (no external dependency needed)
- TypeScript for type-safe variable definitions

**Why Custom Implementation:**

- Simple {{VAR}} pattern doesn't need full templating engine
- Mustache/Handlebars add unnecessary complexity for this use case
- Real-time preview requires minimal overhead

**Implementation Pattern:**

```typescript
// Simple variable replacement utility
function replaceVariables(content: string, variables: Record<string, string>): string {
	return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		return variables[key] ?? match;
	});
}

// Variable extraction for UI
function extractVariables(content: string): string[] {
	const matches = content.matchAll(/\{\{(\w+)\}\}/g);
	return [...new Set([...matches].map((m) => m[1]))];
}
```

### Council Modes (Correct, Debate, Consensus)

**Stack Required:**

- OpenCode SDK ^1.2.1 (multi-agent execution)
- Zod v4 for response schema validation

**Why OpenCode SDK:**

- Native agent support with different temperatures/personas
- Session-based execution allows parallel agent calls
- No additional multi-agent framework needed

**Implementation Pattern:**

```typescript
// Council mode: multiple agents with different personas
async function executeCouncil(
	prompt: string,
	mode: 'correct' | 'debate' | 'consensus'
): Promise<CouncilResult> {
	const agents = getCouncilAgents(mode);

	const responses = await Promise.all(
		agents.map((agent) =>
			executeAgentWithSession({
				model: agent.model,
				agent: agent.name,
				parts: [{ type: 'text', text: agent.systemPrompt + prompt }],
				temperature: agent.temperature
			})
		)
	);

	return aggregateResponses(responses, mode);
}

// Mode-specific agent configurations
const COUNCIL_AGENTS = {
	correct: [
		{ name: 'grammar-checker', temperature: 0.1 },
		{ name: 'fact-checker', temperature: 0.2 }
	],
	debate: [
		{ name: 'proponent', temperature: 0.7 },
		{ name: 'opponent', temperature: 0.7 },
		{ name: 'moderator', temperature: 0.3 }
	],
	consensus: [
		{ name: 'analyst', temperature: 0.3 },
		{ name: 'synthesizer', temperature: 0.4 }
	]
};
```

## Installation

```bash
# Update OpenCode SDK (CRITICAL - security and features)
bun add @opencode-ai/sdk@^1.2.1

# Add SSE streaming support
bun add sveltekit-sse

# Verify all dependencies
bun install
```

## Alternatives Considered

| Recommended    | Alternative           | Why Not                                                                                                 |
| -------------- | --------------------- | ------------------------------------------------------------------------------------------------------- |
| sveltekit-sse  | Native ReadableStream | sveltekit-sse provides cleaner API, auto-reconnection, heartbeat. Native SSE requires more boilerplate. |
| sveltekit-sse  | WebSockets            | SSE is simpler for unidirectional AI streaming. WebSockets overkill for server-push only.               |
| Custom {{VAR}} | Mustache.js           | Mustache adds 12KB for simple variable replacement. Over-engineering.                                   |
| Custom {{VAR}} | Handlebars            | Even heavier than Mustache. Logic-less templates not needed here.                                       |
| OpenCode SDK   | Vercel AI SDK         | Project committed to OpenCode integration. Vercel SDK would require adapter layer.                      |
| OpenCode SDK   | Direct Anthropic API  | Bypasses OpenCode's model abstraction and session management.                                           |

## What NOT to Use

| Avoid                               | Why                                             | Use Instead                  |
| ----------------------------------- | ----------------------------------------------- | ---------------------------- |
| @anthropic-ai/sdk                   | Project uses OpenCode SDK for model abstraction | @opencode-ai/sdk             |
| Mustache/Handlebars                 | Over-engineering for simple {{VAR}} replacement | Custom regex utility         |
| Vercel AI SDK                       | Conflicts with existing OpenCode integration    | OpenCode SDK + sveltekit-sse |
| WebSocket libraries (Socket.io, ws) | SSE is simpler for unidirectional streaming     | sveltekit-sse                |
| Full templating engines (EJS, Pug)  | Security risks, overkill for snippet preview    | Custom regex                 |

## Stack Patterns by Variant

**If streaming is blocked by proxy/CDN:**

- Use polling with /api/execute-status endpoint
- Poll every 500ms for chunk updates
- Less efficient but works through any infrastructure

**If real-time preview is too slow:**

- Debounce variable changes (300ms default)
- Cache replaced content in Svelte 5 $state
- Only re-render diff, not full preview

## Version Compatibility

| Package A              | Compatible With | Notes                                          |
| ---------------------- | --------------- | ---------------------------------------------- |
| @opencode-ai/sdk@1.2.1 | SvelteKit 2.x   | No breaking changes from 1.1.x                 |
| sveltekit-sse@1.x      | SvelteKit 2.x   | Designed for SvelteKit, verified compatibility |
| Zod 4.x                | TypeScript 5.x  | Full type inference support                    |
| yaml@2.x               | All runtimes    | ESM/CJS compatible                             |

## OpenCode SDK Migration Notes

**From 1.1.53 to 1.2.1:**

1. **No breaking changes detected** - Minor version bump with new features
2. **New capabilities in 1.2.x:**
   - Improved session management
   - Better error classification
   - Enhanced streaming support
3. **Update command:**
   ```bash
   bun add @opencode-ai/sdk@^1.2.1
   ```

## Sources

- **Context7 /websites/opencode_ai** — OpenCode SDK session.prompt API, agent configuration, temperature/maxTokens (HIGH confidence)
- **Context7 /razshare/sveltekit-sse** — SSE streaming patterns, produce/source API (HIGH confidence)
- **Context7 /websites/zod_dev_v4** — Zod 4 schema validation, safeParse (HIGH confidence)
- **Context7 /eemeli/yaml** — YAML parsing for frontmatter (HIGH confidence)
- **Google Search "AI multi-agent council pattern"** — Council/debate/consensus patterns (MEDIUM confidence - web only)
- **Google Search "SvelteKit streaming AI responses SSE"** — Best practices for streaming (MEDIUM confidence - web only)
- **bun outdated output** — Current vs latest package versions (HIGH confidence)

---

_Stack research for: Prompt Management with AI Execution (Subsequent Milestone)_
_Researched: 2026-02-14_
