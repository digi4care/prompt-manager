<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { Chart, registerables } from 'chart.js';
	import { Download } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	Chart.register(...registerables);

	interface QualityScoreData {
		date: string;
		clarity: number;
		completeness: number;
		specificity: number;
		overall: number;
	}

	interface UsageData {
		date: string;
		count: number;
	}

	interface Props {
		qualityScores?: QualityScoreData[];
		usageData?: UsageData[];
		class?: string;
	}

	let { qualityScores = [], usageData = [], class: className = '' }: Props = $props();

	let qualityCanvas = $state<HTMLCanvasElement | null>(null);
	let usageCanvas = $state<HTMLCanvasElement | null>(null);
	let chartInstance: Chart | null = null;
	let usageChartInstance: Chart | null = null;
	let isExporting = $state(false);
	let selectedRange = $state<'7d' | '30d' | '90d' | 'all'>('30d');
	let isBrowser = $state(false);
	let isRendering = $state(false);

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			mode: 'index' as const,
			intersect: false
		},
		plugins: {
			legend: {
				position: 'top' as const,
				labels: {
					usePointStyle: true,
					padding: 15,
					font: { size: 11 }
				}
			},
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.9)',
				titleColor: '#fff',
				bodyColor: '#fff',
				padding: 12,
				cornerRadius: 8,
				titleFont: { size: 13, weight: 'bold' as const },
				bodyFont: { size: 12 },
				displayColors: true,
				boxPadding: 4,
				callbacks: {
					title: (items: any[]) => {
						if (!items.length) return '';
						return `Date: ${items[0].label}`;
					},
					label: (context: any) => {
						const value = context.parsed.y;
						const label = context.dataset.label || '';
						return `${label}: ${value}%`;
					},
					afterBody: (items: any[]) => {
						if (!items.length) return [];
						// Find corresponding data point
						const idx = items[0].dataIndex;
						if (qualityScores[idx]) {
							const data = qualityScores[idx];
							return [
								'',
								`Clarity: ${data.clarity}%`,
								`Completeness: ${data.completeness}%`,
								`Specificity: ${data.specificity}%`,
								`Overall: ${data.overall}%`
							];
						}
						return [];
					}
				}
			}
		},
		scales: {
			y: {
				beginAtZero: true,
				max: 100,
				grid: {
					color: 'rgba(0, 0, 0, 0.05)'
				},
				ticks: {
					callback: (value: string | number) => `${value}%`,
					font: { size: 10 }
				}
			},
			x: {
				grid: {
					display: false
				},
				ticks: {
					font: { size: 10 }
				}
			}
		}
	};

	const usageChartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false
			},
			tooltip: {
				backgroundColor: 'rgba(0, 0, 0, 0.8)',
				titleColor: '#fff',
				bodyColor: '#fff',
				padding: 10,
				cornerRadius: 6,
				callbacks: {
					label: (context: any) => `${context.parsed.y ?? 0} uses`
				}
			}
		},
		scales: {
			y: {
				beginAtZero: true,
				grid: {
					color: 'rgba(0, 0, 0, 0.05)'
				},
				ticks: {
					font: { size: 10 }
				}
			},
			x: {
				grid: {
					display: false
				},
				ticks: {
					font: { size: 10 }
				}
			}
		}
	};

	function createQualityChart() {
		if (!browser || !qualityCanvas || qualityScores.length === 0 || isRendering) return;
		isRendering = true;

		try {
			// Destroy existing chart
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}

			const ctx = qualityCanvas.getContext('2d');
			if (!ctx) return;

			const labels = qualityScores.map((d) => {
				const date = new Date(d.date);
				return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			});

			chartInstance = new Chart(ctx, {
				type: 'line',
				data: {
					labels,
					datasets: [
						{
							label: 'Overall',
							data: qualityScores.map((d) => d.overall),
							borderColor: '#3b82f6',
							backgroundColor: 'rgba(59, 130, 246, 0.1)',
							fill: true,
							tension: 0.4,
							pointRadius: 4,
							pointHoverRadius: 6,
							borderWidth: 2
						},
						{
							label: 'Clarity',
							data: qualityScores.map((d) => d.clarity),
							borderColor: '#22c55e',
							backgroundColor: 'transparent',
							borderDash: [5, 5],
							tension: 0.4,
							pointRadius: 3,
							pointHoverRadius: 5,
							borderWidth: 2
						},
						{
							label: 'Completeness',
							data: qualityScores.map((d) => d.completeness),
							borderColor: '#a855f7',
							backgroundColor: 'transparent',
							borderDash: [5, 5],
							tension: 0.4,
							pointRadius: 3,
							pointHoverRadius: 5,
							borderWidth: 2
						},
						{
							label: 'Specificity',
							data: qualityScores.map((d) => d.specificity),
							borderColor: '#f59e0b',
							backgroundColor: 'transparent',
							borderDash: [5, 5],
							tension: 0.4,
							pointRadius: 3,
							pointHoverRadius: 5,
							borderWidth: 2
						}
					]
				},
				options: chartOptions as any
			});
		} catch (error) {
			console.error('Error creating quality chart:', error);
		} finally {
			isRendering = false;
		}
	}

	function createUsageChart() {
		if (!browser || !usageCanvas || usageData.length === 0 || isRendering) return;
		isRendering = true;

		try {
			// Destroy existing chart
			if (usageChartInstance) {
				usageChartInstance.destroy();
				usageChartInstance = null;
			}

			const ctx = usageCanvas.getContext('2d');
			if (!ctx) return;

			const labels = usageData.map((d) => {
				const date = new Date(d.date);
				return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			});

			usageChartInstance = new Chart(ctx, {
				type: 'bar',
				data: {
					labels,
					datasets: [
						{
							label: 'Usage',
							data: usageData.map((d) => d.count),
							backgroundColor: 'rgba(59, 130, 246, 0.7)',
							borderColor: '#3b82f6',
							borderWidth: 1,
							borderRadius: 4
						}
					]
				},
				options: usageChartOptions as any
			});
		} catch (error) {
			console.error('Error creating usage chart:', error);
		} finally {
			isRendering = false;
		}
	}

	async function handleExport() {
		if (isExporting) return;
		isExporting = true;

		try {
			const canvas = document.createElement('canvas');
			const width = 800;
			const height = 500;
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, width, height);
			ctx.fillStyle = '#1f2937';
			ctx.font = 'bold 16px sans-serif';
			ctx.fillText('Performance Metrics', 20, 30);

			if (qualityCanvas) {
				ctx.drawImage(qualityCanvas, 20, 50, width - 40, 200);
			}

			if (usageCanvas) {
				ctx.drawImage(usageCanvas, 20, 270, width - 40, 200);
			}

			const pngUrl = canvas.toDataURL('image/png');
			const downloadLink = document.createElement('a');
			downloadLink.href = pngUrl;
			downloadLink.download = `performance-metrics-${Date.now()}.png`;
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);
		} catch (error) {
			console.error('Export failed:', error);
		} finally {
			isExporting = false;
		}
	}

	function handleRangeChange(range: '7d' | '30d' | '90d' | 'all') {
		selectedRange = range;
	}

	function handleResize() {
		if (chartInstance) chartInstance.resize();
		if (usageChartInstance) usageChartInstance.resize();
	}

	// Track previous data lengths to prevent unnecessary re-renders
	let prevQualityLength = $state(0);
	let prevUsageLength = $state(0);

	$effect(() => {
		if (!browser) return;

		if (qualityScores.length > 0 && qualityScores.length !== prevQualityLength) {
			prevQualityLength = qualityScores.length;
			setTimeout(createQualityChart, 50);
		}

		if (usageData.length > 0 && usageData.length !== prevUsageLength) {
			prevUsageLength = usageData.length;
			setTimeout(createUsageChart, 50);
		}
	});

	onMount(() => {
		if (browser) {
			isBrowser = true;
			window.addEventListener('resize', handleResize);
			requestAnimationFrame(() => {
				setTimeout(() => {
					if (qualityScores.length > 0) createQualityChart();
					if (usageData.length > 0) createUsageChart();
				}, 100);
			});
		}
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('resize', handleResize);
			if (chartInstance) chartInstance.destroy();
			if (usageChartInstance) usageChartInstance.destroy();
		}
	});
