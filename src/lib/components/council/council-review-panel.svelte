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
	import Square from 'lucide-svelte/icons/square';
	import Edit from 'lucide-svelte/icons/edit';
	import X from 'lucide-svelte/icons/x';
	import Search from 'lucide-svelte/icons/search';

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
		/** Called when the council review state changes */
		onstatechange?: (state: CouncilUIState) => void;
		/** Called when council review completes or is aborted with results */
		oncomplete?: (results: {
			agentStates: Map<number, AgentState>;
			summary: string | null;
		}) => void;
		/** Disable execution (e.g., when required variables are missing) */
		disabled?: boolean;
	}

	let {
		promptId,
		userPrompt,
		class: className = '',
		onstatechange,
		oncomplete,
		disabled = false
	}: Props = $props();

	// State machine
	let uiState = $state<CouncilUIState>('idle');
	let agentStates = $state<Map<number, AgentState>>(new Map());
	let agentList = $state<{ id: number; name: string }[]>([]);
	let errorMessage = $state<string | null>(null);
	let reviewSummary = $state<string | null>(null);

	// Notify parent of state changes
	$effect(() => {
		onstatechange?.(uiState);
	});

	// Timing
	let startTime = $state<number | null>(null);
	let elapsedSeconds = $state(0);
	let elapsedInterval: ReturnType<typeof setInterval> | null = null;

	// SSE connection
	let connection = $state<Source | null>(null);

	// Agent override modal state
	let showOverrideModal = $state(false);
	let overrideAgentId = $state<number | null>(null);
	let overrideAgentName = $state('');
	let promptsList = $state<{ id: number; title: string; versionCount?: number }[]>([]);
	let promptsLoading = $state(false);
	let searchQuery = $state('');
	// Selected override: { promptId, versionId? } - versionId null means use latest
	let selectedOverride = $state<{ promptId: number; versionId?: number } | null>(null);
	let expandedPromptId = $state<number | null>(null);
	let versionsLoading = $state(false);
	let versionsList = $state<
		{ id: number; version: string; changeNotes: string | null; createdAt: Date | null }[]
	>([]);

	// Agent overrides (promptId or versionId to use instead of linked one)
	// Key: agentId, Value: { promptId, versionId? }
	let agentOverrides = $state<Map<number, { promptId: number; versionId?: number }>>(new Map());

	// Version info for display (stores selected version names for UI feedback)
	let versionInfo = $state<Map<number, { version: string; changeNotes?: string | null }>>(
		new Map()
	);

	// Derived: filtered prompts list
	let filteredPrompts = $derived(
		searchQuery.trim()
			? promptsList.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
			: promptsList
	);

	// Derived: all agents complete?
	let allComplete = $derived(
		uiState === 'complete' ||
			(agentStates.size > 0 &&
				Array.from(agentStates.values()).every((a) => a.status === 'complete'))
	);

	// Derived: any agent has output
	let hasAnyOutput = $derived(Array.from(agentStates.values()).some((a) => a.output.length > 0));

	// Derived: can execute (considering parent's disabled prop)
	let canExecute = $derived(uiState === 'idle' && userPrompt.trim().length > 0 && !disabled);

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
	 * Open override modal for an agent
	 */
	async function openOverrideModal(agentId: number, agentName: string) {
		overrideAgentId = agentId;
		overrideAgentName = agentName;
		searchQuery = '';
		// Get existing override for this agent (could be { promptId, versionId? })
		const existingOverride = agentOverrides.get(agentId);
		if (existingOverride) {
			selectedOverride = {
				promptId: existingOverride.promptId,
				versionId: existingOverride.versionId
			};
			expandedPromptId = existingOverride.promptId;
		} else {
			selectedOverride = null;
			expandedPromptId = null;
		}
		versionsList = [];
		showOverrideModal = true;

		// Always fetch fresh prompts list (don't cache to ensure we have latest)
		promptsLoading = true;
		try {
			const response = await fetch('/api/prompts?limit=100');
			if (response.ok) {
				const data = await response.json();
				console.log('[CouncilReviewPanel] Prompts API response:', data);
				// API returns { data: { prompts: [...], totalCount }, pagination: {...} }
				const promptArray = data.data?.prompts || [];
				console.log('[CouncilReviewPanel] Prompt array:', promptArray);
				promptsList = (promptArray || []).map(
					(p: { id: number; title: string; latestVersionId?: number }) => ({
						id: p.id,
						title: p.title,
						versionCount: p.latestVersionId ? 1 : 0
					})
				);
				console.log('[CouncilReviewPanel] Mapped prompts list:', promptsList);
			} else {
				console.error('[CouncilReviewPanel] API error:', response.status, response.statusText);
			}
		} catch (err) {
			console.error('[CouncilReviewPanel] Failed to fetch prompts:', err);
		}
		promptsLoading = false;

		// If we have an expanded prompt, load its versions
		if (expandedPromptId) {
			await loadVersionsForPrompt(expandedPromptId);
		}
	}

	/**
	 * Close override modal
	 */
	function closeOverrideModal() {
		showOverrideModal = false;
		overrideAgentId = null;
		overrideAgentName = '';
		searchQuery = '';
		selectedOverride = null;
		expandedPromptId = null;
		versionsList = [];
	}

	/**
	 * Load versions for a specific prompt
	 */
	async function loadVersionsForPrompt(promptId: number) {
		versionsLoading = true;
		versionsList = [];
		try {
			const response = await fetch(`/api/prompts/${promptId}/versions`);
			if (response.ok) {
				const data = await response.json();
				console.log('[CouncilReviewPanel] Versions API response for prompt', promptId, ':', data);
				versionsList = (data.data?.versions || []).map(
					(v: {
						id: number;
						version: string;
						changeNotes: string | null;
						createdAt: string | null;
					}) => ({
						id: v.id,
						version: v.version,
						changeNotes: v.changeNotes,
						createdAt: v.createdAt ? new Date(v.createdAt) : null
					})
				);
				console.log('[CouncilReviewPanel] Mapped versions list:', versionsList);
			} else {
				console.error('[CouncilReviewPanel] Versions API error:', response.status);
			}
		} catch (err) {
			console.error('[CouncilReviewPanel] Failed to fetch versions:', err);
		}
		versionsLoading = false;
	}

	/**
	 * Toggle expand/collapse for a prompt to show versions
	 */
	async function togglePromptExpand(promptId: number) {
		if (expandedPromptId === promptId) {
			// Collapse
			expandedPromptId = null;
			versionsList = [];
		} else {
			// Expand and load versions
			expandedPromptId = promptId;
			await loadVersionsForPrompt(promptId);
		}
	}

	/**
	 * Select a prompt (using latest version)
	 */
	function selectPrompt(promptId: number) {
		if (selectedOverride?.promptId === promptId && !selectedOverride.versionId) {
			// Already selected with no version - deselect
			selectedOverride = null;
		} else {
			// Select prompt with latest version (no versionId)
			selectedOverride = { promptId };
		}
	}

	/**
	 * Select a specific version of a prompt
	 */
	function selectVersion(promptId: number, versionId: number) {
		if (selectedOverride?.promptId === promptId && selectedOverride.versionId === versionId) {
			// Already selected - deselect to use latest
			selectedOverride = { promptId };
		} else {
			selectedOverride = { promptId, versionId };
		}
	}

	/**
	 * Apply override for an agent
	 */
	function applyOverride() {
		if (overrideAgentId !== null && selectedOverride) {
			agentOverrides = new Map(agentOverrides).set(overrideAgentId, selectedOverride);
			// Store version info for display
			const versionId = selectedOverride.versionId;
			if (versionId !== undefined) {
				const version = versionsList.find((v) => v.id === versionId);
				if (version) {
					versionInfo = new Map(versionInfo).set(overrideAgentId, {
						version: version.version,
						changeNotes: version.changeNotes
					});
				}
			} else {
				versionInfo.delete(overrideAgentId);
				versionInfo = new Map(versionInfo);
			}
		} else if (overrideAgentId !== null) {
			// Remove override if none selected
			const newOverrides = new Map(agentOverrides);
			newOverrides.delete(overrideAgentId);
			agentOverrides = newOverrides;
			// Clear version info too
			versionInfo.delete(overrideAgentId);
			versionInfo = new Map(versionInfo);
		}
		closeOverrideModal();
	}

	/**
	 * Clear override for an agent
	 */
	function clearOverride(agentId: number) {
		const newOverrides = new Map(agentOverrides);
		newOverrides.delete(agentId);
		agentOverrides = newOverrides;
	}

	/**
	 * Check if agent has an override
	 */
	function hasOverride(agentId: number): boolean {
		return agentOverrides.has(agentId);
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

		// Build overrides object (API expects Record<agentId, { promptId, versionId? }>)
		const overrides: Record<number, { promptId: number; versionId?: number }> = {};
		for (const [agentId, override] of agentOverrides) {
			overrides[agentId] = override;
		}

		// Create SSE connection
		connection = source(`/api/council/review`, {
			options: {
				method: 'POST',
				body: JSON.stringify({ promptId, userPrompt, agentOverrides: overrides })
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
					// Store agent list for display
					agentList = event.data.agents;
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
						const newOutput = event.data.accumulated || state.output + (event.data.delta || '');
						state.output = newOutput;
						console.log(
							'[CouncilReviewPanel] agent_delta for',
							event.agentId,
							'- output length:',
							newOutput.length
						);
					}
					agentStates = newStates;
				} catch (err) {
					console.warn('[CouncilReviewPanel] Failed to parse agent_delta:', err);
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
					console.log(
						'[CouncilReviewPanel] agent_complete for',
						event.agentId,
						'- has output:',
						!!event.data?.output,
						'length:',
						event.data?.output?.length || 0
					);
					const newStates = new Map(agentStates);
					const state = newStates.get(event.agentId);
					if (state && event.data) {
						state.status = event.data.status;
						// Always prefer the final output from agent_complete
						if (event.data.output) {
							state.output = event.data.output;
						}
						state.error = event.data.error;
					}
					agentStates = newStates;
				} catch (err) {
					console.warn('[CouncilReviewPanel] Failed to parse agent_complete:', err);
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
					console.log('[CouncilReviewPanel] review_complete received:', event);

					// Update agent states with final results from all agents
					// This ensures outputs are displayed even if individual events were missed
					const newStates = new Map(agentStates);
					for (const result of event.data.results) {
						const state = newStates.get(result.agentId);
						if (state) {
							// Always use the final output from the result if available
							if (result.output) {
								state.output = result.output;
							}
							state.status = result.status;
							if (result.error) {
								state.error = result.error;
							}
						} else {
							// Agent wasn't in the initial list, add it
							newStates.set(result.agentId, {
								id: result.agentId,
								name: result.agentName,
								status: result.status,
								output: result.output || '',
								error: result.error
							});
						}
					}
					agentStates = newStates;
					console.log('[CouncilReviewPanel] Updated agentStates:', agentStates);

					reviewSummary = event.data.summary;
					uiState = 'complete';

					// Notify parent with final results
					if (oncomplete) {
						oncomplete({
							agentStates: agentStates,
							summary: reviewSummary
						});
					}

					if (connection) {
						connection.close();
						connection = null;
					}
				} catch (err) {
					console.warn('[CouncilReviewPanel] Failed to parse review_complete:', err);
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
		agentList = [];
		reviewSummary = null;
		errorMessage = null;
		startTime = null;
		elapsedSeconds = 0;
		if (connection) {
			connection.close();
			connection = null;
		}
	}

	/**
	 * Abort the current council review
	 */
	function abortReview() {
		if (connection) {
			connection.close();
			connection = null;
		}

		// Keep partial results if any agents completed
		const hasPartialResults = Array.from(agentStates.values()).some((a) => a.output.length > 0);

		if (hasPartialResults) {
			// Show partial results - mark running agents as aborted
			const newStates = new Map(agentStates);
			for (const [id, state] of newStates) {
				if (state.status === 'streaming' || state.status === 'pending') {
					state.status = 'error';
					state.error = 'Aborted by user';
				}
			}
			agentStates = newStates;
			uiState = 'complete'; // Show partial results
			reviewSummary = 'Review aborted by user. Showing partial results.';
		} else {
			// No results - just reset
			uiState = 'idle';
			agentStates = new Map();
			reviewSummary = null;
		}

		startTime = null;
		elapsedSeconds = 0;
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

		<!-- Abort button during execution -->
		<Button variant="destructive" onclick={abortReview} class="w-full">
			<Square class="mr-2 h-4 w-4" />
			Stop Review
		</Button>
	{/if}

	<!-- Review summary -->
	{#if uiState === 'complete' && reviewSummary}
		<div
			class="rounded-lg border p-4"
			class:border-green-200={reviewSummary !== 'Review aborted by user. Showing partial results.'}
			class:bg-green-50={reviewSummary !== 'Review aborted by user. Showing partial results.'}
			class:dark:border-green-900={reviewSummary !==
				'Review aborted by user. Showing partial results.'}
			class:dark:bg-green-950={reviewSummary !== 'Review aborted by user. Showing partial results.'}
			class:border-amber-200={reviewSummary === 'Review aborted by user. Showing partial results.'}
			class:bg-amber-50={reviewSummary === 'Review aborted by user. Showing partial results.'}
			class:dark:border-amber-900={reviewSummary ===
				'Review aborted by user. Showing partial results.'}
			class:dark:bg-amber-950={reviewSummary === 'Review aborted by user. Showing partial results.'}
		>
			<div class="mb-2 flex items-center gap-2">
				{#if reviewSummary === 'Review aborted by user. Showing partial results.'}
					<AlertCircle class="h-5 w-5 text-amber-600 dark:text-amber-400" />
				{:else}
					<CheckCircle class="h-5 w-5 text-green-600 dark:text-green-400" />
				{/if}
				<h3 class="font-semibold">
					{#if reviewSummary === 'Review aborted by user. Showing partial results.'}
						Review Aborted
					{:else}
						Review Complete
					{/if}
				</h3>
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
				<p class="mb-1">
					{agentList.length || 3} AI agents will review your prompt in parallel
					{#if agentList.length > 0}
						:
					{/if}
				</p>
				{#if agentList.length > 0}
					<p class="flex flex-wrap justify-center gap-2">
						{#each agentList as agent, i (agent.id)}
							{@const hasOverrideForAgent = hasOverride(agent.id)}
							<button
								type="button"
								class="group relative cursor-pointer rounded px-2 py-0.5 transition-colors hover:ring-2 hover:ring-primary/50"
								class:bg-blue-100={i === 0}
								class:dark:bg-blue-900={i === 0}
								class:bg-amber-100={i === 1}
								class:dark:bg-amber-900={i === 1}
								class:bg-green-100={i === 2}
								class:dark:bg-green-900={i === 2}
								class:ring-2={hasOverrideForAgent}
								class:ring-amber-500={hasOverrideForAgent}
								onclick={() => openOverrideModal(agent.id, agent.name)}
								title="Click to override prompt"
							>
								{agent.name}
								{#if hasOverrideForAgent}
									<span class="ml-1 text-amber-600 dark:text-amber-400">*</span>
								{/if}
								<Edit
									class="ml-1 inline-block h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50"
								/>
							</button>
						{/each}
					</p>
					<p class="mt-1 text-[10px] opacity-70">Click agent name to override prompt</p>
				{:else}
					<!-- Default agents when no council run yet - these are clickable -->
					<p class="flex flex-wrap justify-center gap-2">
						{#each [{ id: 1, name: 'Code Quality' }, { id: 2, name: 'Security' }, { id: 3, name: 'Best Practices' }] as defaultAgent, i (defaultAgent.id)}
							{@const hasOverrideForAgent = hasOverride(defaultAgent.id)}
							<button
								type="button"
								class="group relative cursor-pointer rounded px-2 py-0.5 transition-colors hover:ring-2 hover:ring-primary/50"
								class:bg-blue-100={i === 0}
								class:dark:bg-blue-900={i === 0}
								class:bg-amber-100={i === 1}
								class:dark:bg-amber-900={i === 1}
								class:bg-green-100={i === 2}
								class:dark:bg-green-900={i === 2}
								class:ring-2={hasOverrideForAgent}
								class:ring-amber-500={hasOverrideForAgent}
								onclick={() => openOverrideModal(defaultAgent.id, defaultAgent.name)}
								title="Click to override prompt"
							>
								{defaultAgent.name}
								{#if hasOverrideForAgent}
									<span class="ml-1 text-amber-600 dark:text-amber-400">*</span>
								{/if}
								<Edit
									class="ml-1 inline-block h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50"
								/>
							</button>
						{/each}
					</p>
					<p class="mt-1 text-[10px] opacity-70">Click agent name to override prompt</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if uiState === 'complete' || uiState === 'error'}
		<Button variant="outline" onclick={handleReset} class="w-full">
			<RotateCcw class="mr-2 h-4 w-4" />
			Reset
		</Button>
	{/if}

	<!-- Override Modal -->
	{#if showOverrideModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="override-modal-title"
		>
			<div class="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg">
				<!-- Modal header -->
				<div class="mb-4 flex items-center justify-between">
					<h3 id="override-modal-title" class="font-semibold">
						Override Prompt for {overrideAgentName}
					</h3>
					<button
						type="button"
						class="rounded p-1 hover:bg-muted"
						onclick={closeOverrideModal}
						aria-label="Close"
					>
						<X class="h-4 w-4" />
					</button>
				</div>

				<!-- Search -->
				<div class="relative mb-3">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search prompts..."
						class="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
					/>
				</div>

				<!-- Prompts list -->
				<div class="max-h-80 overflow-y-auto rounded border">
					{#if promptsLoading}
						<div class="flex items-center justify-center p-4 text-muted-foreground">
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Loading prompts...
						</div>
					{:else if filteredPrompts.length === 0}
						<div class="p-4 text-center text-muted-foreground">
							{#if searchQuery}
								No prompts match "{searchQuery}"
							{:else}
								No prompts available
							{/if}
						</div>
					{:else}
						{#each filteredPrompts as prompt (prompt.id)}
							{@const isExpanded = expandedPromptId === prompt.id}
							{@const isSelected =
								selectedOverride?.promptId === prompt.id && !selectedOverride.versionId}
							<div class="border-b last:border-b-0">
								<!-- Prompt row -->
								<div class="flex items-center">
									<button
										type="button"
										class="flex-1 px-3 py-2 text-left text-sm hover:bg-muted {isSelected
											? 'bg-primary/10 font-medium'
											: ''}"
										onclick={() => selectPrompt(prompt.id)}
									>
										<span class="flex items-center justify-between">
											<span>{prompt.title}</span>
											<span class="flex items-center gap-1">
												{#if isSelected}
													<CheckCircle class="h-4 w-4 text-primary" />
												{/if}
												<span class="text-[10px] text-muted-foreground">(latest)</span>
											</span>
										</span>
									</button>
									<!-- Expand button -->
									<button
										type="button"
										class="px-2 py-2 text-muted-foreground hover:bg-muted"
										onclick={() => togglePromptExpand(prompt.id)}
										title={isExpanded ? 'Collapse versions' : 'Show versions'}
									>
										<svg
											class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
										>
											<path d="M6 9l6 6 6-6" />
										</svg>
									</button>
								</div>
								<!-- Versions list (expandable) -->
								{#if isExpanded}
									<div class="border-t bg-muted/30">
										{#if versionsLoading}
											<div
												class="flex items-center justify-center p-2 text-xs text-muted-foreground"
											>
												<Loader2 class="mr-1 h-3 w-3 animate-spin" />
												Loading versions...
											</div>
										{:else if versionsList.length === 0}
											<div class="p-2 text-center text-xs text-muted-foreground">
												No versions found
											</div>
										{:else}
											{#each versionsList as version (version.id)}
												{@const isVersionSelected =
													selectedOverride?.promptId === prompt.id &&
													selectedOverride.versionId === version.id}
												<button
													type="button"
													class="w-full px-3 py-1.5 pr-4 text-left text-xs hover:bg-muted {isVersionSelected
														? 'bg-primary/10 font-medium'
														: ''}"
													onclick={() => selectVersion(prompt.id, version.id)}
												>
													<span class="flex items-center justify-between">
														<span>
															<span class="font-mono text-muted-foreground">{version.version}</span>
															{#if version.changeNotes}
																<span class="ml-2 text-muted-foreground"
																	>- {version.changeNotes}</span
																>
															{/if}
														</span>
														{#if isVersionSelected}
															<CheckCircle class="h-3 w-3 text-primary" />
														{/if}
													</span>
												</button>
											{/each}
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>

				<!-- Actions -->
				<div class="mt-4 flex justify-end gap-2">
					<Button variant="outline" size="sm" onclick={closeOverrideModal}>Cancel</Button>
					<Button size="sm" onclick={applyOverride}>
						{selectedOverride ? 'Apply Override' : 'Use Default'}
					</Button>
				</div>

				<!-- Info -->
				<p class="mt-2 text-center text-[10px] text-muted-foreground">
					{#if selectedOverride?.versionId}
						Selected specific version. Click prompt title for latest.
					{:else if selectedOverride}
						Using latest version. Expand to select specific version.
					{:else}
						Select a prompt to override the agent's default.
					{/if}
				</p>
			</div>
		</div>
	{/if}
</div>
