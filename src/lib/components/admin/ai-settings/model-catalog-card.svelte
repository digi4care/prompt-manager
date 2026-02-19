<script lang="ts">
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardDescription from '$lib/components/ui/card/card-description.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import { Badge } from '$lib/components/ui/badge';

	interface ModelMeta {
		contextWindow?: number;
		supportsVision?: boolean;
		status?: string;
		limit?: { context: number; output: number };
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
		if (!tokens) return 'Unknown';
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
			<div class="flex-1 space-y-1">
				<CardTitle class="text-base">{name}</CardTitle>
				<CardDescription class="line-clamp-2 text-xs">
					{description || 'No description available'}
				</CardDescription>
			</div>
			<Badge variant="outline" class="shrink-0 text-xs">
				{provider}
			</Badge>
		</div>
	</CardHeader>

	<CardContent class="pb-3">
		<div class="flex flex-wrap gap-2">
			{#if meta?.contextWindow}
				<Badge variant="secondary" class="text-xs">
					{formatContextWindow(meta.contextWindow)} tokens
				</Badge>
			{/if}

			{#if meta?.supportsVision}
				<Badge variant="secondary" class="text-xs">
					<span class="mr-1">👁️</span> Vision
				</Badge>
			{/if}

			{#if meta?.limit}
				<Badge variant="outline" class="text-xs">
					Max: {formatContextWindow(meta.limit.context)} / {formatContextWindow(meta.limit.output)}
				</Badge>
			{/if}

			{#if meta?.status}
				<Badge variant={getStatusVariant(meta.status)} class="text-xs">
					{meta.status}
				</Badge>
			{/if}
		</div>
	</CardContent>
</Card>
