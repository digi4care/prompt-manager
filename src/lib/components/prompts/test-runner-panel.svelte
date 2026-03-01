<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import ExecutionResult from './execution-result.svelte';
	import { CouncilReviewPanel, CouncilDebatePanel } from '$lib/components/council';
	import { cn } from '$lib/utils';
	import Play from 'lucide-svelte/icons/play';
	import Loader2 from 'lucide-svelte/icons/loader-2';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import Maximize2 from 'lucide-svelte/icons/maximize-2';
	import X from 'lucide-svelte/icons/x';
	import {
		extractVariables,
		resolveVariables,
		type SnippetVariable,
		type ResolveResult
	} from '$lib/utils/snippet-variables';

	// Execution result type matching API response
	interface ExecutionResultData {
		content: string;
		model: { displayName: string; providerId: string; modelId: string };
		usage: { inputTokens: number; outputTokens: number; totalTokens: number };
		duration: { ms: number; seconds: number };
		source: 'run' | 'prompt' | 'default';
	}

	interface ErrorInfo {
		message: string;
		code?: string;
		recovery?: string;
	}

	interface Props {
		promptId: number;
		template: string;
		variables?: SnippetVariable[];
		functionType?: 'executor' | 'judge' | 'improve' | 'council';
		onexecute?: (result: ExecutionResultData) => void;
		class?: string;
	}

	let {
		promptId,
		template,
		variables = [],
		functionType = 'executor',
		onexecute,
		class: className
	}: Props = $props();

	// Extract variable names from template
	let templateVars = $derived(extractVariables(template).map((v) => v.name));

	// Build unique variable list (template + definitions)
	let allVarNames = $derived(() => {
		const defined = new Set(variables.map((v) => v.name));
		const inTemplate = new Set(templateVars);
		return [...new Set([...inTemplate, ...defined])];
	});

	// Variable input values (reactive state)
	let values = $state<Record<string, string>>({});

	// Initialize defaults from definitions
	$effect(() => {
		for (const v of variables) {
			if (v.default && !(v.name in values)) {
				values[v.name] = v.default;
			}
		}
	});

	// Reactive preview - updates on every keystroke
	let preview = $derived(resolveVariables(template, values, variables));

	// Required variable names from definitions
	let requiredVarNames = $derived(
		new Set(variables.filter((v) => v.required !== false).map((v) => v.name))
	);

	// All variable names in template (extracted)
	let templateVarNames = $derived(new Set(templateVars));

	// Missing required variables from definitions
	let missingRequired = $derived(
		preview.missingVariables.filter((name) => requiredVarNames.has(name))
	);

	// Variables in template that have no value (regardless of definitions)
	let emptyTemplateVars = $derived(
		Array.from(templateVarNames).filter((name) => !values[name] || values[name].trim() === '')
	);

	// Combined missing variables for validation
	let allMissing = $derived([...new Set([...missingRequired, ...emptyTemplateVars])]);

	// Has any variables to show
	let hasVariables = $derived(allVarNames().length > 0);

	// Execution mode toggle - single, council review, or debate
	type ExecutionMode = 'single' | 'review' | 'debate';
	let executionMode = $state<ExecutionMode>('single');

	// Council agents with prompt names (fetched from API)
	interface CouncilAgent {
		id: number;
		agentOrder: number;
		modelId: string;
		promptLinkId: number | null;
		promptName?: string;
	}
	let councilAgents = $state<CouncilAgent[]>([]);

	// Fetch council agents on mount
	$effect(() => {
		async function fetchCouncilAgents() {
			try {
				const response = await fetch('/api/admin/council-agents');
				if (response.ok) {
					const data = await response.json();
					councilAgents = (data.agents || []).sort(
						(a: CouncilAgent, b: CouncilAgent) => a.agentOrder - b.agentOrder
					);
				}
			} catch (error) {
				console.error('[TestRunner] Failed to fetch council agents:', error);
			}
		}
		fetchCouncilAgents();
	});

	// Get formatted agent names for display
	let agentNamesDisplay = $derived(() => {
		if (councilAgents.length === 0) {
			return 'Proponent vs Skeptic vs Pragmatist';
		}
		return councilAgents.map((a) => a.promptName || 'Agent ' + a.agentOrder).join(' vs ');
	});

	// Track council review state (received from CouncilReviewPanel)
	type CouncilState = 'idle' | 'running' | 'complete' | 'error';
	let councilState = $state<CouncilState>('idle');

	// Track debate state (received from CouncilDebatePanel)
	type DebateState = 'idle' | 'debating' | 'complete' | 'error';
	let debateState = $state<DebateState>('idle');

	// State machine for execution
	type ExecutionState = 'idle' | 'loading' | 'success' | 'error';
	let executionState = $state<ExecutionState>('idle');
	let result = $state<ExecutionResultData | null>(null);
	let errorInfo = $state<ErrorInfo | null>(null);

	// Fullscreen editor modal state
	let showFullscreenEditor = $state(false);
	let fullscreenVarName = $state('');
	let fullscreenVarValue = $state('');
	let fullscreenTempValue = $state('');

	// Derived: is anything currently executing?
	let isAnyExecuting = $derived(
		executionState === 'loading' || councilState === 'running' || debateState === 'debating'
	);

	// Derived states
	let isExecuting = $derived(executionState === 'loading');
	let canExecute = $derived(
		executionState !== 'loading' &&
			preview.content.trim().length > 0 &&
			!preview.hasErrors &&
			allMissing.length === 0
	);
	let hasResult = $derived(executionState === 'success' && result !== null);
	let hasError = $derived(executionState === 'error' && errorInfo !== null);

	// Can run council review?
	let canRunCouncil = $derived(
		councilState !== 'running' && preview.content.trim().length > 0 && allMissing.length === 0
	);

	// Can run debate?
	let canRunDebate = $derived(
		debateState !== 'debating' && preview.content.trim().length > 0 && allMissing.length === 0
	);

	// Handler for council state changes
	function handleCouncilStateChange(state: CouncilState) {
		councilState = state;
	}

	// Handler for debate state changes
	function handleDebateStateChange(state: DebateState) {
		debateState = state;
	}

	async function handleExecute() {
		if (!canExecute) return;

		executionState = 'loading';
		errorInfo = null;
		result = null;

		try {
			const response = await fetch(`/api/prompts/${promptId}/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content: preview.content,
					functionType
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw {
					message: data.message || 'Execution failed',
					code: data.code,
					recovery: data.recovery
				};
			}

			result = await response.json();
			executionState = 'success';
			if (result) onexecute?.(result);
		} catch (e) {
			errorInfo = e instanceof Error ? { message: e.message } : (e as ErrorInfo);
			executionState = 'error';
		}
	}

	function handleRetry() {
		handleExecute();
	}

	function handleReset() {
		executionState = 'idle';
		result = null;
		errorInfo = null;
	}

	/**
	 * Open fullscreen editor for a variable
	 */
	function openFullscreenEditor(varName: string) {
		fullscreenVarName = varName;
		fullscreenVarValue = values[varName] ?? '';
		fullscreenTempValue = fullscreenVarValue;
		showFullscreenEditor = true;
	}

	/**
	 * Save fullscreen editor changes
	 */
	function saveFullscreenEditor() {
		values[fullscreenVarName] = fullscreenTempValue;
		showFullscreenEditor = false;
	}

	/**
	 * Cancel fullscreen editor changes
	 */
	function cancelFullscreenEditor() {
		showFullscreenEditor = false;
	}
</script>

<div class={className}>
	<!-- Variable Inputs (no Card wrapper to avoid nesting) -->
	{#if hasVariables}
		<div class="mb-4 space-y-3">
			<h3 class="text-sm font-medium">Variables</h3>
			<div class="grid gap-3">
				{#each allVarNames() as varName (varName)}
					{@const definition = variables.find((v) => v.name === varName)}
					{@const inputId = `test-var-${varName}`}
					{@const currentValue = values[varName] ?? ''}
					<div>
						<label for={inputId} class="mb-1 block text-xs text-muted-foreground">
							{varName}
							{#if definition?.required !== false}
								<span class="text-red-500">*</span>
							{/if}
						</label>
						<div class="relative">
							<Input
								id={inputId}
								value={currentValue}
								oninput={(e: Event) => {
									values[varName] = (e.target as HTMLInputElement).value;
								}}
								placeholder={definition?.description || `Enter ${varName}`}
								disabled={isExecuting}
								class="pr-10"
							/>
							<button
								type="button"
								class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								onclick={() => openFullscreenEditor(varName)}
								title="Expand editor"
							>
								<Maximize2 class="h-4 w-4" />
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Execution Mode Toggle -->
	<div
		class={cn('mb-4 flex items-center gap-4', isAnyExecuting && 'pointer-events-none opacity-50')}
	>
		<label class="flex cursor-pointer items-center gap-2 text-sm">
			<input
				type="radio"
				name="mode-{promptId}"
				value="single"
				bind:group={executionMode}
				disabled={isAnyExecuting}
				class="h-4 w-4"
			/>
			<span>Single</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2 text-sm">
			<input
				type="radio"
				name="mode-{promptId}"
				value="review"
				bind:group={executionMode}
				disabled={isAnyExecuting}
				class="h-4 w-4"
			/>
			<span>Review</span>
		</label>
		<label class="flex cursor-pointer items-center gap-2 text-sm">
			<input
				type="radio"
				name="mode-{promptId}"
				value="debate"
				bind:group={executionMode}
				disabled={isAnyExecuting}
				class="h-4 w-4"
			/>
			<span>Debate</span>
		</label>
		{#if isAnyExecuting}
			<span class="ml-auto text-xs text-muted-foreground">Running...</span>
		{/if}
	</div>

	{#if executionMode === 'review'}
		<p class="mb-2 text-xs text-muted-foreground">
			3 AI agents review your prompt in parallel from different perspectives
		</p>
	{:else if executionMode === 'debate'}
		<p class="mb-2 text-xs text-muted-foreground">
			3 AI agents debate your topic across 3 rounds: {agentNamesDisplay()}
		</p>
	{/if}

	<!-- Preview Output -->
	<Card class="mb-4 p-4">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-sm font-medium">Preview</h3>
			{#if allMissing.length > 0}
				<Badge variant="destructive" class="flex items-center gap-1">
					<AlertCircle class="h-3 w-3" />
					{allMissing.length} missing
				</Badge>
			{:else if hasVariables}
				<Badge variant="default" class="flex items-center gap-1 bg-green-600">
					<CheckCircle class="h-3 w-3" />
					Resolved
				</Badge>
			{/if}
		</div>

		{#if allMissing.length > 0}
			<div class="mb-2 rounded bg-destructive/10 p-2 text-sm text-destructive">
				Missing required variables: {allMissing.join(', ')}
			</div>
		{/if}

		<pre
			class="max-h-48 overflow-auto rounded bg-muted/50 p-3 font-mono text-sm whitespace-pre-wrap">{preview.content}</pre>
	</Card>

	<!-- Conditional execution based on mode -->
	{#if executionMode === 'single'}
		<!-- Validation message for missing required variables -->
		{#if allMissing.length > 0}
			<div
				class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
			>
				<div class="flex items-center gap-2">
					<AlertCircle class="h-4 w-4 text-red-500" />
					<p class="text-sm text-red-700 dark:text-red-300">
						Please fill in all required variables: {allMissing.join(', ')}
					</p>
				</div>
			</div>
		{/if}

		<!-- Execute button -->
		<Button onclick={handleExecute} disabled={!canExecute} class="w-full">
			{#if isExecuting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Executing...
			{:else}
				<Play class="mr-2 h-4 w-4" />
				Execute
			{/if}
		</Button>

		<!-- Error display -->
		{#if hasError}
			<div
				class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
			>
				<div class="flex items-start gap-3">
					<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
					<div class="flex-1">
						<p class="font-medium text-red-800 dark:text-red-200">{errorInfo?.message}</p>
						{#if errorInfo?.recovery}
							<p class="mt-1 text-sm text-red-600 dark:text-red-300">{errorInfo.recovery}</p>
						{/if}
						{#if errorInfo?.code}
							<p class="mt-1 text-xs text-red-500 dark:text-red-400">
								Error code: {errorInfo.code}
							</p>
						{/if}
					</div>
				</div>
				<div class="mt-3 flex gap-2">
					<Button variant="outline" size="sm" onclick={handleRetry}>Retry</Button>
					<Button variant="ghost" size="sm" onclick={handleReset}>Dismiss</Button>
				</div>
			</div>
		{/if}

		<!-- Success result -->
		{#if hasResult && result}
			<div class="mt-4">
				<ExecutionResult {result} />
				<div class="mt-3 flex justify-end">
					<Button variant="outline" size="sm" onclick={handleReset}>Clear Result</Button>
				</div>
			</div>
		{/if}
	{:else if executionMode === 'review'}
		<!-- Council Review Mode -->
		{#if allMissing.length > 0}
			<div
				class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
			>
				<div class="flex items-center gap-2">
					<AlertCircle class="h-4 w-4 text-red-500" />
					<p class="text-sm text-red-700 dark:text-red-300">
						Please fill in all required variables: {allMissing.join(', ')}
					</p>
				</div>
			</div>
		{/if}
		<CouncilReviewPanel
			{promptId}
			userPrompt={preview.content}
			onstatechange={handleCouncilStateChange}
			disabled={allMissing.length > 0}
		/>
	{:else}
		<!-- Debate Mode -->
		{#if allMissing.length > 0}
			<div
				class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
			>
				<div class="flex items-center gap-2">
					<AlertCircle class="h-4 w-4 text-red-500" />
					<p class="text-sm text-red-700 dark:text-red-300">
						Please fill in all required variables: {allMissing.join(', ')}
					</p>
				</div>
			</div>
		{/if}
		<CouncilDebatePanel
			{promptId}
			topic={preview.content}
			resolvedInput={preview.content}
			onstatechange={handleDebateStateChange}
			disabled={allMissing.length > 0}
		/>
	{/if}

	<!-- Fullscreen Editor Modal -->
	{#if showFullscreenEditor}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="fullscreen-editor-title"
		>
			<div
				class="flex h-[80vh] w-full max-w-4xl flex-col rounded-lg border bg-background shadow-xl"
			>
				<!-- Modal header -->
				<div class="flex items-center justify-between border-b px-4 py-3">
					<div>
						<h3 id="fullscreen-editor-title" class="font-semibold">
							Edit Variable: {fullscreenVarName}
						</h3>
						<p class="text-sm text-muted-foreground">Use this editor for longer content</p>
					</div>
					<button
						type="button"
						class="rounded p-1 hover:bg-muted"
						onclick={cancelFullscreenEditor}
						aria-label="Close"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<!-- Editor area -->
				<div class="flex-1 overflow-hidden p-4">
					<textarea
						bind:value={fullscreenTempValue}
						class="h-full w-full resize-none rounded-md border bg-muted/30 p-3 font-mono text-sm focus:ring-2 focus:ring-primary focus:outline-none"
						placeholder="Enter your content here..."
					></textarea>
				</div>

				<!-- Footer with actions -->
				<div class="flex items-center justify-between border-t px-4 py-3">
					<span class="text-xs text-muted-foreground">
						{fullscreenTempValue.length} characters
					</span>
					<div class="flex gap-2">
						<Button variant="outline" onclick={cancelFullscreenEditor}>Cancel</Button>
						<Button onclick={saveFullscreenEditor}>Save Changes</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
