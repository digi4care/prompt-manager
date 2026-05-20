<!--
  AgentCard — displays a single agent's state/output in the council review panel.
  Extracted from council-review-panel.svelte for reusability.
-->
<script lang="ts">
	import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-svelte';
	import type { AgentState } from './council-types';
	import { getAgentColorClass } from './council-types';

	interface Props {
		agent: AgentState;
		elapsedSeconds?: number;
	}

	let { agent, elapsedSeconds = 0 }: Props = $props();
</script>

<div
	class="rounded-lg border p-4 transition-colors {getAgentColorClass(agent.id)}"
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
				{agent.error || 'An error occurred'}
			</p>
		{/if}
	</div>
</div>
