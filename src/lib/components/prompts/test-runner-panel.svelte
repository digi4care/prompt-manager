<script lang="ts">
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import ExecutionResult from './execution-result.svelte';
	import Play from 'lucide-svelte/icons/play';
	import Loader2 from 'lucide-svelte/icons/loader-2';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
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

	// Missing required variables for error display
	let missingRequired = $derived(
		preview.missingVariables.filter((name) => requiredVarNames.has(name))
	);

	// Has any variables to show
	let hasVariables = $derived(allVarNames().length > 0);

	// State machine for execution
	type ExecutionState = 'idle' | 'loading' | 'success' | 'error';
	let executionState = $state<ExecutionState>('idle');
	let result = $state<ExecutionResultData | null>(null);
	let errorInfo = $state<ErrorInfo | null>(null);

	// Derived states
	let isExecuting = $derived(executionState === 'loading');
	let canExecute = $derived(
		executionState !== 'loading' && preview.content.trim().length > 0 && !preview.hasErrors
	);
	let hasResult = $derived(executionState === 'success' && result !== null);
	let hasError = $derived(executionState === 'error' && errorInfo !== null);

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
					<div>
						<label for={inputId} class="mb-1 block text-xs text-muted-foreground">
							{varName}
							{#if definition?.required !== false}
								<span class="text-red-500">*</span>
							{/if}
						</label>
						<Input
							id={inputId}
							bind:value={values[varName]}
							placeholder={definition?.description || `Enter ${varName}`}
							disabled={isExecuting}
						/>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Preview Output -->
	<Card class="mb-4 p-4">
		<div class="mb-2 flex items-center justify-between">
			<h3 class="text-sm font-medium">Preview</h3>
			{#if missingRequired.length > 0}
				<Badge variant="destructive" class="flex items-center gap-1">
					<AlertCircle class="h-3 w-3" />
					{missingRequired.length} missing
				</Badge>
			{:else if hasVariables}
				<Badge variant="default" class="flex items-center gap-1 bg-green-600">
					<CheckCircle class="h-3 w-3" />
					Resolved
				</Badge>
			{/if}
		</div>

		{#if missingRequired.length > 0}
			<div class="mb-2 rounded bg-destructive/10 p-2 text-sm text-destructive">
				Missing required variables: {missingRequired.join(', ')}
			</div>
		{/if}

		<pre
			class="max-h-48 overflow-auto rounded bg-muted/50 p-3 font-mono text-sm whitespace-pre-wrap">{preview.content}</pre>
	</Card>

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
</div>
