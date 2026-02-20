<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Calendar } from 'lucide-svelte';
	import {
		Download,
		TrendingUp,
		TrendingDown,
		Minus,
		FileText,
		Zap,
		Target,
		Clock
	} from 'lucide-svelte';
	import { cn } from '$lib/utils';

	type DateRange = '7d' | '30d' | '90d' | 'all';

	interface Props {
		totalPrompts?: number;
		totalVersions?: number;
		avgQualityScore?: number;
		improvementsThisWeek?: number;
		qualityTrend?: 'up' | 'down' | 'stable';
		usageTrend?: 'up' | 'down' | 'stable';
		activePrompts?: number;
		lastActivity?: string;
		class?: string;
	}

	let {
		totalPrompts = 0,
		totalVersions = 0,
		avgQualityScore = 0,
		improvementsThisWeek = 0,
		qualityTrend = 'stable',
		usageTrend = 'stable',
		activePrompts = 0,
		lastActivity = 'Never',
		class: className = ''
	}: Props = $props();

	// Date range state
	let selectedRange = $state<DateRange>('30d');
	let customStartDate = $state<string>('');
	let customEndDate = $state<string>('');

	const dateRangeOptions: { value: DateRange; label: string }[] = [
		{ value: '7d', label: 'Last 7 days' },
		{ value: '30d', label: 'Last 30 days' },
		{ value: '90d', label: 'Last 90 days' },
		{ value: 'all', label: 'All time' }
	];

	function getDateRangeLabel(range: DateRange): string {
		const option = dateRangeOptions.find((o) => o.value === range);
		return option?.label || 'Custom';
	}

	function handleRangeChange(range: DateRange) {
		selectedRange = range;
		// Emit event or trigger callback for parent to reload data
		const event = new CustomEvent('daterangechange', {
			detail: { range, startDate: customStartDate, endDate: customEndDate }
		});
		document.dispatchEvent(event);
	}

	function getTrendIcon(trend: string) {
		switch (trend) {
			case 'up':
				return TrendingUp;
			case 'down':
				return TrendingDown;
			default:
				return Minus;
		}
	}

	function getTrendColor(trend: string) {
		switch (trend) {
			case 'up':
				return 'text-green-500';
			case 'down':
				return 'text-red-500';
			default:
				return 'text-muted-foreground';
		}
	}

	async function handleExport() {
		// Export dashboard metrics as JSON
		const metrics = {
			totalPrompts,
			totalVersions,
			avgQualityScore,
			improvementsThisWeek,
			activePrompts,
			lastActivity,
			exportedAt: new Date().toISOString()
		};

		const dataStr = JSON.stringify(metrics, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const downloadLink = document.createElement('a');
		downloadLink.href = url;
		downloadLink.download = `metrics-dashboard-${Date.now()}.json`;
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
		URL.revokeObjectURL(url);
	}

	function formatDate(date: string | Date): string {
		if (!date || date === 'Never') return 'Never';
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div id="metrics-dashboard-container" class={cn('space-y-6', className)}>
	<!-- Header with Date Range -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<h2 class="text-xl font-semibold">Metrics Dashboard</h2>
		<div class="flex flex-wrap items-center gap-2">
			<!-- Date Range Selector -->
			<div class="flex items-center gap-1 rounded-md border bg-background p-1">
				{#each dateRangeOptions as option}
					<button
						type="button"
						onclick={() => handleRangeChange(option.value)}
						class={cn(
							'rounded-sm px-3 py-1 text-sm transition-colors',
							selectedRange === option.value
								? 'bg-primary text-primary-foreground'
								: 'hover:bg-accent hover:text-accent-foreground'
						)}
					>
						{option.label}
					</button>
				{/each}
			</div>
			<!-- Export Button -->
			<button
				class="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleExport}
				aria-label="Export metrics data"
				type="button"
			>
				<Download class="mr-2 h-4 w-4" />
				Export Data
			</button>
		</div>
	</div>

	<!-- Key Metrics Grid -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Total Prompts -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Prompts</CardTitle>
				<FileText class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{totalPrompts}</div>
				<p class="text-xs text-muted-foreground">
					{activePrompts} active
				</p>
			</CardContent>
		</Card>

		<!-- Total Versions -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total Versions</CardTitle>
				<Zap class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{totalVersions}</div>
				<p class="text-xs text-muted-foreground">
					{improvementsThisWeek} this week
				</p>
			</CardContent>
		</Card>

		<!-- Average Quality Score -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Avg Quality Score</CardTitle>
				<Target class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="flex items-center gap-2">
					<span class="text-2xl font-bold">{avgQualityScore}%</span>
					{#if qualityTrend !== 'stable'}
						{@const QualityTrendIcon = getTrendIcon(qualityTrend)}
						<div class={cn('flex items-center', getTrendColor(qualityTrend))}>
							<QualityTrendIcon class="h-4 w-4" />
						</div>
					{/if}
				</div>
				<div class="mt-1 h-2 w-full rounded-full bg-muted">
					<div
						class="h-2 rounded-full transition-all"
						class:bg-green-500={avgQualityScore >= 80}
						class:bg-yellow-500={avgQualityScore >= 60 && avgQualityScore < 80}
						class:bg-red-500={avgQualityScore < 60}
						style="width: {avgQualityScore}%"
					></div>
				</div>
			</CardContent>
		</Card>

		<!-- Last Activity -->
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Last Activity</CardTitle>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl text-sm font-bold">{formatDate(lastActivity)}</div>
				<p class="text-xs text-muted-foreground">
					{#if usageTrend !== 'stable'}
						{@const UsageTrendIcon = getTrendIcon(usageTrend)}
						<span class={cn('mt-1 flex items-center gap-1', getTrendColor(usageTrend))}>
							<UsageTrendIcon class="h-3 w-3" />
							{usageTrend === 'up' ? 'Increasing' : 'Decreasing'} activity
						</span>
					{:else}
						<span>Stable activity</span>
					{/if}
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Empty State -->
	{#if totalPrompts === 0 && totalVersions === 0}
		<div id="metrics-dashboard-empty-container">
			<Card>
				<CardContent class="flex flex-col items-center justify-center py-12 text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="mb-4 text-muted-foreground"
					>
						<path d="M3 3v18h18" />
						<path d="m19 9-5 5-4-4-3 3" />
					</svg>
					<h3 class="mb-2 text-lg font-semibold">No metrics yet</h3>
					<p class="max-w-md text-muted-foreground">
						Create prompts and use AI improvements to start tracking your performance metrics.
					</p>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
