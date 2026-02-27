<script lang="ts">
	import { source, type Source } from 'sveltekit-sse';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import Play from 'lucide-svelte/icons/play';
	import Loader2 from 'lucide-svelte/icons/loader-2';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Clock from 'lucide-svelte/icons/clock';
	import Users from 'lucide-svelte/icons/users';

	/**
	 * Council review states
	 */
	type CouncilUIState = 'idle' | 'running' | 'complete' | 'error';

	/**
	 * Agent review result
	 */
	interface AgentResult {
		agentId: number;
		agentName: string;
		output: string;
		model: {
			providerId: string;
			modelId: string;
			displayName: string;
		};
		usage?: {
			inputTokens: number;
			outputTokens: number;
			totalTokens: number;
		};
		duration?: {
			ms: number;
			seconds: number;
		};
		status: 'streaming' | 'complete' | 'error';
		error?: string;
	}

	/**
	 * Agent state during streaming
	 */
	interface AgentState {
		id: number;
		name: string;
		status: 'pending' | 'streaming' | 'complete' | 'error';
		output: string;
		error?: string;
	}

	interface Props {
		promptId: number;
		userPrompt: string;
		class?: string;
	}

	let { promptId, userPrompt, class: className = '' }: Props = $props();

	// State machine
	let uiState = $state<CouncilUIState>('idle');
	let agentStates = $state<Map<number, AgentState>>(new Map());
	let errorMessage = $state<string | null>(null);
	let reviewSummary = $state<string | null>(null);

	// Timing
	let startTime = $state<number | null>(null);
	let elapsedSeconds = $state(0);
	let elapsedInterval: ReturnType<typeof setInterval> | null = null;

	// SSE connection
	let connection = $state<Source | null>(null);

	// Derived: all agents complete?
	let allComplete = $derived(
		uiState === 'complete' ||
			(agentStates.size > 0 &&
				Array.from(agentStates.values()).every((a) => a.status === 'complete'))
	);

	// Derived: any agent has output
	let hasAnyOutput = $derived(Array.from(agentStates.values()).some((a) => a.output.length > 0));

	// Derived: can execute
	let canExecute = $derived(uiState === 'idle' && userPrompt.trim().length > 0);

	// Update elapsed time
	$effect(() => {
		if (uiState === 'running' && startTime !== null) {
			const capturedStart = startTime;
			elapsedInterval = setInterval(() => {
				elapsedSeconds = Math.floor((Date.now() - capturedStart) / 1000);
			}, 1000);
		} else {
			if (elapsedInterval) {
				clearInterval(elapsedInterval);
				elapsedInterval = null;
			}
		}
		return () => {
			if (elapsedInterval) clearInterval(elapsedInterval);
		};
	});

	function formatElapsed(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	function getAgentColorClass(id: number): string {
		const colors = [
			'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
			'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
			'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
		];
		return colors[(id - 1) % colors.length];
	}

	function getAgentBorderColorClass(id: number): string {
		const colors = [
			'border-blue-300 dark:border-blue-700',
			'border-amber-300 dark:border-amber-700',
			'border-green-300 dark:border-green-700'
		];
		return colors[(id - 1) % colors.length];
	}

	/**
	 * Start council review
	 */
	function startCouncilReview() {
		// Reset state
		uiState = 'running';
		agentStates = new Map();
		errorMessage = null;
		reviewSummary = null;
		startTime = Date.now();
		elapsedSeconds = 0;

		// Create SSE connection
		connection = source(`/api/council/review`, {
			options: {
				method: 'POST',
				body: JSON.stringify({ promptId, userPrompt })
			},

			open({ status }) {
				console.log('[CouncilReviewPanel] Connected:', status);
			},

			close({ isLocal }) {
				console.log('[CouncilReviewPanel] Closed, isLocal:', isLocal);
			},

			error({ error: err }) {
				console.error('[CouncilReviewPanel] Error:', err);
				errorMessage = 'Connection error';
				uiState = 'error';
			}
		});
	}

	// Subscribe to review_start
	$effect(() => {
		if (!connection) return;
		const unsub = connection.select('review_start').subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'review_start';
						data: { agentCount: number; agents: { id: number; name: string }[] };
					};
					// Initialize agent states
					const newStates = new Map<number, AgentState>();
					for (const agent of event.data.agents) {
						newStates.set(agent.id, {
							id: agent.id,
							name: agent.name,
							status: 'pending',
							output: ''
						});
					}
					agentStates = newStates;
				} catch {
					console.warn('[CouncilReviewPanel] Failed to parse review_start');
				}
			}
		});
		return unsub;
	});

	// Subscribe to agent_start
	$effect(() => {
		if (!connection) return;
		const unsub = connection.select('agent_start').subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'agent_start';
						agentId: number;
						agentName: string;
					};
					const newStates = new Map(agentStates);
					const state = newStates.get(event.agentId);
					if (state) {
						state.status = 'streaming';
					}
					agentStates = newStates;
				} catch {
					console.warn('[CouncilReviewPanel] Failed to parse agent_start');
				}
			}
		});
		return unsub;
	});

	// Subscribe to agent_delta
	$effect(() => {
		if (!connection) return;
		const unsub = connection.select('agent_delta').subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'agent_delta';
						agentId: number;
						data?: { delta?: string; accumulated?: string };
					};
					const newStates = new Map(agentStates);
					const state = newStates.get(event.agentId);
					if (state && event.data) {
						state.output = event.data.accumulated || state.output + (event.data.delta || '');
					}
					agentStates = newStates;
				} catch {
					console.warn('[CouncilReviewPanel] Failed to parse agent_delta');
				}
			}
		});
		return unsub;
	});

	// Subscribe to agent_complete
	$effect(() => {
		if (!connection) return;
		const unsub = connection.select('agent_complete').subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'agent_complete';
						agentId: number;
						data?: AgentResult;
					};
					const newStates = new Map(agentStates);
					const state = newStates.get(event.agentId);
					if (state && event.data) {
						state.status = event.data.status;
						state.output = event.data.output || state.output;
						state.error = event.data.error;
					}
					agentStates = newStates;
				} catch {
					console.warn('[CouncilReviewPanel] Failed to parse agent_complete');
				}
			}
		});
		return unsub;
	});

	// Subscribe to review_complete
	$effect(() => {
		if (!connection) return;
		const unsub = connection.select('review_complete').subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'review_complete';
						data: { results: AgentResult[]; summary: string };
					};
					reviewSummary = event.data.summary;
					uiState = 'complete';

					if (connection) {
						connection.close();
						connection = null;
					}
				} catch {
					console.warn('[CouncilReviewPanel] Failed to parse review_complete');
				}
			}
		});
		return unsub;
	});

	// Subscribe to error
	$effect(() => {
		if (!connection) return;
		const unsub = connection.select('error').subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'error';
						agentId?: number;
						data?: { message?: string };
					};
					if (event.agentId !== undefined) {
						// Agent-level error
						const newStates = new Map(agentStates);
						const state = newStates.get(event.agentId!);
						if (state) {
							state.status = 'error';
							state.error = event.data?.message || 'Unknown error';
						}
						agentStates = newStates;
					} else {
						// Global error
						errorMessage = event.data?.message || 'Unknown error';
						uiState = 'error';
					}
				} catch {
					console.warn('[CouncilReviewPanel] Failed to parse error');
					errorMessage = 'Unknown error occurred';
					uiState = 'error';
				}
			}
		});
		return unsub;
	});

	function handleReset() {
		uiState = 'idle';
		agentStates = new Map();
		reviewSummary = null;
		errorMessage = null;
		startTime = null;
		elapsedSeconds = 0;
		if (connection) {
			connection.close();
			connection = null;
		}
	}
