<script lang="ts">
	/**
	 * CouncilDebatePanel - Timeline UI for structured debate
	 *
	 * Displays a 3-round debate progression with:
	 * - Vertical timeline with dots for rounds and star for synthesis
	 * - Collapsible rounds using Accordion
	 * - 3-column grid of agent cards per round
	 * - Prominent synthesis card after all rounds complete
	 * - Export as markdown functionality
	 */
	import { source, type Source } from 'sveltekit-sse';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$lib/components/ui/accordion';
	import { cn } from '$lib/utils';
	import MarkdownRenderer from '$lib/components/prompts/markdown-renderer.svelte';
	import DebateSynthesisCard, { type DebateSynthesis } from './debate-synthesis-card.svelte';
	import Play from 'lucide-svelte/icons/play';
	import Loader2 from 'lucide-svelte/icons/loader-2';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Clock from 'lucide-svelte/icons/clock';
	import MessageSquare from 'lucide-svelte/icons/message-square';
	import Square from 'lucide-svelte/icons/square';
	import Copy from 'lucide-svelte/icons/copy';
	import Star from 'lucide-svelte/icons/star';

	/**
	 * Debate agent archetypes
	 */
	export type DebateArchetype = 'proponent' | 'skeptic' | 'pragmatist';

	/**
	 * Agent result from a debate round
	 */
	interface DebateAgentResult {
		archetype: DebateArchetype;
		agentName: string;
		output: string;
		model: { providerId: string; modelId: string };
		usage: { promptTokens: number; completionTokens: number };
	}

	/**
	 * Result from a single debate round
	 */
	interface DebateRoundResult {
		round: number;
		agentResults: DebateAgentResult[];
	}

	/**
	 * Agent state during streaming
	 */
	interface AgentState {
		archetype: DebateArchetype;
		name: string;
		status: 'pending' | 'streaming' | 'complete' | 'error';
		output: string;
		error?: string;
	}

	/**
	 * Agent override configuration
	 */
	export interface AgentOverride {
		promptId: number;
		versionId?: number;
	}

	interface Props {
		promptId: number;
		topic: string;
		resolvedInput: string;
		agentOverrides?: Map<DebateArchetype, AgentOverride>;
		class?: string;
	}

	let {
		promptId,
		topic,
		resolvedInput,
		agentOverrides = new Map(),
		class: className = ''
	}: Props = $props();

	// State machine
	type DebateUIState = 'idle' | 'debating' | 'complete' | 'error';
	let uiState = $state<DebateUIState>('idle');
	let currentRound = $state(0);
	let rounds = $state<DebateRoundResult[]>([]);
	let synthesis = $state<DebateSynthesis | null>(null);
	let agentDeltas = $state<Map<string, string>>(new Map());
	let errorMessage = $state<string | null>(null);

	// SSE connection
	let connection = $state<Source | null>(null);

	// Timing
	let startTime = $state<number | null>(null);
	let elapsedSeconds = $state(0);
	let elapsedInterval: ReturnType<typeof setInterval> | null = null;

	// Accordion state - expand current round
	let accordionValue = $state<string[]>([]);

	// Internal mutable state for SSE event processing
	let internalAgentStates = new Map<string, AgentState>();

	// Flag for intentional connection closure
	let connectionIntentionallyClosed = false;

	// Archetype colors (per plan spec)
	const ARCHETYPE_COLORS: Record<
		DebateArchetype,
		{ bg: string; border: string; darkBg: string; darkBorder: string }
	> = {
		proponent: {
			bg: 'bg-blue-50',
			border: 'border-blue-200',
			darkBg: 'dark:bg-blue-950',
			darkBorder: 'dark:border-blue-800'
		},
		skeptic: {
			bg: 'bg-red-50',
			border: 'border-red-200',
			darkBg: 'dark:bg-red-950',
			darkBorder: 'dark:border-red-800'
		},
		pragmatist: {
			bg: 'bg-amber-50',
			border: 'border-amber-200',
			darkBg: 'dark:bg-amber-950',
			darkBorder: 'dark:border-amber-800'
		}
	};

	// Derived: can execute
	let canExecute = $derived(uiState === 'idle' && resolvedInput.trim().length > 0);

	// Derived: is debating
	let isDebating = $derived(uiState === 'debating');

	// Update elapsed time
	$effect(() => {
		if (uiState === 'debating' && startTime !== null) {
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

	/**
	 * Get agent color classes by archetype
	 */
	function getArchetypeColors(archetype: DebateArchetype): {
		bg: string;
		border: string;
		darkBg: string;
		darkBorder: string;
	} {
		return ARCHETYPE_COLORS[archetype];
	}

	/**
	 * Start the debate
	 */
	function startDebate() {
		// Reset state
		uiState = 'debating';
		currentRound = 0;
		rounds = [];
		synthesis = null;
		internalAgentStates = new Map();
		agentDeltas = new Map();
		connectionIntentionallyClosed = false;
		errorMessage = null;
		startTime = Date.now();
		elapsedSeconds = 0;

		// Build overrides object
		const overrides: Record<string, AgentOverride> = {};
		for (const [archetype, override] of agentOverrides) {
			overrides[archetype] = override;
		}

		// Create SSE connection
		connection = source(`/api/council/debate`, {
			options: {
				method: 'POST',
				body: JSON.stringify({
					promptId,
					topic: resolvedInput,
					agentOverrides: overrides
				})
			},

			open({ status }) {
				console.log('[CouncilDebatePanel] Connected:', status);
			},

			close({ isLocal }) {
				console.log('[CouncilDebatePanel] Closed, isLocal:', isLocal);
			},

			error({ error: err }) {
				console.error('[CouncilDebatePanel] Error:', err);
				errorMessage = 'Connection error';
				uiState = 'error';
			}
		});
	}

	// Single SSE subscription effect
	$effect(() => {
		if (!connection) {
			if (!connectionIntentionallyClosed) {
				internalAgentStates = new Map();
			}
			return;
		}

		console.log('[CouncilDebatePanel] Setting up SSE event subscriptions');

		const unsubs: (() => void)[] = [];

		// Helper to update agent state
		function updateAgentState(
			archetype: DebateArchetype,
			round: number,
			updates: Partial<AgentState> & { name?: string }
		): void {
			const key = `${round}-${archetype}`;
			const existing = internalAgentStates.get(key);
			if (existing) {
				internalAgentStates.set(key, { ...existing, ...updates });
			} else if (updates.name) {
				internalAgentStates.set(key, {
					archetype,
					name: updates.name,
					status: updates.status || 'pending',
					output: updates.output || '',
					error: updates.error
				});
			}
			agentDeltas = new Map(
				Array.from(internalAgentStates.entries()).map(([k, v]) => [k, v.output])
			);
		}

		// Subscribe to debate_start
		unsubs.push(
			connection.select('debate_start').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data);
					console.log('[CouncilDebatePanel] debate_start:', event);
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse debate_start:', err);
				}
			})
		);

		// Subscribe to round_start
		unsubs.push(
			connection.select('round_start').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as { type: string; round: number };
					console.log('[CouncilDebatePanel] round_start:', event);
					currentRound = event.round;
					// Expand the current round in accordion
					accordionValue = [`round-${event.round}`];
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse round_start:', err);
				}
			})
		);

		// Subscribe to agent_start
		unsubs.push(
			connection.select('agent_start').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: string;
						round: number;
						archetype: DebateArchetype;
						data?: { archetype: string; agentName: string };
					};
					console.log('[CouncilDebatePanel] agent_start:', event);
					if (event.data) {
						updateAgentState(event.archetype, event.round, {
							status: 'streaming',
							name: event.data.agentName
						});
					}
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse agent_start:', err);
				}
			})
		);

		// Subscribe to agent_delta
		unsubs.push(
			connection.select('agent_delta').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: string;
						round: number;
						archetype: DebateArchetype;
						data?: { delta?: string; accumulated?: string };
					};
					const key = `${event.round}-${event.archetype}`;
					const state = internalAgentStates.get(key);
					if (state && event.data) {
						const newOutput = event.data.accumulated || state.output + (event.data.delta || '');
						internalAgentStates.set(key, { ...state, output: newOutput });
						agentDeltas = new Map(
							Array.from(internalAgentStates.entries()).map(([k, v]) => [k, v.output])
						);
					}
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse agent_delta:', err);
				}
			})
		);

		// Subscribe to agent_complete
		unsubs.push(
			connection.select('agent_complete').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: string;
						round: number;
						archetype: DebateArchetype;
						data?: DebateAgentResult;
					};
					console.log('[CouncilDebatePanel] agent_complete:', event);
					if (event.data) {
						updateAgentState(event.archetype, event.round, {
							name: event.data.agentName,
							status: 'complete',
							output: event.data.output
						});
					}
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse agent_complete:', err);
				}
			})
		);

		// Subscribe to round_complete
		unsubs.push(
			connection.select('round_complete').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: string;
						round: number;
						data?: { round: number; agentCount: number };
					};
					console.log('[CouncilDebatePanel] round_complete:', event);
					// Collect results for this round
					const roundResults: DebateAgentResult[] = [];
					for (const [key, state] of internalAgentStates) {
						if (key.startsWith(`${event.round}-`)) {
							roundResults.push({
								archetype: state.archetype,
								agentName: state.name,
								output: state.output,
								model: { providerId: '', modelId: '' },
								usage: { promptTokens: 0, completionTokens: 0 }
							});
						}
					}
					rounds = [
						...rounds,
						{
							round: event.round,
							agentResults: roundResults.sort(
								(a, b) =>
									['proponent', 'skeptic', 'pragmatist'].indexOf(a.archetype) -
									['proponent', 'skeptic', 'pragmatist'].indexOf(b.archetype)
							)
						}
					];
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse round_complete:', err);
				}
			})
		);

		// Subscribe to synthesis_complete
		unsubs.push(
			connection.select('synthesis_complete').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: string;
						data: DebateSynthesis;
					};
					console.log('[CouncilDebatePanel] synthesis_complete:', event);
					synthesis = event.data;
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse synthesis_complete:', err);
				}
			})
		);

		// Subscribe to debate_complete
		unsubs.push(
			connection.select('debate_complete').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: string;
						data: { rounds: DebateRoundResult[]; synthesis: DebateSynthesis };
					};
					console.log('[CouncilDebatePanel] debate_complete:', event);
					rounds = event.data.rounds;
					synthesis = event.data.synthesis;
					uiState = 'complete';

					// Close connection
					connectionIntentionallyClosed = true;
					if (connection) {
						connection.close();
						connection = null;
					}
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse debate_complete:', err);
				}
			})
		);

		// Subscribe to error
		unsubs.push(
			connection.select('error').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: string;
						round?: number;
						archetype?: DebateArchetype;
						data?: { message?: string; code?: string };
					};
					console.log('[CouncilDebatePanel] error event:', event);
					if (event.archetype && event.round) {
						updateAgentState(event.archetype, event.round, {
							status: 'error',
							error: event.data?.message || 'Unknown error'
						});
					} else {
						errorMessage = event.data?.message || 'Unknown error';
						uiState = 'error';
					}
				} catch (err) {
					console.error('[CouncilDebatePanel] Failed to parse error:', err);
					errorMessage = 'Unknown error occurred';
					uiState = 'error';
				}
			})
		);

		// Cleanup
		return () => {
			console.log('[CouncilDebatePanel] Cleaning up all SSE subscriptions');
			for (const unsub of unsubs) {
				unsub();
			}
		};
	});

	/**
	 * Abort the debate
	 */
	function abortDebate() {
		connectionIntentionallyClosed = true;
		if (connection) {
			connection.close();
			connection = null;
		}
		uiState = 'complete';
		startTime = null;
		elapsedSeconds = 0;
	}

	/**
	 * Reset the panel
	 */
	function handleReset() {
		uiState = 'idle';
		currentRound = 0;
		rounds = [];
		synthesis = null;
		internalAgentStates = new Map();
		agentDeltas = new Map();
		connectionIntentionallyClosed = false;
		errorMessage = null;
		startTime = null;
		elapsedSeconds = 0;
		accordionValue = [];
	}

	/**
	 * Export debate as markdown
	 */
	async function exportAsMarkdown() {
		let md = `# Debate\n\n## Topic\n\n${resolvedInput}\n\n`;

		for (const round of rounds) {
			md += `## Round ${round.round}\n\n`;
			for (const agent of round.agentResults) {
				md += `### ${agent.agentName} (${agent.archetype})\n\n${agent.output}\n\n`;
			}
		}

		if (synthesis) {
			md += `## Synthesis\n\n`;
			md += `**Summary:** ${synthesis.summary}\n\n`;
			md += `**Arguments For:**\n${synthesis.keyArgumentsFor.map((a) => `- ${a}`).join('\n')}\n\n`;
			md += `**Arguments Against:**\n${synthesis.keyArgumentsAgainst.map((a) => `- ${a}`).join('\n')}\n\n`;
			if (synthesis.pointsOfAgreement.length > 0) {
				md += `**Points of Agreement:**\n${synthesis.pointsOfAgreement.map((p) => `- ${p}`).join('\n')}\n\n`;
			}
			md += `**Final Recommendation:** ${synthesis.finalRecommendation}\n`;
		}

		await navigator.clipboard.writeText(md);
	}

	/**
	 * Get agent state for current round
	 */
	function getAgentState(round: number, archetype: DebateArchetype): AgentState | undefined {
		const key = `${round}-${archetype}`;
		return internalAgentStates.get(key);
	}

	/**
	 * Get all archetypes in order
	 */
	const archetypes: DebateArchetype[] = ['proponent', 'skeptic', 'pragmatist'];
