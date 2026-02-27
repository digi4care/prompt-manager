<script lang="ts">
	import { source, type Source } from 'sveltekit-sse';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import Play from '@lucide/svelte/icons/play';
	import Square from '@lucide/svelte/icons/square';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import type { RunOverrides } from '$lib/server/services/settings-cascade.service';

	/**
	 * Usage info structure matching API response
	 */
	interface Usage {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	}

	/**
	 * Duration structure matching API response
	 */
	interface Duration {
		ms: number;
		seconds: number;
	}

	/**
	 * Result passed to oncomplete callback
	 */
	interface StreamResult {
		content: string;
		usage?: Usage;
		duration?: Duration;
		model?: {
			providerId: string;
			modelId: string;
			displayName: string;
		};
	}

	/**
	 * Error info passed to onerror callback
	 */
	interface StreamError {
		message: string;
		code?: string;
	}

	interface Props {
		promptId: number;
		content: string;
		overrides?: RunOverrides;
		oncomplete?: (result: StreamResult) => void;
		onerror?: (error: StreamError) => void;
		class?: string;
	}

	let {
		promptId,
		content,
		overrides = {},
		oncomplete,
		onerror,
		class: className = ''
	}: Props = $props();

	// Connection state
	let connection = $state<Source | null>(null);
	let isStreaming = $state(false);
	let streamContent = $state('');
	let errorMessage = $state<string | null>(null);
	let reconnectAttempts = $state(0);

	// Max reconnection attempts
	const MAX_RECONNECT_ATTEMPTS = 3;

	/**
	 * Start SSE streaming connection
	 */
	function startStream() {
		// Reset state
		streamContent = '';
		errorMessage = null;
		reconnectAttempts = 0;
		isStreaming = true;

		// Create SSE connection via sveltekit-sse source()
		connection = source(`/api/prompts/${promptId}/stream`, {
			// HTTP options go inside 'options' property
			options: {
				method: 'POST',
				body: JSON.stringify({ content, overrides })
			},

			// Called when connection opens
			open({ status }) {
				console.log('[ExecutionStream] Connected:', status);
				reconnectAttempts = 0;
			},

			// Called when connection closes
			close({ connect, isLocal }) {
				console.log('[ExecutionStream] Closed, isLocal:', isLocal);

				// Don't reconnect if:
				// 1. This is a local close (user clicked stop, or complete received)
				// 2. We've exceeded max reconnect attempts
				if (isLocal || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
					isStreaming = false;
					return;
				}

				// Attempt reconnection with exponential backoff
				reconnectAttempts++;
				const delay = 1000 * reconnectAttempts; // 1s, 2s, 3s
				console.log(`[ExecutionStream] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
				setTimeout(() => connect(), delay);
			},

			// Called on connection error
			error({ error: err }) {
				console.error('[ExecutionStream] Error:', err);
				errorMessage = 'Connection error';
				onerror?.({ message: 'Connection error', code: 'CONNECTION_ERROR' });
			}
		});
	}

	// Subscribe to delta events reactively
	$effect(() => {
		if (!connection) return;

		const deltas = connection.select('delta');
		const unsubscribe = deltas.subscribe((data) => {
			if (data) {
				try {
					const parsed = JSON.parse(data) as {
						type: 'delta';
						delta: string;
						accumulated: string;
					};
					streamContent = parsed.accumulated;
				} catch {
					console.warn('[ExecutionStream] Failed to parse delta event');
				}
			}
		});

		return unsubscribe;
	});

	// Subscribe to complete events reactively
	$effect(() => {
		if (!connection) return;

		const completes = connection.select('complete');
		const unsubscribe = completes.subscribe((data) => {
			if (data) {
				try {
					const parsed = JSON.parse(data) as {
						type: 'complete';
						content: string;
						usage: Usage;
						duration: Duration;
						model: { providerId: string; modelId: string; displayName: string };
					};
					streamContent = parsed.content;
					isStreaming = false;
					oncomplete?.({
						content: parsed.content,
						usage: parsed.usage,
						duration: parsed.duration,
						model: parsed.model
					});
				} catch {
					console.warn('[ExecutionStream] Failed to parse complete event');
				}
			}
		});

		return unsubscribe;
	});

	// Subscribe to error events reactively
	$effect(() => {
		if (!connection) return;

		const errors = connection.select('error');
		const unsubscribe = errors.subscribe((data) => {
			if (data) {
				try {
					const parsed = JSON.parse(data) as {
						type: 'error';
						message: string;
						code?: string;
					};
					errorMessage = parsed.message;
					isStreaming = false;
					onerror?.({ message: parsed.message, code: parsed.code });
				} catch {
					console.warn('[ExecutionStream] Failed to parse error event');
				}
			}
		});

		return unsubscribe;
	});

	/**
	 * Abort the current stream
	 */
	function abortStream() {
		if (connection) {
			connection.close();
			connection = null;
		}
		isStreaming = false;
		streamContent = '';
		errorMessage = null;
	}

	// Derived states
	let canStart = $derived(!isStreaming && content.trim().length > 0);
</script>

<div class={cn('execution-stream space-y-3', className)}>
	{#if isStreaming}
		<!-- Streaming content display -->
		<div class="rounded-lg border bg-background p-4">
			<div class="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
				{#if streamContent}
					{streamContent}
				{:else}
					<span class="text-muted-foreground">Starting execution...</span>
				{/if}
				<!-- Cursor animation -->
				<span class="inline-block w-2 animate-pulse text-primary">▊</span>
			</div>
		</div>

		<!-- Stop button -->
		<Button variant="destructive" onclick={abortStream} class="w-full">
			<Square class="mr-2 h-4 w-4" />
			Stop
		</Button>
	{:else if errorMessage}
		<!-- Error state -->
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
			<p class="text-sm text-red-600 dark:text-red-300">{errorMessage}</p>
		</div>
		<Button onclick={startStream} disabled={!canStart} class="w-full">
			<Play class="mr-2 h-4 w-4" />
			Retry
		</Button>
	{:else}
		<!-- Execute button -->
		<Button onclick={startStream} disabled={!canStart} class="w-full">
			{#if canStart}
				<Play class="mr-2 h-4 w-4" />
			{:else}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			Execute
		</Button>
	{/if}
</div>
