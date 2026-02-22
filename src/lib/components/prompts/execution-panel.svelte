<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ExecutionOverrides from './execution-overrides.svelte';
	import ExecutionResult from './execution-result.svelte';
	import { cn } from '$lib/utils';
	import Play from '@lucide/svelte/icons/play';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import type { RunOverrides } from '$lib/server/services/settings-cascade.service';

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
		content: string;
		functionType?: 'executor' | 'judge' | 'improve' | 'council';
		class?: string;
	}

	let { promptId, content, functionType = 'executor', class: className = '' }: Props = $props();

	// State machine
	type ExecutionState = 'idle' | 'loading' | 'success' | 'error';

	let executionState = $state('idle') as ExecutionState;
	let result = $state(null) as ExecutionResultData | null;
	let errorInfo = $state(null) as ErrorInfo | null;
	let overrides = $state({}) as RunOverrides;

	// Derived states
	let isExecuting = $derived(executionState === 'loading');
	let canExecute = $derived(executionState !== 'loading' && content.trim().length > 0);
	let hasResult = $derived(executionState === 'success' && result !== null);
	let hasError = $derived(executionState === 'error' && errorInfo !== null);

	// Default settings (could be made configurable via props in future)
	const defaults = {
		modelId: 'anthropic/claude-3-5-sonnet',
		temperature: 0.7,
		maxTokens: 4096
	};

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
					content,
					functionType,
					overrides: Object.keys(overrides).length > 0 ? overrides : undefined
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

	function handleOverridesChange(newOverrides: RunOverrides) {
		overrides = newOverrides;
	}
</script>

<div class={cn('execution-panel space-y-4', className)}>
	<!-- Override controls (collapsible) -->
	<ExecutionOverrides
		{overrides}
		onchange={handleOverridesChange}
		{defaults}
		disabled={isExecuting}
	/>

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
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
			<div class="flex items-start gap-3">
				<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
				<div class="flex-1">
					<p class="font-medium text-red-800 dark:text-red-200">{errorInfo?.message}</p>
					{#if errorInfo?.recovery}
						<p class="mt-1 text-sm text-red-600 dark:text-red-300">{errorInfo.recovery}</p>
					{/if}
					{#if errorInfo?.code}
						<p class="mt-1 text-xs text-red-500 dark:text-red-400">Error code: {errorInfo.code}</p>
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
		<ExecutionResult {result} />
		<div class="flex justify-end">
			<Button variant="outline" size="sm" onclick={handleReset}>Clear Result</Button>
		</div>
	{/if}
</div>
