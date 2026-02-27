# Phase 06: Streaming Execution - Research

**Researched:** 2025-02-27
**Domain:** SSE streaming, OpenCode SDK event system, real-time AI response display
**Confidence:** HIGH

## Summary

This phase requires implementing SSE streaming for AI prompt execution. The OpenCode SDK does not provide direct streaming API for `session.prompt()`, but it **does emit real-time events** via `event.subscribe()` that include `message.part.delta` events containing incremental text chunks. The implementation pattern is: **bridge OpenCode events to SSE** using sveltekit-sse.

**Primary recommendation:** Create an SSE endpoint that subscribes to OpenCode events and forwards `message.part.delta` chunks to the client. Use sveltekit-sse for both server (produce) and client (source) with built-in heartbeat and reconnection support.

## Standard Stack

### Core

| Library          | Version | Purpose                           | Why Standard                                                                         |
| ---------------- | ------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| sveltekit-sse    | ^0.7.x  | SSE server/consumer for SvelteKit | Purpose-built for SvelteKit, handles heartbeats, reconnection, cleanup automatically |
| @opencode-ai/sdk | ^1.2.6  | Event subscription for streaming  | Already in use; `event.subscribe()` provides `message.part.delta` events             |

### Supporting

| Library         | Version | Purpose                    | When to Use                  |
| --------------- | ------- | -------------------------- | ---------------------------- |
| AbortController | Native  | Client-side abort handling | When user clicks stop button |

### Alternatives Considered

| Instead of      | Could Use            | Tradeoff                                                             |
| --------------- | -------------------- | -------------------------------------------------------------------- |
| sveltekit-sse   | Custom fetch SSE     | sveltekit-sse handles reconnection, cleanup, heartbeat automatically |
| OpenCode events | Direct streaming API | Direct streaming API doesn't exist; events are the only way          |

**Installation:**

```bash
npm install sveltekit-sse
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── routes/api/prompts/[id]/
│   └── stream/
│       └── +server.ts        # SSE endpoint forwarding OpenCode events
├── lib/server/services/
│   └── streaming.service.ts   # OpenCode event subscription, delta processing
├── lib/components/prompts/
│   └── execution-stream.svelte  # Client-side streaming component
```

### Pattern 1: SSE Bridge Endpoint (Server-Side)

**What:** SSE endpoint that subscribes to OpenCode events and forwards relevant chunks to the client.

**When to use:** This is the primary pattern for streaming AI responses.

**Example:**

```typescript
// src/routes/api/prompts/[id]/stream/+server.ts
import { produce } from 'sveltekit-sse';
import { getOpencodeClient } from '$lib/server/services/opencode.service';
import { resolveFunctionSettings } from '$lib/server/services/settings-cascade.service';

export function POST(event) {
	return produce(
		async function start({ emit, lock }) {
			const { params, request } = event;
			const body = await request.json();
			const { content, overrides } = body;

			// Get OpenCode client
			const client = await getOpencodeClient();

			// Subscribe to events for this session
			const events = await client.event.subscribe();
			let sessionID: string | null = null;
			let fullContent = '';

			// Start event processing in background
			const eventProcessor = (async () => {
				for await (const event of events.stream) {
					// Handle delta events - these contain streaming text
					if (event.type === 'message.part.delta') {
						const props = event.properties as {
							sessionID: string;
							messageID: string;
							partID: string;
							field: string;
							delta: string;
						};

						// Filter to only our session
						if (sessionID && props.sessionID === sessionID) {
							fullContent += props.delta;
							const { error } = emit(
								'delta',
								JSON.stringify({
									delta: props.delta,
									accumulated: fullContent
								})
							);
							if (error) {
								lock.set(false);
								return;
							}
						}
					}

					// Handle session idle - execution complete
					if (event.type === 'session.idle') {
						const props = event.properties as { sessionID: string };
						if (sessionID && props.sessionID === sessionID) {
							emit('complete', JSON.stringify({ content: fullContent }));
							lock.set(false);
							return;
						}
					}

					// Handle errors
					if (event.type === 'session.error') {
						emit('error', JSON.stringify({ message: 'Execution failed' }));
						lock.set(false);
						return;
					}
				}
			})();

			// Create session and send prompt
			const sessionResult = await client.session.create();
			if (sessionResult.error) {
				emit('error', JSON.stringify({ message: 'Failed to create session' }));
				lock.set(false);
				return;
			}
			sessionID = (sessionResult.data as { id: string }).id;

			// Resolve settings
			const settings = await resolveFunctionSettings({
				functionType: 'executor',
				promptId: parseInt(params.id),
				runOverrides: overrides
			});

			// Send prompt (non-blocking - events will stream)
			await client.session.prompt({
				path: { id: sessionID },
				body: {
					parts: [{ type: 'text', text: content }],
					model: {
						providerID: settings.modelId.value.split('/')[0],
						modelID: settings.modelId.value.split('/')[1]
					}
				}
			});

			// Cleanup on disconnect
			return function cleanup() {
				if (sessionID) {
					client.session.delete({ path: { id: sessionID } }).catch(() => {});
				}
			};
		},
		{
			ping: 15000, // Heartbeat every 15 seconds
			stop() {
				console.log('Stream stopped - client disconnected');
			}
		}
	);
}
```

