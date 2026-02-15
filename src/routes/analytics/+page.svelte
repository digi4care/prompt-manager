<script lang="ts">
	import { MetricsDashboard } from '$lib/components/visualizations';
	import { PerformanceChart } from '$lib/components/visualizations';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Download, TrendingUp, FileText, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(date: string | Date): string {
		if (!date || date === 'Never') return 'Never';
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function handleExportAll() {
		// Export all analytics data as JSON
		const analyticsData = {
			metrics: data.metrics,
			qualityScores: data.qualityScores,
			usageData: data.usageData,
			topPrompts: data.topPrompts,
			recentImprovements: data.recentImprovements,
			exportedAt: new Date().toISOString()
		};

		const dataStr = JSON.stringify(analyticsData, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const downloadLink = document.createElement('a');
		downloadLink.href = url;
		downloadLink.download = `analytics-export-${Date.now()}.json`;
		document.body.appendChild(downloadLink);
		downloadLink.click();
		document.body.removeChild(downloadLink);
		URL.revokeObjectURL(url);
	}
</script>

<div class="container mx-auto py-6 space-y-6" data-testid="analytics-page">
	<!-- Page Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
			<p class="text-muted-foreground mt-1" data-testid="analytics-description">
				Track your prompt management patterns and performance metrics
			</p>
		</div>
		<Button onclick={handleExportAll} variant="outline" data-testid="export-all-button">
			<Download class="h-4 w-4 mr-2" />
			Export All
		</Button>
	</div>

	<!-- Metrics Dashboard -->
	<div data-testid="metrics-dashboard-section">
		<MetricsDashboard
			totalPrompts={data.metrics.totalPrompts}
			totalVersions={data.metrics.totalVersions}
			avgQualityScore={data.metrics.avgQualityScore}
			improvementsThisWeek={data.metrics.improvementsThisWeek}
			qualityTrend={data.metrics.qualityTrend}
			usageTrend={data.metrics.usageTrend}
			activePrompts={data.metrics.activePrompts}
			lastActivity={data.metrics.lastActivity}
		/>
	</div>

	<!-- Performance Charts -->
	<div data-testid="performance-chart-section">
		<PerformanceChart qualityScores={data.qualityScores} usageData={data.usageData} />
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Top Prompts by Usage -->
		<Card data-testid="top-prompts-section">
			<CardHeader>
				<div class="flex items-center gap-2">
					<TrendingUp class="h-5 w-5 text-muted-foreground" />
					<CardTitle>Top Prompts by Usage</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{#if data.topPrompts.length > 0}
					<ul class="space-y-3" data-testid="top-prompts-list">
						{#each data.topPrompts as prompt}
							<li class="flex items-center justify-between py-2 border-b last:border-0">
								<div class="flex-1">
									<a
										href="/prompts/{prompt.id}"
										class="font-medium hover:text-primary transition-colors"
									>
										{prompt.title}
									</a>
									<p class="text-xs text-muted-foreground mt-1">
										Last updated: {formatDate(prompt.lastUpdated)}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<FileText class="h-4 w-4 text-muted-foreground" />
									<span class="text-sm font-medium">{prompt.versionCount} versions</span>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="py-8 text-center" data-testid="top-prompts-empty">
						<TrendingUp class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
						<p class="text-sm text-muted-foreground">No prompts yet</p>
						<p class="text-xs text-muted-foreground mt-1">
							Create prompts to see usage statistics
						</p>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Recent Improvements Summary -->
		<Card data-testid="recent-improvements-section">
			<CardHeader>
				<div class="flex items-center gap-2">
					<Calendar class="h-5 w-5 text-muted-foreground" />
					<CardTitle>Recent Improvements</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				{#if data.recentImprovements.length > 0}
					<ul class="space-y-3" data-testid="recent-improvements-list">
						{#each data.recentImprovements as improvement}
							<li class="flex items-center justify-between py-2 border-b last:border-0">
								<div class="flex-1">
									<a
										href="/prompts/{improvement.promptId}"
										class="font-medium hover:text-primary transition-colors"
									>
										{improvement.promptTitle}
									</a>
									<p class="text-xs text-muted-foreground mt-1">
										{formatDate(improvement.date)}
									</p>
								</div>
								<div class="flex items-center gap-2">
									<div
										class="px-2 py-1 rounded text-xs font-medium"
										class:bg-green-100={improvement.score >= 80}
										class:text-green-800={improvement.score >= 80}
										class:bg-yellow-100={improvement.score >= 60 && improvement.score < 80}
										class:text-yellow-800={improvement.score >= 60 && improvement.score < 80}
										class:bg-red-100={improvement.score < 60}
										class:text-red-800={improvement.score < 60}
									>
										{improvement.score}%
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="py-8 text-center" data-testid="recent-improvements-empty">
						<Calendar class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
						<p class="text-sm text-muted-foreground">No recent improvements</p>
						<p class="text-xs text-muted-foreground mt-1">
							Use AI improvements to see recent activity
						</p>
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
