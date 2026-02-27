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

	/**
	 * Council workflow states
	 */
	type CouncilUIState = 'idle' | 'running' | 'complete' | 'error';

	/**
	 * Active step during execution
	 */
	type ActiveStep = 'producer' | 'reviewer' | 'fixer' | null;

	/**
	 * Result of a single council step
	 */
	interface StepResult {
		step: 'producer' | 'reviewer' | 'fixer';
		round: number;
		output: string;
		issues?: string[];
		model?: {
			providerId: string;
			modelId: string;
			displayName: string;
		};
		usage?: {
			inputTokens: number;
			outputTokens: number;
			totalTokens: number;
		};
	}

	interface Props {
		promptId: number;
		content: string;
		class?: string;
	}

	let { promptId, content, class: className = '' }: Props = $props();

	// State machine
	let uiState = $state<CouncilUIState>('idle');
	let activeStep = $state<ActiveStep>(null);
	let currentRound = $state(1);
	let stepResults = $state<StepResult[]>([]);
	let finalOutput = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let streamContent = $state('');

	// Timing for long-running steps
	let stepStartTime = $state<number | null>(null);
	let elapsedSeconds = $state(0);
	let elapsedInterval: ReturnType<typeof setInterval> | null = null;

	// SSE connection
	let connection = $state<Source | null>(null);

	// Helper function to get step index for progress calculation
	function stepIndex(step: ActiveStep): number {
		if (step === 'producer') return 1;
		if (step === 'reviewer') return 2;
		if (step === 'fixer') return 3;
		return 0;
	}

	// Derived progress calculation (0-100%)
	let progress = $derived(
		uiState === 'complete'
			? 100
			: uiState === 'idle'
				? 0
				: (((currentRound - 1) * 3 + stepIndex(activeStep)) / 9) * 100
	);

	// Derived states
	let canExecute = $derived(uiState === 'idle' && content.trim().length > 0);

	// Update elapsed time while step is running
	$effect(() => {
		if (uiState === 'running' && stepStartTime !== null) {
			const startTime = stepStartTime; // Capture for closure
			elapsedInterval = setInterval(() => {
				elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
			}, 1000);
		} else {
			if (elapsedInterval) {
				clearInterval(elapsedInterval);
				elapsedInterval = null;
			}
		}

		return () => {
			if (elapsedInterval) {
				clearInterval(elapsedInterval);
			}
		};
	});

	// Format elapsed time for display
	function formatElapsed(seconds: number): string {
		if (seconds < 60) {
			return `${seconds}s`;
		}
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	/**
	 * Start council correct workflow
	 */
	function startCouncil() {
		// Reset state
		uiState = 'running';
		activeStep = null;
		currentRound = 1;
		stepResults = [];
		streamContent = '';
		finalOutput = null;
		errorMessage = null;
		stepStartTime = Date.now();
		elapsedSeconds = 0;

		// Create SSE connection via sveltekit-sse source()
		connection = source(`/api/council/correct`, {
			options: {
				method: 'POST',
				body: JSON.stringify({ promptId, content })
			},

			// Called when connection opens
			open({ status }) {
				console.log('[CouncilCorrectPanel] Connected:', status);
			},

			// Called when connection closes
			close({ isLocal }) {
				console.log('[CouncilCorrectPanel] Closed, isLocal:', isLocal);
				if (!isLocal) {
					// Unexpected close - might indicate error
					console.warn('[CouncilCorrectPanel] Unexpected connection close');
				}
			},

			// Called on connection error
			error({ error: err }) {
				console.error('[CouncilCorrectPanel] Error:', err);
				errorMessage = 'Connection error';
				uiState = 'error';
			}
		});
	}

	// Subscribe to step_start events
	$effect(() => {
		if (!connection) return;

		const starts = connection.select('step_start');
		const unsubscribe = starts.subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'step_start';
						step: ActiveStep;
						round: number;
						data?: { input?: string };
					};
					activeStep = event.step;
					currentRound = event.round;
					streamContent = '';
				} catch {
					console.warn('[CouncilCorrectPanel] Failed to parse step_start event');
				}
			}
		});

		return unsubscribe;
	});

	// Subscribe to step_delta events
	$effect(() => {
		if (!connection) return;

		const deltas = connection.select('step_delta');
		const unsubscribe = deltas.subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'step_delta';
						data?: { delta?: string; accumulated?: string };
					};
					streamContent = event.data?.accumulated || event.data?.delta || '';
				} catch {
					console.warn('[CouncilCorrectPanel] Failed to parse step_delta event');
				}
			}
		});

		return unsubscribe;
	});

	// Subscribe to step_complete events
	$effect(() => {
		if (!connection) return;

		const completes = connection.select('step_complete');
		const unsubscribe = completes.subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'step_complete';
						step: 'producer' | 'reviewer' | 'fixer';
						round: number;
						data?: StepResult;
					};

					if (event.data) {
						stepResults = [
							...stepResults,
							{
								step: event.step,
								round: event.round,
								output: event.data.output || '',
								issues: event.data.issues,
								model: event.data.model,
								usage: event.data.usage
							}
						];
					}
				} catch {
					console.warn('[CouncilCorrectPanel] Failed to parse step_complete event');
				}
			}
		});

		return unsubscribe;
	});

	// Subscribe to round_complete events
	$effect(() => {
		if (!connection) return;

		const rounds = connection.select('round_complete');
		const unsubscribe = rounds.subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'round_complete';
						round: number;
						data?: { round?: number; issuesFound?: number };
					};
					// Round complete - next round will start
					console.log('[CouncilCorrectPanel] Round complete:', event.round);
				} catch {
					console.warn('[CouncilCorrectPanel] Failed to parse round_complete event');
				}
			}
		});

		return unsubscribe;
	});

	// Subscribe to council_complete events
	$effect(() => {
		if (!connection) return;

		const done = connection.select('council_complete');
		const unsubscribe = done.subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'council_complete';
						round: number;
						data?: {
							finalOutput?: string;
							reason?: string;
							totalSteps?: number;
						};
					};

					finalOutput = event.data?.finalOutput || null;
					uiState = 'complete';
					activeStep = null;

					// Close connection
					if (connection) {
						connection.close();
						connection = null;
					}
				} catch {
					console.warn('[CouncilCorrectPanel] Failed to parse council_complete event');
				}
			}
		});

		return unsubscribe;
	});

	// Subscribe to error events
	$effect(() => {
		if (!connection) return;

		const errors = connection.select('error');
		const unsubscribe = errors.subscribe((data) => {
			if (data) {
				try {
					const event = JSON.parse(data) as {
						type: 'error';
						message?: string;
						code?: string;
						data?: { message?: string; code?: string };
					};

					errorMessage = event.message || event.data?.message || 'Unknown error';
					uiState = 'error';
				} catch {
					console.warn('[CouncilCorrectPanel] Failed to parse error event');
					errorMessage = 'Unknown error occurred';
					uiState = 'error';
				}
			}
		});

		return unsubscribe;
	});

	/**
	 * Reset the panel to idle state
	 */
	function handleReset() {
		uiState = 'idle';
		stepResults = [];
		finalOutput = null;
		errorMessage = null;
		streamContent = '';
		activeStep = null;
		currentRound = 1;

		// Close any existing connection
		if (connection) {
			connection.close();
			connection = null;
		}
	}

	/**
	 * Get step color class
	 */
	function getStepColor(step: 'producer' | 'reviewer' | 'fixer'): string {
		switch (step) {
			case 'producer':
				return 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950';
			case 'reviewer':
				return 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950';
			case 'fixer':
				return 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950';
		}
	}

	/**
	 * Get step badge variant
	 */
	function getStepBadgeVariant(
		step: 'producer' | 'reviewer' | 'fixer'
	): 'default' | 'secondary' | 'outline' {
		switch (step) {
			case 'producer':
				return 'default';
			case 'reviewer':
				return 'secondary';
			case 'fixer':
				return 'outline';
		}
	}