</script>

<div id="performance-chart-container" class={cn('space-y-4', className)}>
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h3 class="text-lg font-semibold">Performance Metrics</h3>
		<div class="flex items-center gap-2">
			<!-- Date Range Filter -->
			<div id="date-range-filters" class="flex items-center gap-1 rounded-md bg-muted p-1">
				<button
					class={cn(
						'rounded px-3 py-1 text-xs transition-colors',
						selectedRange === '7d' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
					)}
					onclick={() => handleRangeChange('7d')}
					type="button"
				>
					7D
				</button>
				<button
					class={cn(
						'rounded px-3 py-1 text-xs transition-colors',
						selectedRange === '30d' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
					)}
					onclick={() => handleRangeChange('30d')}
					type="button"
				>
					30D
				</button>
				<button
					class={cn(
						'rounded px-3 py-1 text-xs transition-colors',
						selectedRange === '90d' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
					)}
					onclick={() => handleRangeChange('90d')}
					type="button"
				>
					90D
				</button>
				<button
					class={cn(
						'rounded px-3 py-1 text-xs transition-colors',
						selectedRange === 'all' ? 'bg-background shadow-sm' : 'hover:bg-background/50'
					)}
					onclick={() => handleRangeChange('all')}
					type="button"
				>
					All
				</button>
			</div>
			<button
				class="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleExport}
				disabled={isExporting}
				aria-label="Export chart data"
				type="button"
			>
				<Download class="h-4 w-4 {isExporting ? 'animate-pulse' : ''}" />
			</button>
		</div>
	</div>

	<!-- Quality Scores Chart -->
	<div class="rounded-lg border bg-card p-4">
		<h4 class="mb-3 text-sm font-medium text-muted-foreground">Quality Scores Over Time</h4>
		{#if qualityScores.length > 0}
			<div class="w-full" style="height: 250px;">
				<canvas
					bind:this={qualityCanvas}
					class="h-full w-full"
					aria-label="Quality scores line chart"
				></canvas>
			</div>
		{:else}
			<div
				class="flex h-[250px] w-full flex-col items-center justify-center text-center"
				role="img"
				aria-label="No quality data available"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mb-2 text-muted-foreground"
				>
					<path d="M3 3v18h18" />
					<path d="m19 9-5 5-4-4-3 3" />
				</svg>
				<p class="text-sm text-muted-foreground">No quality data available</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Complete AI improvements to see quality trends
				</p>
			</div>
		{/if}
	</div>

	<!-- Usage Chart -->
	<div class="rounded-lg border bg-card p-4">
		<h4 class="mb-3 text-sm font-medium text-muted-foreground">Usage Counts</h4>
		{#if usageData.length > 0}
			<div class="w-full" style="height: 200px;">
				<canvas bind:this={usageCanvas} class="h-full w-full" aria-label="Usage counts bar chart"
				></canvas>
			</div>
		{:else}
			<div
				class="flex h-[200px] w-full flex-col items-center justify-center text-center"
				role="img"
				aria-label="No usage data available"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mb-2 text-muted-foreground"
				>
					<rect width="18" height="18" x="3" y="3" rx="2" />
					<path d="M3 9h18" />
					<path d="M9 21V9" />
				</svg>
				<p class="text-sm text-muted-foreground">No usage data available</p>
				<p class="mt-1 text-xs text-muted-foreground">Usage data will appear as prompts are used</p>
			</div>
		{/if}
	</div>
</div>

<!-- Empty state wrapper for testing -->
{#if qualityScores.length === 0 && usageData.length === 0}
	<div id="performance-chart-empty-container" class="sr-only">
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">No quality data available</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Complete AI improvements to see quality trends
			</p>
		</div>
		<div class="rounded-lg border bg-card p-4">
			<p class="text-sm text-muted-foreground">No usage data available</p>
			<p class="mt-1 text-xs text-muted-foreground">Usage data will appear as prompts are used</p>
		</div>
	</div>
{/if}
