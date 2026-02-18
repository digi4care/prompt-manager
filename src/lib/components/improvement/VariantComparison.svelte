<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import VersionDiff from '$lib/components/versions/VersionDiff.svelte';
	import { cn } from '$lib/utils';
	import { Check, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-svelte';

	// Types for judge evaluation
	interface JudgeResponse {
		clarity: number;
		completeness: number;
		specificity: number;
		gaps: string[];
		recommendations: string[];
	}

	// Types for prompt variant
	interface PromptVariant {
		id: number;
		version: string;
		content: string;
		changeType: string;
		changeNotes: string | null;
		createdAt: string;
		createdBy: string;
	}

	// Types for variant with evaluation
	interface VariantWithEvaluation {
		variant: PromptVariant;
		evaluation: JudgeResponse;
	}

	// Types for parent version (original prompt)
	interface ParentVersion {
		id: number;
		version: string;
		content: string;
		title?: string;
		description?: string;
		tags?: string[];
		platform?: string;
		purpose?: string;
	}

	interface Props {
		parentVersion: ParentVersion;
		variants: VariantWithEvaluation[];
		onselect?: (variant: PromptVariant) => void;
		onrejectall?: () => void;
		class?: string;
	}

	let { parentVersion, variants, onselect, onrejectall, class: className = '' }: Props = $props();

	// State
	let selectedVariantId = $state<number | null>(null);
	let previewVariantId = $state<number | null>(null);
	let expandedVariantId = $state<number | null>(null);
	const scoreCriteria: Array<'clarity' | 'completeness' | 'specificity'> = [
		'clarity',
		'completeness',
		'specificity'
	];

	// Calculate overall score for a variant
	function getOverallScore(evaluation: JudgeResponse): number {
		return Math.round((evaluation.clarity + evaluation.completeness + evaluation.specificity) / 3);
	}

	// Get score color based on value
	function getScoreColor(score: number): string {
		if (score >= 80) return 'text-green-600 dark:text-green-400';
		if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	}

	// Get score background color for progress bar
	function getScoreBgColor(score: number): string {
		if (score >= 80) return 'bg-green-500';
		if (score >= 60) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	// Format score label
	function formatScore(score: number): string {
		if (score >= 90) return 'Excellent';
		if (score >= 80) return 'Good';
		if (score >= 70) return 'Fair';
		if (score >= 60) return 'Needs Work';
		return 'Poor';
	}

	// Handle variant selection
	function handleSelectVariant(variant: PromptVariant): void {
		selectedVariantId = variant.id;
		onselect?.(variant);
	}

	// Handle preview toggle
	function togglePreview(variantId: number): void {
		previewVariantId = previewVariantId === variantId ? null : variantId;
	}

	// Handle expand/collapse for diff view
	function toggleExpand(variantId: number): void {
		expandedVariantId = expandedVariantId === variantId ? null : variantId;
	}

	// Handle reject all
	function handleRejectAll(): void {
		selectedVariantId = null;
		onrejectall?.();
	}

	// Get the selected variant
	const selectedVariant = $derived(
		variants.find((v) => v.variant.id === selectedVariantId)?.variant
	);

	// Find best variant (highest score)
	const bestVariant = $derived(
		variants.reduce(
			(best, current) => {
				const bestScore = best ? getOverallScore(best.evaluation) : 0;
				const currentScore = getOverallScore(current.evaluation);
				return currentScore > bestScore ? current : best;
			},
			null as VariantWithEvaluation | null
		)
	);
</script>

<div class={cn('space-y-6', className)}>
	<!-- Header with parent version info -->
	<div class="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
					<span class="font-mono text-sm font-medium">Parent</span>
				</div>
				<div>
					<div class="font-medium">v{parentVersion.version}</div>
					{#if parentVersion.title}
						<div class="text-sm text-muted-foreground">{parentVersion.title}</div>
					{/if}
				</div>
			</div>
			<div class="text-sm text-muted-foreground">
				{variants.length} variant{variants.length !== 1 ? 's' : ''} generated
			</div>
		</div>
	</div>

	<!-- Variant Cards -->
	<div class="grid gap-4" role="list" aria-label="Prompt variants">
		{#each variants as variantData, index (variantData.variant.id)}
			{@const variant = variantData.variant}
			{@const evaluation = variantData.evaluation}
			{@const overallScore = getOverallScore(evaluation)}
			{@const isSelected = selectedVariantId === variant.id}
			{@const isBest = bestVariant?.variant.id === variant.id}
			{@const isPreview = previewVariantId === variant.id}
			{@const isExpanded = expandedVariantId === variant.id}

			<Card
				class={cn(
					'transition-all duration-200',
					isSelected ? 'border-primary bg-primary/5 shadow-md' : 'hover:bg-muted/50'
				)}
				role="listitem"
			>
				<CardHeader class="pb-3">
					<div class="flex items-start justify-between">
						<div class="flex items-center gap-3">
							<div
								class={cn(
									'flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold',
									isBest && !isSelected && 'ring-2 ring-yellow-400',
									isSelected
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground'
								)}
							>
								{index + 1}
								{#if isBest}
									<span class="sr-only"> (Best)</span>
								{/if}
							</div>
							<div>
								<CardTitle class="flex items-center gap-2 text-base">
									Variant {index + 1}
									{#if isBest}
										<span
											class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-normal text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
										>
											Best Score
										</span>
									{/if}
								</CardTitle>
								<div class="text-sm text-muted-foreground">
									{variant.changeNotes || 'AI-generated improvement'}
								</div>
							</div>
						</div>

						<!-- Overall Score Badge -->
						<div
							class={cn(
								'flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold',
								'border-2 border-border',
								overallScore >= 80
									? 'border-green-500 text-green-600 dark:text-green-400'
									: overallScore >= 60
										? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
										: 'border-red-500 text-red-600 dark:text-red-400'
							)}
							role="status"
							aria-label="Overall quality score: {overallScore}"
						>
							{overallScore}
						</div>
					</div>
				</CardHeader>

				<CardContent class="space-y-4">
					<!-- Score Breakdown -->
					<div class="grid gap-3 sm:grid-cols-3">
						{#each scoreCriteria as criterion}
							{@const score =
								criterion === 'clarity'
									? evaluation.clarity
									: criterion === 'completeness'
										? evaluation.completeness
										: evaluation.specificity}
							<div class="space-y-1">
								<div class="flex items-center justify-between text-sm">
									<span class="text-muted-foreground capitalize">{criterion}</span>
									<span class={cn('font-medium', getScoreColor(score))}>{score}%</span>
								</div>
								<Progress value={score} max={100} class={cn('h-2', getScoreBgColor(score))} />
							</div>
						{/each}
					</div>

					<!-- Preview Toggle -->
					<div class="flex items-center gap-2">
						<Button
							variant="ghost"
							size="sm"
							onclick={() => togglePreview(variant.id)}
							class="flex-1"
						>
							{#if isPreview}
								<EyeOff class="mr-2 h-4 w-4" />
								Hide Preview
							{:else}
								<Eye class="mr-2 h-4 w-4" />
								Preview Content
							{/if}
						</Button>

						{#if parentVersion.content !== variant.content}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => toggleExpand(variant.id)}
								class="flex-1"
							>
								{#if isExpanded}
									<ChevronUp class="mr-2 h-4 w-4" />
									Hide Diff
								{:else}
									<ChevronDown class="mr-2 h-4 w-4" />
									Show Diff
								{/if}
							</Button>
						{/if}
					</div>

					<!-- Content Preview -->
					{#if isPreview}
						<div class="rounded-lg bg-muted/50 p-4">
							<pre class="font-mono text-sm break-words whitespace-pre-wrap">{variant.content}</pre>
						</div>
					{/if}

					<!-- Diff View with Parent -->
					{#if isExpanded && parentVersion.content !== variant.content}
						<VersionDiff
							oldContent={parentVersion.content}
							newContent={variant.content}
							oldVersion={parentVersion.version}
							newVersion={variant.version}
							oldTitle={parentVersion.title}
							newTitle={parentVersion.title}
							oldDescription={parentVersion.description}
							newDescription={parentVersion.description}
							oldTags={parentVersion.tags}
							newTags={parentVersion.tags}
							oldPlatform={parentVersion.platform}
							newPlatform={parentVersion.platform}
							oldPurpose={parentVersion.purpose}
							newPurpose={parentVersion.purpose}
							class="mt-4"
						/>
					{/if}

					<!-- Action Buttons -->
					<div class="flex items-center gap-2 pt-2">
						<Button
							variant={isSelected ? 'default' : 'outline'}
							size="sm"
							onclick={() => handleSelectVariant(variant)}
							class="flex-1"
						>
							{#if isSelected}
								<Check class="mr-2 h-4 w-4" />
								Selected
							{:else}
								<Check class="mr-2 h-4 w-4" />
								Select as New Version
							{/if}
						</Button>

						{#if index === 0}
							<!-- Reject All button only on first variant -->
							<Button
								variant="outline"
								size="sm"
								onclick={handleRejectAll}
								class="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
							>
								<X class="mr-2 h-4 w-4" />
								Reject All
							</Button>
						{/if}
					</div>
				</CardContent>
			</Card>
		{/each}
	</div>

	<!-- Empty State -->
	{#if variants.length === 0}
		<div
			class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center"
		>
			<svg
				class="h-8 w-8 text-muted-foreground"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<rect width="18" height="18" x="3" y="3" rx="2" />
				<path d="M12 8v8" />
				<path d="M8 12h8" />
			</svg>
			<p class="text-sm text-muted-foreground">No variants generated yet</p>
			<p class="text-xs text-muted-foreground">Run the improvement process to generate variants</p>
		</div>
	{/if}
</div>