</script>

<div class={cn('council-panel space-y-4', className)}>
	<!-- Progress bar -->
	{#if uiState === 'running' || uiState === 'complete'}
		<div class="space-y-2">
			<div class="flex items-center justify-between text-sm">
				<span class="font-medium">Council Progress</span>
				<span class="text-muted-foreground">
					Round {currentRound}/3 {activeStep ? `- ${activeStep}` : ''}
				</span>
			</div>
			<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
				<div class="h-full bg-primary transition-all duration-300" style="width: {progress}%"></div>
			</div>
		</div>
	{/if}

	<!-- Step results (completed steps) -->
	{#each stepResults as result, i (i)}
		<div
			class="rounded-lg border p-4"
			class:border-blue-200={result.step === 'producer'}
			class:bg-blue-50={result.step === 'producer'}
			class:dark:border-blue-900={result.step === 'producer'}
			class:dark:bg-blue-950={result.step === 'producer'}
			class:border-amber-200={result.step === 'reviewer'}
			class:bg-amber-50={result.step === 'reviewer'}
			class:dark:border-amber-900={result.step === 'reviewer'}
			class:dark:bg-amber-950={result.step === 'reviewer'}
			class:border-green-200={result.step === 'fixer'}
			class:bg-green-50={result.step === 'fixer'}
			class:dark:border-green-900={result.step === 'fixer'}
			class:dark:bg-green-950={result.step === 'fixer'}
		>
			<div class="mb-2 flex items-center gap-2">
				<Badge variant={getStepBadgeVariant(result.step)}>
					Round {result.round}
				</Badge>
				<span class="font-medium capitalize">{result.step}</span>
				{#if result.step === 'reviewer' && result.issues && result.issues.length > 0}
					<Badge variant="destructive" class="ml-auto">
						{result.issues.length} issues
					</Badge>
				{:else if result.step === 'reviewer'}
					<Badge variant="default" class="ml-auto bg-green-600">Passed</Badge>
				{/if}
			</div>
			<div class="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
				{#if result.step === 'reviewer' && result.issues && result.issues.length > 0}
					<p class="mb-2 font-medium">Issues found:</p>
					<ul class="list-inside list-disc">
						{#each result.issues as issue, j (j)}
							<li>{issue}</li>
						{/each}
					</ul>
				{:else}
					{result.output}
				{/if}
			</div>
		</div>
	{/each}

	<!-- Active step streaming -->
	{#if uiState === 'running' && activeStep}
		<div
			class="rounded-lg border p-4"
			class:border-blue-300={activeStep === 'producer'}
			class:bg-blue-50={activeStep === 'producer'}
			class:dark:border-blue-800={activeStep === 'producer'}
			class:dark:bg-blue-950={activeStep === 'producer'}
			class:border-amber-300={activeStep === 'reviewer'}
			class:bg-amber-50={activeStep === 'reviewer'}
			class:dark:border-amber-800={activeStep === 'reviewer'}
			class:dark:bg-amber-950={activeStep === 'reviewer'}
			class:border-green-300={activeStep === 'fixer'}
			class:bg-green-50={activeStep === 'fixer'}
			class:dark:border-green-800={activeStep === 'fixer'}
			class:dark:bg-green-950={activeStep === 'fixer'}
		>
			<div class="mb-2 flex items-center gap-2">
				<Badge variant={getStepBadgeVariant(activeStep)}>
					Round {currentRound}
				</Badge>
				<span class="font-medium capitalize">{activeStep}</span>
				<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
				{#if elapsedSeconds > 0}
					<span class="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
						<Clock class="h-3 w-3" />
						{formatElapsed(elapsedSeconds)}
					</span>
				{/if}
			</div>
			<div class="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
				{#if streamContent}
					{streamContent}
				{:else}
					<span class="flex items-center gap-2 text-muted-foreground">
						<Loader2 class="h-3 w-3 animate-spin" />
						{#if elapsedSeconds < 5}
							Connecting...
						{:else if elapsedSeconds < 15}
							Waiting for response...
						{:else if elapsedSeconds < 30}
							Processing request...
						{:else}
							Still working... ({formatElapsed(elapsedSeconds)})
						{/if}
					</span>
				{/if}
				<span class="inline-block w-2 animate-pulse text-primary">▊</span>
			</div>
		</div>
	{/if}

	<!-- Final output -->
	{#if uiState === 'complete' && finalOutput}
		<div
			class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950"
		>
			<div class="mb-2 flex items-center gap-2">
				<CheckCircle class="h-5 w-5 text-green-600 dark:text-green-400" />
				<h3 class="font-semibold">Final Output</h3>
			</div>
			<div class="prose prose-sm max-w-none whitespace-pre-wrap dark:prose-invert">
				{finalOutput}
			</div>
		</div>
	{/if}

	<!-- Error state -->
	{#if uiState === 'error'}
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
			<div class="flex items-start gap-3">
				<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
				<div class="flex-1">
					<p class="font-medium text-red-800 dark:text-red-200">
						{errorMessage || 'An error occurred'}
					</p>
				</div>
			</div>
			<div class="mt-3 flex gap-2">
				<Button variant="outline" size="sm" onclick={startCouncil}>
					<Play class="mr-2 h-4 w-4" />
					Retry
				</Button>
				<Button variant="ghost" size="sm" onclick={handleReset}>Dismiss</Button>
			</div>
		</div>
	{/if}

	<!-- Controls -->
	{#if uiState === 'idle'}
		<Button onclick={startCouncil} disabled={!canExecute} class="w-full">
			<Play class="mr-2 h-4 w-4" />
			Run Council Correct
		</Button>
		<p class="text-center text-xs text-muted-foreground">
			Runs producer → reviewer → fixer workflow up to 3 rounds
		</p>
	{/if}

	{#if uiState === 'complete' || uiState === 'error'}
		<Button variant="outline" onclick={handleReset} class="w-full">
			<RotateCcw class="mr-2 h-4 w-4" />
			Reset
		</Button>
	{/if}
</div>