</script>

<div class={cn('council-review-panel space-y-4', className)}>
	<!-- Header with status -->
	{#if uiState === 'running' || uiState === 'complete'}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Users class="h-5 w-5 text-muted-foreground" />
				<span class="font-medium">Council Review</span>
				{#if uiState === 'running'}
					<Badge variant="secondary" class="animate-pulse">
						<Loader2 class="mr-1 h-3 w-3" />
						Reviewing...
					</Badge>
				{:else if uiState === 'complete'}
					<Badge variant="default" class="bg-green-600">
						<CheckCircle class="mr-1 h-3 w-3" />
						Complete
					</Badge>
				{/if}
			</div>
			{#if elapsedSeconds > 0}
				<span class="flex items-center gap-1 text-sm text-muted-foreground">
					<Clock class="h-4 w-4" />
					{formatElapsed(elapsedSeconds)}
				</span>
			{/if}
		</div>
	{/if}

	<!-- Parallel agent cards -->
	{#if agentStates.size > 0}
		<div class="grid gap-4 md:grid-cols-3">
			{#each Array.from(agentStates.values()) as agent (agent.id)}
				<div
					class="rounded-lg border p-4 transition-colors"
					class:border-blue-200={agent.id === 1}
					class:bg-blue-50={agent.id === 1}
					class:dark:border-blue-800={agent.id === 1}
					class:dark:bg-blue-950={agent.id === 1}
					class:border-amber-200={agent.id === 2}
					class:bg-amber-50={agent.id === 2}
					class:dark:border-amber-800={agent.id === 2}
					class:dark:bg-amber-950={agent.id === 2}
					class:border-green-200={agent.id === 3}
					class:bg-green-50={agent.id === 3}
					class:dark:border-green-800={agent.id === 3}
					class:dark:bg-green-950={agent.id === 3}
				>
					<!-- Agent header -->
					<div class="mb-2 flex items-center gap-2">
						<span class="text-sm font-medium">{agent.name}</span>
						{#if agent.status === 'streaming'}
							<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
						{:else if agent.status === 'complete'}
							<CheckCircle class="h-4 w-4 text-green-600 dark:text-green-400" />
						{:else if agent.status === 'error'}
							<AlertCircle class="h-4 w-4 text-red-500" />
						{:else if agent.status === 'pending'}
							<Clock class="h-4 w-4 text-muted-foreground" />
						{/if}
					</div>

					<!-- Agent output -->
					<div class="prose prose-sm max-w-none dark:prose-invert">
						{#if agent.status === 'pending'}
							<p class="text-sm text-muted-foreground italic">Waiting to start...</p>
						{:else if agent.output}
							<div class="max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
								{agent.output}
								{#if agent.status === 'streaming'}
									<span class="inline-block w-2 animate-pulse text-primary">▊</span>
								{/if}
							</div>
						{:else if agent.status === 'streaming'}
							<p class="flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 class="h-3 w-3 animate-spin" />
								{#if elapsedSeconds < 5}
									Connecting...
								{:else}
									Processing...
								{/if}
							</p>
						{:else if agent.status === 'error'}
							<p class="text-sm text-red-600 dark:text-red-400">
								{agent.error || 'Error occurred'}
							</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Review summary -->
	{#if uiState === 'complete' && reviewSummary}
		<div
			class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950"
		>
			<div class="mb-2 flex items-center gap-2">
				<CheckCircle class="h-5 w-5 text-green-600 dark:text-green-400" />
				<h3 class="font-semibold">Review Complete</h3>
			</div>
			<p class="text-sm">{reviewSummary}</p>
		</div>
	{/if}

	<!-- Error state -->
	{#if uiState === 'error' && errorMessage}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
			<div class="flex items-start gap-3">
				<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
				<div class="flex-1">
					<p class="font-medium text-red-800 dark:text-red-200">{errorMessage}</p>
				</div>
			</div>
			<div class="mt-3 flex gap-2">
				<Button variant="outline" size="sm" onclick={startCouncilReview}>
					<Play class="mr-2 h-4 w-4" />
					Retry
				</Button>
				<Button variant="ghost" size="sm" onclick={handleReset}>Dismiss</Button>
			</div>
		</div>
	{/if}

	<!-- Controls -->
	{#if uiState === 'idle'}
		<div class="space-y-3">
			<Button onclick={startCouncilReview} disabled={!canExecute} class="w-full">
				<Play class="mr-2 h-4 w-4" />
				Run Council Review
			</Button>
			<div class="text-center text-xs text-muted-foreground">
				<p class="mb-1">3 AI agents will review your prompt in parallel:</p>
				<p class="flex flex-wrap justify-center gap-2">
					<span class="rounded bg-blue-100 px-2 py-0.5 dark:bg-blue-900">Code Quality</span>
					<span class="rounded bg-amber-100 px-2 py-0.5 dark:bg-amber-900">Security</span>
					<span class="rounded bg-green-100 px-2 py-0.5 dark:bg-green-900">Best Practices</span>
				</p>
			</div>
		</div>
	{/if}

	{#if uiState === 'complete' || uiState === 'error'}
		<Button variant="outline" onclick={handleReset} class="w-full">
			<RotateCcw class="mr-2 h-4 w-4" />
			Reset
		</Button>
	{/if}
</div>
