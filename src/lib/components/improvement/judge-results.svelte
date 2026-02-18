<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import { dateFormatStore } from '$lib/stores/date-format.svelte';
	import { formatDateString } from '$lib/utils/date';

	// Types for judge evaluation
	export interface JudgeResponse {
		clarity: number;
		completeness: number;
		specificity: number;
		gaps: string[];
		recommendations: string[];
	}

	// Types for historical score data
	export interface HistoricalScore {
		versionId: number;
		version: string;
		createdAt: Date;
		qualityScore: number;
		clarity: number;
		completeness: number;
		specificity: number;
	}

	interface Props {
		evaluation: JudgeResponse;
		historicalScores?: HistoricalScore[];
		class?: string;
	}

	let { evaluation, historicalScores = [], class: className = '' }: Props = $props();

	// Calculate overall score
	const overallScore = $derived(
		Math.round((evaluation.clarity + evaluation.completeness + evaluation.specificity) / 3)
	);

	// Score criteria for display
	const criteria = $derived([
		{
			key: 'clarity' as const,
			label: 'Clarity',
			description: 'Is the prompt clear and unambiguous?',
			score: evaluation.clarity
		},
		{
			key: 'completeness' as const,
			label: 'Completeness',
			description: 'Does it include all necessary context?',
			score: evaluation.completeness
		},
		{
			key: 'specificity' as const,
			label: 'Specificity',
			description: 'Are instructions specific and actionable?',
			score: evaluation.specificity
		}
	]);

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

	// Get historical chart data - latest 10 scores
	const chartData = $derived(
		[...historicalScores]
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
			.slice(-10)
	);

	// Find min/max for chart scaling
	const chartMin = $derived(
		chartData.length > 0 ? Math.min(...chartData.map((d) => d.qualityScore)) - 10 : 0
	);
	const chartMax = $derived(
		chartData.length > 0 ? Math.max(...chartData.map((d) => d.qualityScore)) + 10 : 100
	);

	// Calculate bar position (0-100 scale based on min/max)
	function getBarPosition(score: number): number {
		const range = chartMax - chartMin;
		if (range <= 0) return score;
		return Math.min(100, Math.max(0, ((score - chartMin) / range) * 100));
	}
</script>

<div class={cn('space-y-6', className)}>
	<!-- Overall Score -->
	<div class="flex items-center gap-4">
		<div
			class={cn(
				'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold',
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
		<div>
			<div class="text-lg font-medium">{formatScore(overallScore)}</div>
			<div class="text-sm text-muted-foreground">Overall Quality Score</div>
		</div>
	</div>

	<!-- Score Breakdown -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">Score Breakdown</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid gap-4 sm:grid-cols-3">
				{#each criteria as criterion (criterion.key)}
					<div class="space-y-2" role="group" aria-label="{criterion.label}: {criterion.score}%">
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">{criterion.label}</span>
							<span class={cn('font-medium', getScoreColor(criterion.score))}>
								{criterion.score}%
							</span>
						</div>
						<Progress
							value={criterion.score}
							max={100}
							class={cn('h-2', getScoreBgColor(criterion.score))}
						/>
						<p class="text-xs text-muted-foreground">{criterion.description}</p>
					</div>
				{/each}
			</div>
		</CardContent>
	</Card>

	<!-- Identified Gaps -->
	{#if evaluation.gaps.length > 0}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-base">
					<svg
						class="h-4 w-4 text-amber-500"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
						<line x1="12" y1="9" x2="12" y2="13" />
						<line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
					Identified Gaps
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ul class="space-y-2" role="list" aria-label="Identified gaps">
					{#each evaluation.gaps as gap, index (index)}
						<li class="flex items-start gap-2">
							<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true"
							></span>
							<span class="text-sm text-muted-foreground">{gap}</span>
						</li>
					{/each}
				</ul>
			</CardContent>
		</Card>
	{/if}

	<!-- Recommendations -->
	{#if evaluation.recommendations.length > 0}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-base">
					<svg
						class="h-4 w-4 text-blue-500"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M12 2a10 10 0 1 0 10 10H12V2z" />
						<path d="M12 2a10 10 0 0 1 10 10" />
						<path d="M12 12 2.1 10.55" />
					</svg>
					Recommendations
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ul class="space-y-2" role="list" aria-label="Recommendations">
					{#each evaluation.recommendations as rec, index (index)}
						<li class="flex items-start gap-2">
							<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true"
							></span>
							<span class="text-sm text-muted-foreground">{rec}</span>
						</li>
					{/each}
				</ul>
			</CardContent>
		</Card>
	{/if}

	<!-- Historical Scores Chart -->
	{#if historicalScores.length > 0}
		<Card>
			<CardHeader>
				<CardTitle class="text-base">Quality Score History</CardTitle>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<!-- Chart Legend -->
					<div class="flex items-center justify-between text-xs text-muted-foreground">
						<span>Version</span>
						<span>Quality Score</span>
					</div>

					<!-- Simple bar chart visualization -->
					<div class="space-y-2" role="img" aria-label="Quality score history chart">
						{#each chartData as data (data.versionId)}
							{@const position = getBarPosition(data.qualityScore)}
							<div class="group relative flex items-center gap-3">
								<span class="w-12 truncate text-xs text-muted-foreground">
									v{data.version}
								</span>
								<div class="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
									<div
										class="absolute top-0 left-0 h-full rounded-md transition-all duration-300"
										class:bg-green-500={data.qualityScore >= 80}
										class:bg-yellow-500={data.qualityScore >= 60 && data.qualityScore < 80}
										class:bg-red-500={data.qualityScore < 60}
										style="width: {position}%"
									></div>
									<span
										class="absolute inset-0 flex items-center justify-center text-xs font-medium"
										class:text-white={data.qualityScore < 60}
										class:text-foreground={data.qualityScore >= 60}
									>
										{data.qualityScore}
									</span>
								</div>
								<span class="w-8 text-right text-xs text-muted-foreground">
									{formatDateString(new Date(data.createdAt), dateFormatStore.format)}
								</span>

								<!-- Tooltip -->
								<div
									class="absolute bottom-full left-0 z-10 mb-2 hidden rounded-md border bg-popover p-2 text-xs whitespace-nowrap shadow-md group-hover:block"
								>
									<div class="font-medium">v{data.version}</div>
									<div class="text-muted-foreground">
										Created: {formatDateString(new Date(data.createdAt), dateFormatStore.format)}
									</div>
									<div class="mt-1 grid grid-cols-3 gap-2">
										<span>Clarity: {data.clarity}</span>
										<span>Complete: {data.completeness}</span>
										<span>Specific: {data.specificity}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<!-- Score distribution summary -->
					<div class="grid grid-cols-3 gap-2 border-t pt-2">
						<div class="text-center">
							<div class="text-lg font-semibold text-green-600 dark:text-green-400">
								{historicalScores.filter((d) => d.qualityScore >= 80).length}
							</div>
							<div class="text-xs text-muted-foreground">Good+</div>
						</div>
						<div class="text-center">
							<div class="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
								{historicalScores.filter((d) => d.qualityScore >= 60 && d.qualityScore < 80).length}
							</div>
							<div class="text-xs text-muted-foreground">Fair</div>
						</div>
						<div class="text-center">
							<div class="text-lg font-semibold text-red-600 dark:text-red-400">
								{historicalScores.filter((d) => d.qualityScore < 60).length}
							</div>
							<div class="text-xs text-muted-foreground">Needs Work</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>