</script>

<div class={cn('council-debate-panel space-y-4', className)}>
	<!-- Header with status -->
	{#if uiState === 'debating' || uiState === 'complete'}
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<MessageSquare class="h-5 w-5 text-muted-foreground" />
				<span class="font-medium">Council Debate</span>
				{#if uiState === 'debating'}
					<Badge variant="secondary" class="animate-pulse">
						<Loader2 class="mr-1 h-3 w-3" />
						Round {currentRound}/3...
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

	<!-- Timeline with rounds -->
	{#if rounds.length > 0 || uiState === 'debating'}
		<div class="relative">
			<!-- Timeline line -->
			<div class="absolute top-3 bottom-3 left-4 w-0.5 bg-border"></div>

			<!-- Round sections -->
			<Accordion type="multiple" bind:value={accordionValue} class="space-y-4">
				{#each rounds as roundResult (roundResult.round)}
					<AccordionItem value="round-{roundResult.round}" class="rounded-lg border pl-10">
						<!-- Timeline dot -->
						<div
							class="absolute top-3 left-2 h-4 w-4 rounded-full border-2 border-primary bg-primary ring-4 ring-primary/20"
						></div>

						<AccordionTrigger class="px-4 hover:no-underline">
							<span class="font-medium">Round {roundResult.round}</span>
							<Badge variant="outline" class="ml-2">
								{roundResult.agentResults.length} agents
							</Badge>
						</AccordionTrigger>
						<AccordionContent class="px-4">
							<!-- 3-column grid of agent cards -->
							<div class="grid gap-4 md:grid-cols-3">
								{#each roundResult.agentResults as agent (agent.archetype)}
									{@const colors = getArchetypeColors(agent.archetype)}
									<div
										class={cn(
											'rounded-lg border p-4',
											colors.bg,
											colors.border,
											colors.darkBg,
											colors.darkBorder
										)}
									>
										<div class="mb-2 flex items-center gap-2">
											<span class="text-sm font-medium">{agent.agentName}</span>
											<Badge variant="outline" class="text-xs">{agent.archetype}</Badge>
										</div>
										<div class="prose prose-sm max-w-none dark:prose-invert">
											<div class="max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
												{agent.output}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</AccordionContent>
					</AccordionItem>
				{/each}

				<!-- Current round (if debating) - show streaming state -->
				{#if uiState === 'debating' && currentRound > rounds.length}
					<AccordionItem value="round-{currentRound}" class="rounded-lg border pl-10">
						<!-- Timeline dot (animated) -->
						<div
							class="absolute top-3 left-2 h-4 w-4 animate-pulse rounded-full border-2 border-primary bg-primary ring-4 ring-primary/20"
						></div>

						<AccordionTrigger class="px-4 hover:no-underline">
							<span class="font-medium">Round {currentRound}</span>
							<Badge variant="secondary" class="ml-2 animate-pulse">
								<Loader2 class="mr-1 h-3 w-3" />
								In progress...
							</Badge>
						</AccordionTrigger>
						<AccordionContent class="px-4">
							<!-- 3-column grid of agent cards with streaming -->
							<div class="grid gap-4 md:grid-cols-3">
								{#each archetypes as archetype (archetype)}
									{@const state = getAgentState(currentRound, archetype)}
									{@const colors = getArchetypeColors(archetype)}
									<div
										class={cn(
											'rounded-lg border p-4',
											colors.bg,
											colors.border,
											colors.darkBg,
											colors.darkBorder
										)}
									>
										<div class="mb-2 flex items-center gap-2">
											<span class="text-sm font-medium">
												{state?.name || archetype.charAt(0).toUpperCase() + archetype.slice(1)}
											</span>
											{#if state?.status === 'streaming'}
												<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
											{:else if state?.status === 'complete'}
												<CheckCircle class="h-4 w-4 text-green-600 dark:text-green-400" />
											{:else if state?.status === 'error'}
												<AlertCircle class="h-4 w-4 text-red-500" />
											{:else}
												<Clock class="h-4 w-4 text-muted-foreground" />
											{/if}
										</div>
										<div class="prose prose-sm max-w-none dark:prose-invert">
											{#if state?.status === 'pending'}
												<p class="text-sm text-muted-foreground italic">Waiting to start...</p>
											{:else if state?.output}
												<div class="max-h-64 overflow-y-auto text-sm whitespace-pre-wrap">
													{state.output}
													{#if state.status === 'streaming'}
														<span class="inline-block w-2 animate-pulse text-primary">▊</span>
													{/if}
												</div>
											{:else if state?.status === 'streaming'}
												<p class="flex items-center gap-2 text-sm text-muted-foreground">
													<Loader2 class="h-3 w-3 animate-spin" />
													Processing...
												</p>
											{:else if state?.status === 'error'}
												<p class="text-sm text-red-600 dark:text-red-400">
													{state.error || 'Error occurred'}
												</p>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</AccordionContent>
					</AccordionItem>
				{/if}
			</Accordion>

			<!-- Synthesis section (timeline star) -->
			{#if synthesis}
				<div class="relative mt-4 pl-10">
					<!-- Timeline star -->
					<div class="absolute top-0 left-1 h-6 w-6 text-primary">
						<Star class="h-6 w-6 fill-primary" />
					</div>
					<DebateSynthesisCard {synthesis} />
				</div>
			{/if}
		</div>

		<!-- Abort button during execution -->
		{#if uiState === 'debating'}
			<Button variant="destructive" onclick={abortDebate} class="w-full">
				<Square class="mr-2 h-4 w-4" />
				Stop Debate
			</Button>
		{/if}
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
				<Button variant="outline" size="sm" onclick={startDebate}>
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
			<Button onclick={startDebate} disabled={!canExecute} class="w-full">
				<Play class="mr-2 h-4 w-4" />
				Start Debate
			</Button>
			<div class="text-center text-xs text-muted-foreground">
				<p class="mb-1">3 AI agents will debate your topic across 3 rounds:</p>
				<p class="flex flex-wrap justify-center gap-2">
					<span class="rounded bg-blue-100 px-2 py-0.5 dark:bg-blue-900">Proponent</span>
					<span class="rounded bg-red-100 px-2 py-0.5 dark:bg-red-900">Skeptic</span>
					<span class="rounded bg-amber-100 px-2 py-0.5 dark:bg-amber-900">Pragmatist</span>
				</p>
			</div>
		</div>
	{/if}

	{#if uiState === 'complete'}
		<div class="flex gap-2">
			<Button variant="outline" onclick={exportAsMarkdown} class="flex-1">
				<Copy class="mr-2 h-4 w-4" />
				Copy as Markdown
			</Button>
			<Button variant="outline" onclick={handleReset} class="flex-1">
				<RotateCcw class="mr-2 h-4 w-4" />
				Reset
			</Button>
		</div>
	{/if}
</div>