_Source: OpenCode SDK types, sveltekit-sse documentation_

### Pattern 2: Client-Side Streaming Consumer (Svelte 5)

**What:** Svelte 5 component that consumes SSE stream with reconnection and abort support.

**When to use:** In execution-panel or dedicated streaming component.

**Example:**

```svelte
<script lang="ts">
	import { source } from 'sveltekit-sse';
	import { Button } from '$lib/components/ui/button';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import Square from '@lucide/svelte/icons/square';

	interface Props {
		promptId: number;
		content: string;
		overrides?: Record<string, unknown>;
		oncomplete?: (result: { content: string }) => void;
		onerror?: (error: { message: string }) => void;
	}

	let { promptId, content, overrides, oncomplete, onerror }: Props = $props();

	// Connection state
	let connection = $state<ReturnType<typeof source> | null>(null);
	let isStreaming = $state(false);
	let streamContent = $state('');
	let reconnectAttempts = $state(0);

	function startStream() {
		streamContent = '';
		isStreaming = true;
		reconnectAttempts = 0;

		connection = source(`/api/prompts/${promptId}/stream`, {
			method: 'POST',
			body: JSON.stringify({ content, overrides }),

			open({ status }) {
				console.log('Stream connected:', status);
				reconnectAttempts = 0;
			},

			close({ connect, isLocal }) {
				if (!isLocal && reconnectAttempts < 3) {
					reconnectAttempts++;
					setTimeout(() => connect(), 1000 * reconnectAttempts);
				} else {
					isStreaming = false;
				}
			},

			error({ error }) {
				console.error('Stream error:', error);
				onerror?.({ message: 'Connection error' });
			}
		});

		// Subscribe to delta events
		const deltas = connection.select('delta');
		$effect(() => {
			const data = $deltas;
			if (data) {
				try {
					const parsed = JSON.parse(data);
					streamContent = parsed.accumulated;
				} catch {
					/* ignore parse errors */
				}
			}
		});

		// Subscribe to completion events
		const complete = connection.select('complete');
		$effect(() => {
			const data = $complete;
			if (data) {
				try {
					const parsed = JSON.parse(data);
					oncomplete?.({ content: parsed.content });
					isStreaming = false;
				} catch {
					/* ignore */
				}
			}
		});

		// Subscribe to error events
		const errors = connection.select('error');
		$effect(() => {
			const data = $errors;
			if (data) {
				try {
					const parsed = JSON.parse(data);
					onerror?.({ message: parsed.message });
					isStreaming = false;
				} catch {
					/* ignore */
				}
			}
		});
	}

	function abortStream() {
		if (connection) {
			connection.close();
			connection = null;
		}
		isStreaming = false;
		streamContent = '';
	}
</script>

<div class="streaming-execution">
	{#if isStreaming}
		<div class="streaming-content prose">
			{streamContent || 'Starting execution...'}
			<span class="animate-pulse">▊</span>
		</div>
		<Button variant="destructive" size="sm" onclick={abortStream}>
			<Square class="mr-2 h-4 w-4" />
			Stop
		</Button>
	{:else}
		<Button onclick={startStream}>
			<Loader2 class="mr-2 h-4 w-4" />
			Execute with Streaming
		</Button>
	{/if}
</div>
```

