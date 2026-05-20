<script lang="ts">
	import { source, type Source } from 'sveltekit-sse';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import * as m from '$lib/paraglide/messages.js';
	import Play from 'lucide-svelte/icons/play';
	import Loader2 from 'lucide-svelte/icons/loader-2';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import RotateCcw from 'lucide-svelte/icons/rotate-ccw';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Clock from 'lucide-svelte/icons/clock';
	import Users from 'lucide-svelte/icons/users';
	import Square from 'lucide-svelte/icons/square';
	import Edit from 'lucide-svelte/icons/edit';
	import AgentCard from './agent-card.svelte';
	import OverrideModal from './override-modal.svelte';
	import {
		type CouncilUIState,
		type AgentResult,
		type AgentState,
		type PromptItem,
		type PromptVersion,
		getAgentBgColorClass
	} from './council-types';

	interface Props {
		promptId: number;
		userPrompt: string;
		class?: string;
		onstatechange?: (state: CouncilUIState) => void;
		oncomplete?: (results: {
			agentStates: Map<number, AgentState>;
			summary: string | null;
		}) => void;
		disabled?: boolean;
		agents?: { id: number; name: string; promptId?: number }[];
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
	let reviewAborted = $state(false);

	// Configured review agents from settings
	interface ConfiguredAgent {
		id: number;
		agentOrder: number;
		modelId: string;
		promptLinkId: number | null;
		promptName?: string;
	}
	let configuredAgents = $state<ConfiguredAgent[]>([]);

	// Fetch review agents from settings on mount
	$effect(() => {
		async function fetchReviewAgents() {
			try {
				const response = await fetch('/api/admin/council-agents?parentType=review_defaults');
				if (response.ok) {
					const data = await response.json();
					configuredAgents = (data.agents || []).sort(
						(a: ConfiguredAgent, b: ConfiguredAgent) => a.agentOrder - b.agentOrder
					);
				}
			} catch (error) {
				console.error('[CouncilReview] Failed to fetch review agents:', error);
			}
		}
		fetchReviewAgents();
	});

	// Derived: display agents
	let displayAgents = $derived(
		configuredAgents.length > 0
			? configuredAgents.map((a, i) => ({ id: a.id, name: a.promptName || `Agent ${i + 1}` }))
			: []
	);

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

	// Override modal state
	let showOverrideModal = $state(false);
	let overrideAgentId = $state<number | null>(null);
	let overrideAgentName = $state('');
	let promptsList = $state<PromptItem[]>([]);
	let promptsLoading = $state(false);
	let searchQuery = $state('');
	let selectedOverride = $state<{ promptId: number; versionId?: number } | null>(null);
	let expandedPromptId = $state<number | null>(null);
	let versionsLoading = $state(false);
	let versionsList = $state<PromptVersion[]>([]);

	// Agent overrides
	let agentOverrides = $state<Map<number, { promptId: number; versionId?: number }>>(new Map());
	let versionInfo = $state<Map<number, { version: string; changeNotes?: string | null }>>(new Map());

	// Derived
	let filteredPrompts = $derived(
		searchQuery.trim()
			? promptsList.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
			: promptsList
	);
	let allComplete = $derived(
		uiState === 'complete' ||
			(agentStates.size > 0 &&
				Array.from(agentStates.values()).every((a) => a.status === 'complete'))
	);
	let canExecute = $derived(uiState === 'idle' && userPrompt.trim().length > 0 && !disabled);

	// Elapsed timer
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

	// Override modal functions
	async function openOverrideModal(agentId: number, agentName: string) {
		overrideAgentId = agentId;
		overrideAgentName = agentName;
		searchQuery = '';
		const existingOverride = agentOverrides.get(agentId);
		if (existingOverride) {
			selectedOverride = { promptId: existingOverride.promptId, versionId: existingOverride.versionId };
			expandedPromptId = existingOverride.promptId;
		} else {
			selectedOverride = null;
			expandedPromptId = null;
		}
		versionsList = [];
		showOverrideModal = true;

		promptsLoading = true;
		try {
			const response = await fetch('/api/prompts?limit=100');
			if (response.ok) {
				const data = await response.json();
				const promptArray = data.data?.prompts || [];
				promptsList = (promptArray || []).map(
					(p: { id: number; title: string; latestVersionId?: number }) => ({
						id: p.id,
						title: p.title,
						versionCount: p.latestVersionId ? 1 : 0
					})
				);
			}
		} catch (err) {
			console.error('[CouncilReviewPanel] Failed to fetch prompts:', err);
		}
		promptsLoading = false;

		if (expandedPromptId) {
			await loadVersionsForPrompt(expandedPromptId);
		}
	}

	function closeOverrideModal() {
		showOverrideModal = false;
		overrideAgentId = null;
		overrideAgentName = '';
		searchQuery = '';
		selectedOverride = null;
		expandedPromptId = null;
		versionsList = [];
	}

	async function loadVersionsForPrompt(pid: number) {
		versionsLoading = true;
		versionsList = [];
		try {
			const response = await fetch(`/api/prompts/${pid}/versions`);
			if (response.ok) {
				const data = await response.json();
				versionsList = (data.data?.versions || []).map(
					(v: { id: number; version: string; changeNotes: string | null; createdAt: string | null }) => ({
						id: v.id,
						version: v.version,
						changeNotes: v.changeNotes,
						createdAt: v.createdAt ? new Date(v.createdAt) : null
					})
				);
			}
		} catch (err) {
			console.error('[CouncilReviewPanel] Failed to fetch versions:', err);
		}
		versionsLoading = false;
	}

	async function togglePromptExpand(promptId: number) {
		if (expandedPromptId === promptId) {
			expandedPromptId = null;
			versionsList = [];
		} else {
			expandedPromptId = promptId;
			await loadVersionsForPrompt(promptId);
		}
	}

	function selectPrompt(promptId: number) {
		if (selectedOverride?.promptId === promptId && !selectedOverride.versionId) {
			selectedOverride = null;
		} else {
			selectedOverride = { promptId };
		}
	}

	function selectVersion(promptId: number, versionId: number) {
		if (selectedOverride?.promptId === promptId && selectedOverride.versionId === versionId) {
			selectedOverride = { promptId };
		} else {
			selectedOverride = { promptId, versionId };
		}
	}

	function applyOverride() {
		if (overrideAgentId !== null && selectedOverride) {
			agentOverrides = new Map(agentOverrides).set(overrideAgentId, selectedOverride);
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
			const newOverrides = new Map(agentOverrides);
			newOverrides.delete(overrideAgentId);
			agentOverrides = newOverrides;
			versionInfo.delete(overrideAgentId);
			versionInfo = new Map(versionInfo);
		}
		closeOverrideModal();
	}

	function clearOverride(agentId: number) {
		const newOverrides = new Map(agentOverrides);
		newOverrides.delete(agentId);
		agentOverrides = newOverrides;
	}

	function hasOverride(agentId: number): boolean {
		return agentOverrides.has(agentId);
	}

	// Start council review
	function startCouncilReview() {
		uiState = 'running';
		agentStates = new Map();
		internalAgentStates = new Map();
		connectionIntentionallyClosed = false;
		errorMessage = null;
		reviewSummary = null;
		startTime = Date.now();
		elapsedSeconds = 0;

		const overrides: Record<number, { promptId: number; versionId?: number }> = {};
		for (const [agentId, override] of agentOverrides) {
			overrides[agentId] = override;
		}

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
				errorMessage = m['council.connectionError']();
				uiState = 'error';
			}
		});
	}

	// Internal state for SSE processing
	let internalAgentStates = new Map<number, AgentState>();
	let connectionIntentionallyClosed = false;

	// SSE subscription effect
	$effect(() => {
		if (!connection) {
			if (!connectionIntentionallyClosed) {
				internalAgentStates = new Map();
			}
			return;
		}

		const unsubs: (() => void)[] = [];

		function updateAgentState(
			agentId: number,
			updates: Partial<AgentState> & { name?: string }
		): void {
			const existing = internalAgentStates.get(agentId);
			if (existing) {
				internalAgentStates.set(agentId, { ...existing, ...updates });
			} else if (updates.name) {
				internalAgentStates.set(agentId, {
					id: agentId,
					name: updates.name,
					status: updates.status || 'pending',
					output: updates.output || '',
					error: updates.error
				});
			}
			agentStates = new Map(internalAgentStates);
		}

		// review_start
		unsubs.push(
			connection.select('review_start').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: 'review_start';
						data: { agentCount: number; agents: { id: number; name: string }[] };
					};
					agentList = event.data.agents;
					internalAgentStates = new Map();
					for (const agent of event.data.agents) {
						internalAgentStates.set(agent.id, {
							id: agent.id,
							name: agent.name,
							status: 'pending',
							output: ''
						});
					}
					agentStates = new Map(internalAgentStates);
				} catch (err) {
					console.error('[CouncilReviewPanel] Failed to parse review_start:', err);
				}
			})
		);

		// agent_start
		unsubs.push(
			connection.select('agent_start').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: 'agent_start';
						agentId: number;
						agentName: string;
					};
					updateAgentState(event.agentId, { status: 'streaming', name: event.agentName });
				} catch (err) {
					console.error('[CouncilReviewPanel] Failed to parse agent_start:', err);
				}
			})
		);

		// agent_delta
		unsubs.push(
			connection.select('agent_delta').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: 'agent_delta';
						agentId: number;
						data?: { delta?: string; accumulated?: string };
					};
					const state = internalAgentStates.get(event.agentId);
					if (state && event.data) {
						const newOutput = event.data.accumulated || state.output + (event.data.delta || '');
						internalAgentStates.set(event.agentId, { ...state, output: newOutput });
						agentStates = new Map(internalAgentStates);
					}
				} catch (err) {
					console.error('[CouncilReviewPanel] Failed to parse agent_delta:', err);
				}
			})
		);

		// agent_complete
		unsubs.push(
			connection.select('agent_complete').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: 'agent_complete';
						agentId: number;
						data?: AgentResult;
					};
					if (event.data) {
						updateAgentState(event.agentId, {
							status: event.data.status,
							output: event.data.output || undefined,
							error: event.data.error
						});
					}
				} catch (err) {
					console.error('[CouncilReviewPanel] Failed to parse agent_complete:', err);
				}
			})
		);

		// review_complete
		unsubs.push(
			connection.select('review_complete').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: 'review_complete';
						data: { results: AgentResult[]; summary: string };
					};
					if (!event.data || !event.data.results || !Array.isArray(event.data.results)) {
						return;
					}
					for (const result of event.data.results) {
						updateAgentState(result.agentId, {
							name: result.agentName,
							status: result.status,
							output: result.output || '',
							error: result.error
						});
					}
					reviewSummary = event.data.summary;
					uiState = 'complete';
					agentStates = new Map(internalAgentStates);
					if (oncomplete) {
						oncomplete({ agentStates: new Map(internalAgentStates), summary: reviewSummary });
					}
					connectionIntentionallyClosed = true;
					if (connection) {
						connection.close();
						connection = null;
					}
				} catch (err) {
					console.error('[CouncilReviewPanel] Failed to parse review_complete:', err);
				}
			})
		);

		// error
		unsubs.push(
			connection.select('error').subscribe((data) => {
				if (!data) return;
				try {
					const event = JSON.parse(data) as {
						type: 'error';
						agentId?: number;
						data?: { message?: string };
					};
					if (event.agentId !== undefined) {
						updateAgentState(event.agentId, {
							status: 'error',
							error: event.data?.message || 'Unknown error'
						});
					} else {
						errorMessage = event.data?.message || 'Unknown error';
						uiState = 'error';
					}
				} catch (err) {
					errorMessage = 'Unknown error occurred';
					uiState = 'error';
				}
			})
		);

		return () => {
			for (const unsub of unsubs) unsub();
		};
	});

	function handleReset() {
		uiState = 'idle';
		agentStates = new Map();
		agentList = [];
		reviewSummary = null;
		errorMessage = null;
		startTime = null;
		elapsedSeconds = 0;
		connectionIntentionallyClosed = false;
		internalAgentStates = new Map();
		if (connection) {
			connection.close();
			connection = null;
		}
	}

	function abortReview() {
		connectionIntentionallyClosed = true;
		if (connection) {
			connection.close();
			connection = null;
		}
		const hasPartialResults = Array.from(agentStates.values()).some((a) => a.output.length > 0);
		if (hasPartialResults) {
			const newStates = new Map(agentStates);
			for (const [, state] of newStates) {
				if (state.status === 'streaming' || state.status === 'pending') {
					state.status = 'error';
					state.error = m['council.abortedByUser']();
				}
			}
			agentStates = newStates;
			uiState = 'complete';
			reviewAborted = true;
			reviewSummary = m['council.reviewAborted']();
		} else {
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
				<span class="font-medium">{m['council.review.title']()}</span>
				{#if uiState === 'running'}
					<Badge variant="secondary" class="animate-pulse">
						<Loader2 class="mr-1 h-3 w-3" />
						{m['council.review.reviewing']()}
					</Badge>
				{:else if uiState === 'complete'}
					<Badge variant="default" class="bg-green-600">
						<CheckCircle class="mr-1 h-3 w-3" />
						{m['common.complete']()}
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

	<!-- Agent cards -->
	{#if agentStates.size > 0}
		<div class="grid gap-4 md:grid-cols-3">
			{#each Array.from(agentStates.values()) as agent (agent.id)}
				<AgentCard {agent} {elapsedSeconds} />
			{/each}
		</div>

		<!-- Abort button -->
		<Button variant="destructive" onclick={abortReview} class="w-full">
			<Square class="mr-2 h-4 w-4" />
			{m['council.review.stopReview']()}
		</Button>
	{/if}

	<!-- Review summary -->
	{#if uiState === 'complete' && reviewSummary}
		<div
			class="rounded-lg border p-4"
			class:border-green-200={!reviewAborted}
			class:bg-green-50={!reviewAborted}
			class:dark:border-green-900={!reviewAborted}
			class:dark:bg-green-950={!reviewAborted}
			class:border-amber-200={reviewAborted}
			class:bg-amber-50={reviewAborted}
			class:dark:border-amber-900={reviewAborted}
			class:dark:bg-amber-950={reviewAborted}
		>
			<div class="mb-2 flex items-center gap-2">
				{#if reviewAborted}
					<AlertCircle class="h-5 w-5 text-amber-600 dark:text-amber-400" />
				{:else}
					<CheckCircle class="h-5 w-5 text-green-600 dark:text-green-400" />
				{/if}
				<h3 class="font-semibold">
					{#if reviewAborted}
						{m['council.review.reviewAborted']()}
					{:else}
						{m['council.review.reviewComplete']()}
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
					{m['common.retry']()}
				</Button>
				<Button variant="ghost" size="sm" onclick={handleReset}>{m['common.dismiss']()}</Button>
			</div>
		</div>
	{/if}

	<!-- Controls -->
	{#if uiState === 'idle'}
		<div class="space-y-3">
			<Button onclick={startCouncilReview} disabled={!canExecute} class="w-full">
				<Play class="mr-2 h-4 w-4" />
				{m['council.review.runReview']()}
			</Button>
			<div class="text-center text-xs text-muted-foreground">
				<p class="mb-1">
					{m['council.agentsWillReview']({ count: agentList.length || 3 })}
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
								class="group relative cursor-pointer rounded px-2 py-0.5 transition-colors hover:ring-2 hover:ring-primary/50 {getAgentBgColorClass(i)}"
								class:ring-2={hasOverrideForAgent}
								class:ring-amber-500={hasOverrideForAgent}
								onclick={() => openOverrideModal(agent.id, agent.name)}
								title={m['council.clickToOverride']()}
							>
								{agent.name}
								{#if hasOverrideForAgent}
									<span class="ml-1 text-amber-600 dark:text-amber-400">*</span>
								{/if}
								<Edit class="ml-1 inline-block h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
							</button>
						{/each}
					</p>
					<p class="mt-1 text-[10px] opacity-70">Click agent name to override prompt</p>
				{:else if displayAgents.length > 0}
					<p class="flex flex-wrap justify-center gap-2">
						{#each displayAgents as agent, i (agent.id)}
							{@const hasOverrideForAgent = hasOverride(agent.id)}
							<button
								type="button"
								class="group relative cursor-pointer rounded px-2 py-0.5 transition-colors hover:ring-2 hover:ring-primary/50 {getAgentBgColorClass(i)}"
								class:ring-2={hasOverrideForAgent}
								class:ring-amber-500={hasOverrideForAgent}
								onclick={() => openOverrideModal(agent.id, agent.name)}
								title={m['council.clickToOverride']()}
							>
								{agent.name}
								{#if hasOverrideForAgent}
									<span class="ml-1 text-amber-600 dark:text-amber-400">*</span>
								{/if}
								<Edit class="ml-1 inline-block h-3 w-3 opacity-0 transition-opacity group-hover:opacity-50" />
							</button>
						{/each}
					</p>
					<p class="mt-1 text-[10px] opacity-70">{m['council.clickToOverride']()}</p>
				{:else}
					<p class="text-sm text-muted-foreground">
						{m['council.noAgentsConfigured']({ type: 'review' })}
					</p>
				{/if}
			</div>
		</div>
	{/if}

	{#if uiState === 'complete' || uiState === 'error'}
		<Button variant="outline" onclick={handleReset} class="w-full">
			<RotateCcw class="mr-2 h-4 w-4" />
			{m['common.reset']()}
		</Button>
	{/if}

	<!-- Override Modal -->
	<OverrideModal
		open={showOverrideModal}
		agentName={overrideAgentName}
		prompts={promptsList}
		loading={promptsLoading}
		{searchQuery}
		{filteredPrompts}
		{expandedPromptId}
		{selectedOverride}
		{versionsLoading}
		versions={versionsList}
		onclose={closeOverrideModal}
		onapply={applyOverride}
		onsearch={(q) => (searchQuery = q)}
		onselectprompt={selectPrompt}
		onselectversion={selectVersion}
		ontoggleexpand={togglePromptExpand}
	/>
</div>
