<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import MarkdownRenderer from './markdown-renderer.svelte';
	import { cn } from '$lib/utils';
	import X from 'lucide-svelte/icons/x';
	import AlertCircle from 'lucide-svelte/icons/alert-circle';
	import Loader2 from 'lucide-svelte/icons/loader-2';
	import Clock from 'lucide-svelte/icons/clock';

	interface ExecutionLog {
		id: number;
		promptId: number;
		versionId: number | null;
		inputContent: string;
		outputContent: string | null;
		modelId: string;
		modelSource: 'run' | 'prompt' | 'default';
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
		durationMs: number;
		status: 'success' | 'error';
		errorCode: string | null;
		errorMessage: string | null;
		functionType: string;
		createdAt: Date | string | number;
	}

	interface Props {
		logId: number;
		promptId: number;
		onclose?: () => void;
		class?: string;
	}

	let { logId, promptId, onclose, class: className }: Props = $props();

	// State
	let log = $state<ExecutionLog | null>(null);
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

	// Fetch log detail when logId changes
	$effect(() => {
		if (logId && promptId) {
			loadLogDetail();
		}
	});

	async function loadLogDetail() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/prompts/${promptId}/history/${logId}`);

			if (!response.ok) {
				if (response.status === 404) {
					throw new Error('Log not found');
				}
				throw new Error('Failed to load log details');
			}

			const data = await response.json();
			// API returns { data: ExecutionLog }
			log = data.data || data;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load log details';
			console.error('Failed to load log details:', err);
		} finally {
			isLoading = false;
		}
	}

	function handleClose() {
		onclose?.();
	}

	function handleRetry() {
		loadLogDetail();
	}
</script>

<div class={cn('space-y-4', className)}>
	{#if isLoading}
		<Card class="p-6">
			<div class="flex items-center justify-center py-8">
				<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
				<span class="ml-2 text-sm text-muted-foreground">Loading details...</span>
			</div>
		</Card>
	{:else if error}
		<Card class="p-6">
			<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
				<p class="text-sm text-destructive">{error}</p>
				<Button variant="outline" size="sm" class="mt-3" onclick={handleRetry}>Retry</Button>
			</div>
		</Card>
	{:else if log}
		<Card class="overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between border-b p-4">
				<div class="flex items-center gap-3">
					{#if log.status === 'success'}
						<Badge variant="default" class="bg-green-500">Success</Badge>
					{:else}
						<Badge variant="destructive">Error</Badge>
					{/if}
					<span class="font-medium">{getModelDisplayName(log.modelId)}</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
					{#if onclose}
						<Button variant="ghost" size="icon" class="h-6 w-6" onclick={handleClose}>
							<X class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			</div>

			<!-- Metadata bar -->
			<div
				class="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground"
			>
				<Badge variant="outline" class="text-xs">
					{sourceLabels[log.modelSource] || log.modelSource}
				</Badge>
				<span class="text-muted-foreground/50">·</span>
				<span>{log.inputTokens} in / {log.outputTokens} out / {log.totalTokens} total tokens</span>
				<span class="text-muted-foreground/50">·</span>
				<span class="flex items-center gap-1">
					<Clock class="h-3 w-3" />
					{formatDuration(log.durationMs)}
				</span>
			</div>

			<!-- Content -->
			<div class="max-h-[500px] space-y-4 overflow-y-auto p-4">
				<!-- Input section -->
				<div class="space-y-2">
					<h4 class="text-sm font-medium text-muted-foreground">Input Prompt</h4>
					<pre
						class="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap">{log.inputContent}</pre>
				</div>

				<!-- Output/Error section -->
				{#if log.status === 'success'}
					<div class="space-y-2">
						<h4 class="text-sm font-medium text-muted-foreground">Output</h4>
						{#if log.outputContent}
							<div class="rounded-lg border bg-background p-3">
								<MarkdownRenderer content={log.outputContent} />
							</div>
						{:else}
							<p class="text-sm text-muted-foreground italic">No output content</p>
						{/if}
					</div>
				{:else}
					<div class="space-y-2">
						<h4 class="text-sm font-medium text-red-500">Error</h4>
						<div
							class="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
						>
							<div class="flex items-start gap-2">
								<AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
								<div class="flex-1">
									<p class="text-sm text-red-800 dark:text-red-200">
										{log.errorMessage || 'An error occurred during execution'}
									</p>
									{#if log.errorCode}
										<Badge variant="outline" class="mt-2 text-xs">
											{log.errorCode}
										</Badge>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</Card>
	{:else}
		<Card class="p-6">
			<p class="text-center text-sm text-muted-foreground">No log selected</p>
		</Card>
	{/if}
</div>