_Source: sveltekit-sse documentation, Context7_

### Anti-Patterns to Avoid

- **Polling the execution endpoint:** Don't poll the existing `/execute` endpoint; use SSE for real-time updates.
- **Ignoring cleanup:** Always clean up OpenCode sessions in the SSE `stop`/cleanup function to prevent resource leaks.
- **Buffering all events client-side:** Use `select()` to subscribe to specific event types, not all events.
- **No abort handling:** Always provide a way to close the connection and stop execution.

## Don't Hand-Roll

| Problem             | Don't Build                            | Use Instead                    | Why                                                    |
| ------------------- | -------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| SSE server endpoint | Custom Response with text/event-stream | sveltekit-sse `produce()`      | Handles heartbeats, cleanup, connection management     |
| SSE client consumer | Custom EventSource                     | sveltekit-sse `source()`       | Handles reconnection, error recovery, reactive updates |
| Heartbeat/ping      | setInterval emit                       | sveltekit-sse `ping` option    | Automatic, configurable, reliable                      |
| Reconnection logic  | Manual retry loops                     | sveltekit-sse `close` callback | Provides connect() function for retry                  |

**Key insight:** sveltekit-sse is purpose-built for SvelteKit and handles all the edge cases (cleanup, heartbeats, reconnection) that are easy to get wrong with custom implementations.

## Common Pitfalls

### Pitfall 1: Event Subscription Scope

**What goes wrong:** Subscribing to ALL OpenCode events without filtering by session ID causes the SSE stream to receive events from other sessions/concurrent executions.

**Why it happens:** OpenCode's `event.subscribe()` is global; it emits events for all sessions.

**How to avoid:** Always filter events by `sessionID` before emitting to SSE stream. Track the session ID after `session.create()` and only forward events matching that ID.

**Warning signs:** Multiple concurrent executions interfering with each other; receiving content from wrong execution.

### Pitfall 2: Session Cleanup on Client Disconnect

**What goes wrong:** Client closes browser/tab without proper cleanup; OpenCode session remains active and consumes resources.

**Why it happens:** SSE connections can drop unexpectedly; cleanup code in return function may not always run.

**How to avoid:**

1. Use sveltekit-sse's `stop` callback AND return cleanup function
2. Implement session timeout in OpenCode service
3. Track sessions in a cleanup registry

**Warning signs:** Memory growth, orphaned sessions in OpenCode logs.

### Pitfall 3: Race Condition Between Event Subscription and Prompt

**What goes wrong:** Prompt completes before event subscription is fully established, causing missed events.

**Why it happens:** Event subscription is async; prompt might complete instantly for simple queries.

**How to avoid:**

1. Establish event subscription BEFORE creating session
2. Buffer events if needed until session ID is known
3. Consider using `session.promptAsync` for async execution

**Warning signs:** Missing first few chunks; intermittent empty streams.

### Pitfall 4: Connection State Desynchronization

**What goes wrong:** UI shows "streaming" but connection is actually closed, or vice versa.

**Why it happens:** SSE connection state and UI state can get out of sync during reconnection attempts.

**How to avoid:** Use Svelte 5 `$effect` to react to connection state changes; always update `isStreaming` in `open`, `close`, and `error` callbacks.

**Warning signs:** Stuck loading spinner; UI not responding to abort.

## Code Examples

### OpenCode Event Types (from SDK)

