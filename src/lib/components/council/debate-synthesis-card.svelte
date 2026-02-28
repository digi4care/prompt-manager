<script lang="ts">
	/**
	 * DebateSynthesisCard - Prominent synthesis display card
	 *
	 * Displays the final synthesis from a debate with structured sections:
	 * - Summary overview
	 * - Arguments For (green)
	 * - Arguments Against (red)
	 * - Points of Agreement (amber, conditionally rendered)
	 * - Final Recommendation (highlighted)
	 */
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import Star from 'lucide-svelte/icons/star';
	import CheckCircle from 'lucide-svelte/icons/check-circle';
	import XCircle from 'lucide-svelte/icons/x-circle';
	import MinusCircle from 'lucide-svelte/icons/minus-circle';
	import Lightbulb from 'lucide-svelte/icons/lightbulb';
	import MarkdownRenderer from '$lib/components/prompts/markdown-renderer.svelte';

	/**
	 * Synthesis structure from debate
	 */
	export interface DebateSynthesis {
		summary: string;
		keyArgumentsFor: string[];
		keyArgumentsAgainst: string[];
		pointsOfAgreement: string[];
		finalRecommendation: string;
		consensusLevel: 'Strong consensus' | 'Moderate consensus' | 'Mixed views';
	}

	interface Props {
		synthesis: DebateSynthesis;
		class?: string;
	}

	let { synthesis, class: className = '' }: Props = $props();

	// Consensus badge variant mapping
	let badgeVariant = $derived<'default' | 'secondary' | 'outline'>(
		synthesis.consensusLevel === 'Strong consensus'
			? 'default'
			: synthesis.consensusLevel === 'Moderate consensus'
				? 'secondary'
				: 'outline'
	);

	// Badge color class based on consensus level
	let badgeClass = $derived(
		synthesis.consensusLevel === 'Strong consensus'
			? 'bg-green-600 text-white hover:bg-green-700'
			: synthesis.consensusLevel === 'Moderate consensus'
				? 'bg-amber-600 text-white hover:bg-amber-700'
				: 'border-amber-500 text-amber-600 dark:text-amber-400'
	);
</script>

<Card
	class={cn(
		'relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-6',
		className
	)}
>
	<!-- Star icon at top for prominence -->
	<div class="absolute top-4 right-4 text-primary/20">
		<Star class="h-8 w-8 fill-primary/30" />
	</div>

	<!-- Header -->
	<div class="mb-4 flex items-center gap-3">
		<Star class="h-5 w-5 fill-primary text-primary" />
		<h3 class="text-lg font-semibold">Synthesis</h3>
		<Badge class={badgeClass} variant={badgeVariant}>
			{synthesis.consensusLevel}
		</Badge>
	</div>

	<!-- Summary section -->
	<div class="mb-6 rounded-lg bg-muted/50 p-4">
		<p class="text-sm leading-relaxed">{synthesis.summary}</p>
	</div>

	<!-- Arguments grid: For vs Against -->
	<div class="mb-6 grid gap-4 md:grid-cols-2">
		<!-- Arguments For -->
		<div
			class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/50"
		>
			<div class="mb-3 flex items-center gap-2">
				<CheckCircle class="h-4 w-4 text-green-600 dark:text-green-400" />
				<h4 class="font-medium text-green-700 dark:text-green-300">Arguments For</h4>
			</div>
			{#if synthesis.keyArgumentsFor.length > 0}
				<ul class="space-y-2 text-sm text-green-800 dark:text-green-200">
					{#each synthesis.keyArgumentsFor as argument, i (i)}
						<li class="flex gap-2">
							<span class="text-green-500">•</span>
							<span>{argument}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-green-600/60 italic dark:text-green-400/60">
					No supporting arguments identified
				</p>
			{/if}
		</div>

		<!-- Arguments Against -->
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50"
		>
			<div class="mb-3 flex items-center gap-2">
				<XCircle class="h-4 w-4 text-red-600 dark:text-red-400" />
				<h4 class="font-medium text-red-700 dark:text-red-300">Arguments Against</h4>
			</div>
			{#if synthesis.keyArgumentsAgainst.length > 0}
				<ul class="space-y-2 text-sm text-red-800 dark:text-red-200">
					{#each synthesis.keyArgumentsAgainst as argument, i (i)}
						<li class="flex gap-2">
							<span class="text-red-500">•</span>
							<span>{argument}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-red-600/60 italic dark:text-red-400/60">
					No opposing arguments identified
				</p>
			{/if}
		</div>
	</div>

	<!-- Points of Agreement (conditionally rendered) -->
	{#if synthesis.pointsOfAgreement.length > 0}
		<div
			class="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50"
		>
			<div class="mb-3 flex items-center gap-2">
				<MinusCircle class="h-4 w-4 text-amber-600 dark:text-amber-400" />
				<h4 class="font-medium text-amber-700 dark:text-amber-300">Points of Agreement</h4>
			</div>
			<ul class="space-y-2 text-sm text-amber-800 dark:text-amber-200">
				{#each synthesis.pointsOfAgreement as point, i (i)}
					<li class="flex gap-2">
						<span class="text-amber-500">•</span>
						<span>{point}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Final Recommendation -->
	<div class="rounded-lg border-2 border-primary/40 bg-primary/10 p-4">
		<div class="mb-3 flex items-center gap-2">
			<Lightbulb class="h-4 w-4 text-primary" />
			<h4 class="font-medium text-primary">Final Recommendation</h4>
		</div>
		<div class="text-sm leading-relaxed">
			<MarkdownRenderer content={synthesis.finalRecommendation} />
		</div>
	</div>
</Card>
