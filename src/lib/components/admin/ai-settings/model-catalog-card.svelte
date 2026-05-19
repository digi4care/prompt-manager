<script lang="ts">
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';

	interface ModelMeta {
		context_window?: number;
		supports_vision?: boolean;
		supports_function_call?: boolean;
		supports_thinking?: boolean;
		supportsThinking?: boolean;
		status?: string;
		limit?: { context: number; output: number };
		variants?: Array<{ id: string; label?: string; isDefault?: boolean }>;
		reasoningEffortLevels?: string[];
		pricing?: { input?: number; output?: number; currency?: string };
		max_output_tokens?: number;
	}

	interface Props {
		id: string;
		name: string;
		provider: string;
		description?: string;
		meta?: ModelMeta;
	}

	let { id, name, provider, description, meta }: Props = $props();

	function formatContextWindow(tokens?: number): string {
		if (!tokens) return 'N/A';
		if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
		if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
		return `${tokens}`;
	}

	function getStatusVariant(status?: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		if (!status) return 'secondary';
		if (status === 'active' || status === 'available') return 'default';
		if (status === 'deprecated' || status === 'unavailable') return 'destructive';
		return 'secondary';
	}
</script>

<Card class="transition-all hover:shadow-lg">
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<div class="flex flex-1 items-center gap-3">
				<ProviderLogo providerId={provider} {name} size="lg" />
				<div class="flex-1 space-y-1">
					<CardTitle class="text-base">{name}</CardTitle>
					{#if description}
						<CardDescription class="line-clamp-2 text-xs">
							{description}
						</CardDescription>
					{/if}
				</div>
			</div>
			<Badge variant={getStatusVariant(meta?.status)} class="shrink-0 text-xs">
				{meta?.status || 'unknown'}
			</Badge>
		</div>
	</CardHeader>

	<CardContent class="pb-3">
		<div class="flex flex-wrap gap-2">
			{#if meta?.context_window}
				<Badge variant="secondary" class="text-xs">
					{formatContextWindow(meta.context_window)} ctx
				</Badge>
			{/if}

			{#if meta?.limit?.context}
				<Badge variant="outline" class="text-xs">
					Limit: {formatContextWindow(meta.limit.context)}
				</Badge>
			{/if}

			{#if meta?.limit?.output}
				<Badge variant="outline" class="text-xs">
					Out: {formatContextWindow(meta.limit.output)}
				</Badge>
			{/if}

			{#if meta?.max_output_tokens}
				<Badge variant="outline" class="text-xs">
					Max out: {formatContextWindow(meta.max_output_tokens)}
				</Badge>
			{/if}

			{#if meta?.supports_vision}
				<Badge variant="secondary" class="text-xs">
					<span class="mr-1">👁️</span> Vision
				</Badge>
			{/if}

			{#if meta?.supports_function_call}
				<Badge variant="secondary" class="text-xs">
					<span class="mr-1">⚡</span> Function Call
				</Badge>
			{/if}

			{#if meta?.pricing?.input || meta?.pricing?.output}
				<Badge variant="outline" class="text-xs">
					💰
					{#if meta?.pricing?.input}
						${meta.pricing.input}/1K in
					{/if}
					{#if meta?.pricing?.output}
						${meta.pricing.output}/1K out
					{/if}
				</Badge>
			{/if}

			{#if meta?.variants && meta.variants.length > 0}
				<Badge variant="secondary" class="text-xs">
					{meta.variants.length} variant{meta.variants.length > 1 ? 's' : ''}
				</Badge>
			{/if}

			{#if meta?.supports_thinking || meta?.supportsThinking}
				<Badge variant="secondary" class="text-xs">
					<span class="mr-1">🧠</span> Thinking
				</Badge>
			{/if}

			{#if meta?.reasoningEffortLevels && meta.reasoningEffortLevels.length > 0}
				<Badge variant="outline" class="text-xs">
					Reasoning: {meta.reasoningEffortLevels.join(', ')}
				</Badge>
			{/if}
		</div>

		{#if meta?.variants && meta.variants.length > 0}
			<div class="mt-3 flex flex-wrap gap-1">
				<span class="text-[10px] text-muted-foreground uppercase">Variants:</span>
				{#each meta.variants as variant}
					<span class="rounded bg-muted px-1.5 py-0.5 text-[10px]">
						{variant.label || variant.id}
					</span>
				{/each}
			</div>
		{/if}
	</CardContent>
</Card>
