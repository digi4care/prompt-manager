<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import Clock from 'lucide-svelte/icons/clock';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import XCircle from 'lucide-svelte/icons/x-circle';
	import Loader2 from 'lucide-svelte/icons/loader-2';

	interface ExecutionLog {
		id: number;
		modelId: string;
		modelSource: 'run' | 'prompt' | 'default';
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
		durationMs: number;
		status: 'success' | 'error';
		createdAt: Date | string | number;
	}

	interface Props {
		promptId: number;
		onselect?: (log: ExecutionLog) => void;
		selectedLogId?: number | null;
		class?: string;
	}

	let { promptId, onselect, selectedLogId = null, class: className }: Props = $props();

	// State
	let logs = $state<ExecutionLog[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Source label mapping for display
	const sourceLabels: Record<string, string> = {
		run: 'Run Override',
		prompt: 'Prompt Setting',
		default: 'Global Default'
	};

	// Format duration for display
	function formatDuration(ms: number): string {
		if (ms < 1000) {
			return `${ms}ms`;
		}
		return `${(ms / 1000).toFixed(1)}s`;
	}

	// Format date for display
	function formatDate(date: Date | string | number): string {
		return new Date(date).toLocaleString();
	}

	// Extract model display name from modelId (format: providerId/modelId)
	function getModelDisplayName(modelId: string): string {
		const parts = modelId.split('/');
		return parts.length > 1 ? parts[1] : modelId;
	}

	// Fetch history when promptId changes
	$effect(() => {
		if (promptId) {
			loadHistory();
		}
	});

	async function loadHistory() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/prompts/${promptId}/history?limit=50`);

			if (!response.ok) {
				throw new Error('Failed to load execution history');
			}

			const data = await response.json();
			// API returns { data: [...], pagination: {...} }
			logs = data.data || data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load history';
			console.error('Failed to load execution history:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleLogClick(log: ExecutionLog) {
		onselect?.(log);
	}
</script>

<div class={cn('space-y-2', className)}>
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			<span class="ml-2 text-sm text-muted-foreground">Loading history...</span>
		</div>
	{:else if error}
		<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
			<p class="text-sm text-destructive">{error}</p>
		</div>
	{:else if logs.length === 0}
		<div class="py-8 text-center">
			<p class="text-sm text-muted-foreground">No execution history</p>
			<p class="mt-1 text-xs text-muted-foreground">Execute this prompt to see results here</p>
		</div>
	{:else}
		{#each logs as log (log.id)}
			<button
				class={cn(
					'w-full rounded-lg border p-3 text-left transition-colors',
					'hover:bg-muted/50',
					selectedLogId === log.id && 'border-primary bg-primary/5'
				)}
				onclick={() => handleLogClick(log)}
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						{#if log.status === 'success'}
							<CheckCircle class="h-4 w-4 text-green-500" />
						{:else}
							<XCircle class="h-4 w-4 text-red-500" />
						{/if}
						<span class="text-sm font-medium">{getModelDisplayName(log.modelId)}</span>
					</div>
					<Badge variant="outline" class="text-xs">
						{sourceLabels[log.modelSource] || log.modelSource}
					</Badge>
				</div>
				<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
					<span>{log.totalTokens} tokens</span>
					<span class="text-muted-foreground/50">·</span>
					<span class="flex items-center gap-1">
						<Clock class="h-3 w-3" />
						{formatDuration(log.durationMs)}
					</span>
					<span class="text-muted-foreground/50">·</span>
					<span>{formatDate(log.createdAt)}</span>
				</div>
			</button>
		{/each}
	{/if}
</div>