```typescript
// message.part.delta - Incremental text chunk
type EventMessagePartDelta = {
	type: 'message.part.delta';
	properties: {
		sessionID: string;
		messageID: string;
		partID: string;
		field: string;
		delta: string; // <-- The incremental text
	};
};

// session.idle - Execution complete
type EventSessionIdle = {
	type: 'session.idle';
	properties: {
		sessionID: string;
	};
};

// session.status - Status changes
type EventSessionStatus = {
	type: 'session.status';
	properties: {
		sessionID: string;
		status: { type: 'busy' } | { type: 'idle' };
	};
};

// session.error - Execution error
type EventSessionError = {
	type: 'session.error';
	properties: {
		sessionID: string;
		// error details
	};
};
```

_Source: @opencode-ai/sdk v1.2.6 types_

### SSE Endpoint with AbortController

```typescript
// Using AbortController for clean abort
export function POST(event) {
	const abortController = new AbortController();

	return produce(
		async function start({ emit, lock }) {
			// Listen for abort
			abortController.signal.addEventListener('abort', () => {
				// Cancel OpenCode session
				lock.set(false);
			});

			// ... streaming logic
		},
		{
			ping: 15000,
			stop() {
				abortController.abort();
			}
		}
	);
}
```

### Transforming Existing Execution Panel

The existing `execution-panel.svelte` uses a simple fetch POST to `/execute`. To add streaming:

1. Add a "Stream" toggle or always use streaming
2. Replace `fetch()` with `source()` from sveltekit-sse
3. Update state machine: `idle → streaming → complete` (instead of `loading`)
4. Add abort button that calls `connection.close()`

## State of the Art

| Old Approach       | Current Approach       | When Changed | Impact                                   |
| ------------------ | ---------------------- | ------------ | ---------------------------------------- |
| Custom EventSource | sveltekit-sse source() | 2024+        | Automatic reconnection, reactive updates |
| Polling for status | Real-time event stream | OpenCode SDK | True real-time, lower latency            |
| Full response only | Delta streaming        | OpenCode SDK | Progressive rendering, better UX         |

**Deprecated/outdated:**

- Direct `EventSource` API: Use sveltekit-sse for SvelteKit integration
- `session.prompt` expecting streaming: It returns complete response; use events for streaming

## Open Questions

1. **Should we keep the non-streaming execute endpoint?**
   - What we know: Current `/execute` endpoint works for non-streaming cases
   - What's unclear: Whether streaming should replace it entirely or be an option
   - Recommendation: Keep both; add `/stream` endpoint. Let user toggle streaming mode.

2. **What is the optimal ping interval?**
   - What we know: Default is 30 seconds; can configure lower
   - What's unclear: Balance between faster disconnect detection and network overhead
   - Recommendation: 15 seconds for interactive AI execution (users expect responsiveness)

3. **Should we buffer full content server-side or client-side?**
   - What we know: `delta` events include accumulated content in example
   - What's unclear: Memory implications for very long responses
   - Recommendation: Server tracks accumulated content per session; client can choose to buffer or not

4. **How to handle reconnection mid-stream?**
   - What we know: sveltekit-sse supports automatic reconnection
   - What's unclear: Whether OpenCode session continues after disconnect; how to resume
   - Recommendation: On reconnect, fetch current message state via `session.message` API and continue from there

## Sources

### Primary (HIGH confidence)

- `/razshare/sveltekit-sse` - produce(), source(), ping, reconnection, cleanup patterns
- `/anomalyco/opencode` - event.subscribe(), EventMessagePartDelta, session events
- `@opencode-ai/sdk` v1.2.6 types - Event type definitions, streaming patterns

### Secondary (MEDIUM confidence)

- OpenCode ACP README - Note about streaming limitations, event-based approach
- sveltekit-sse GitHub README - Additional patterns and edge cases

### Tertiary (LOW confidence)

- None - all findings verified via Context7 or official SDK types

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - sveltekit-sse is the de-facto standard; OpenCode events are verified in SDK types
- Architecture: HIGH - Pattern is clear: bridge events to SSE with filtering
- Pitfalls: HIGH - Based on verified event structure and SSE patterns

**Research date:** 2025-02-27
**Valid until:** 2025-06-27 (4 months - stable libraries, but OpenCode SDK may add direct streaming)
