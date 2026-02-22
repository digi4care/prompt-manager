<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import MarkdownRenderer from './markdown-renderer.svelte';
	import { cn } from '$lib/utils';

	interface Props {
		result: {
			content: string;
			model: { displayName: string; providerId: string; modelId: string };
			usage: { inputTokens: number; outputTokens: number; totalTokens: number };
			duration: { ms: number; seconds: number };
			source: 'run' | 'prompt' | 'default';
		};
		oncopy?: () => void;
		class?: string;
	}

	let { result, oncopy, class: className = '' }: Props = $props();

	// Source label mapping for display
	const sourceLabels: Record<string, string> = {
		run: 'Run Override',
		prompt: 'Prompt Setting',
		default: 'Global Default'
	};

	// Copy functionality with feedback
	let copySuccess = $state(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(result.content);
			copySuccess = true;
			oncopy?.();
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy content:', err);
		}
	}

	// Format duration for display
	let formattedDuration = $derived(() => {
		if (result.duration.seconds < 1) {
			return `${result.duration.ms}ms`;
		}
		return `${result.duration.seconds.toFixed(1)}s`;
	});
</script>

<div class={cn('space-y-4', className)}>
	<!-- Metadata bar -->
	<div class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
		<div class="flex flex-wrap items-center gap-2 sm:gap-4">
			<span class="font-medium text-foreground">{result.model.displayName}</span>
			<span class="hidden sm:inline">·</span>
			<span>{result.usage.totalTokens} tokens</span>
			<span class="hidden sm:inline">·</span>
			<span>{formattedDuration()}</span>
		</div>
		<span
			class="rounded bg-muted px-2 py-1 text-xs font-medium"
			title="Settings source: {sourceLabels[result.source]}"
		>
			{sourceLabels[result.source]}
		</span>
	</div>

	<!-- Content -->
	<div class="rounded-lg border bg-background p-4">
		<MarkdownRenderer content={result.content} />
	</div>

	<!-- Actions -->
	<div class="flex justify-end">
		<Button variant="outline" size="sm" onclick={handleCopy}>
			{#if copySuccess}
				<span class="text-success">Copied!</span>
			{:else}
				Copy
			{/if}
		</Button>
	</div>
</div>
