<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import * as d3 from 'd3';
	import type { PromptVersion } from '$lib/stores/prompts.svelte';
	import { cn } from '$lib/utils';
	import { Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-svelte';

	interface Props {
		versions: PromptVersion[];
		selectedVersionId?: number | null;
		onversionselect?: (version: PromptVersion) => void;
		class?: string;
	}

	let {
		versions = [],
		selectedVersionId = null,
		onversionselect,
		class: className = ''
	}: Props = $props();

	let container: HTMLDivElement;
	let svgElement: SVGSVGElement;
	let zoomLevel = $state(1);
	let isExporting = $state(false);
	let isBrowser = $state(false);
	let isRendering = $state(false);

	// Color scheme for change types
	const changeTypeColors: Record<string, string> = {
		major: '#ef4444',
		minor: '#eab308',
		patch: '#22c55e'
	};

	// Format date for display
	function formatDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Handle version node click
	function handleNodeClick(event: MouseEvent, node: d3.HierarchyNode<PromptVersion>) {
		event.stopPropagation();
		onversionselect?.(node.data);
	}

	function handleZoomIn() {
		zoomLevel = Math.min(zoomLevel * 1.2, 3);
		applyZoom();
	}

	function handleZoomOut() {
		zoomLevel = Math.max(zoomLevel / 1.2, 0.3);
		applyZoom();
	}

	function handleResetZoom() {
		zoomLevel = 1;
		applyZoom();
	}

	function applyZoom() {
		if (!svgElement || !zoomBehavior) return;
		const svg = d3.select(svgElement);
		svg.transition().duration(300).call(zoomBehavior.transform, d3.zoomIdentity.scale(zoomLevel));
	}

	// Create zoom behavior
	function createZoomBehavior() {
		return d3
			.zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.3, 3])
			.on('zoom', (event) => {
				const g = d3.select(svgElement).select<SVGGElement>('g.content-group');
				if (g.node()) {
					g.attr('transform', event.transform.toString());
				}
				zoomLevel = event.transform.k;
			});
	}

	let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;

	async function handleExport() {
		if (!svgElement || isExporting) return;
		isExporting = true;

		try {
			const svgData = new XMLSerializer().serializeToString(svgElement);
			const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
			const url = URL.createObjectURL(svgBlob);

			const canvas = document.createElement('canvas');
			canvas.width = 1200;
			canvas.height = 600;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			const img = new Image();
			img.onload = () => {
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				URL.revokeObjectURL(url);

				const pngUrl = canvas.toDataURL('image/png');
				const downloadLink = document.createElement('a');
				downloadLink.href = pngUrl;
				downloadLink.download = `genealogy-tree-${Date.now()}.png`;
				document.body.appendChild(downloadLink);
				downloadLink.click();
				document.body.removeChild(downloadLink);
				isExporting = false;
			};
			img.onerror = () => {
				isExporting = false;
				URL.revokeObjectURL(url);
			};
			img.src = url;
		} catch (error) {
			console.error('Export failed:', error);
			isExporting = false;
		}
	}

	function renderTree() {
		if (!browser || !container || versions.length === 0 || isRendering) return;
		isRendering = true;

		try {
			// Clear previous content
			d3.select(container).selectAll('svg').remove();

			// Create nodes map
			const nodeMap = new Map<number, d3.HierarchyNode<PromptVersion>>();

			// Build hierarchy
			const versionsCopy = [...versions];
			const root = d3.hierarchy<PromptVersion>(versionsCopy[0], (d) => {
				// Find children in versions array
				const children = versionsCopy.filter((v) => v.parentVersionId === d.id);
				return children.length > 0 ? children : undefined;
			});

			// Set fixed size for consistent tree layout
			const nodeWidth = 140;
			const nodeHeight = 80;

			// Create tree layout with fixed sizes
			const treeLayout = d3.tree<PromptVersion>().nodeSize([nodeWidth, nodeHeight]);
			treeLayout(root);

			// Calculate SVG dimensions
			const descendants = root.descendants();
			const xValues = descendants.map((d) => d.x || 0);
			const yValues = descendants.map((d) => d.y || 0);
			const minX = Math.min(...xValues);
			const maxX = Math.max(...xValues);
			const minY = Math.min(...yValues);
			const maxY = Math.max(...yValues);

			const svgWidth = maxX - minX + nodeWidth * 2 + 100;
			const svgHeight = maxY - minY + nodeHeight * 2 + 100;

			// Create SVG
			const svgSelection = d3
				.select(container)
				.append('svg')
				.attr('width', '100%')
				.attr('height', svgHeight)
				.attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
				.attr('xmlns', 'http://www.w3.org/2000/svg')
				.style('max-height', '500px')
				.style('overflow', 'hidden');

			svgElement = svgSelection.node() as SVGSVGElement;

			// Initialize zoom behavior
			zoomBehavior = createZoomBehavior();
			svgSelection.call(zoomBehavior);

			// White background
			svgSelection
				.append('rect')
				.attr('width', svgWidth)
				.attr('height', svgHeight)
				.attr('fill', 'white');

			// Center the tree
			const centerX = svgWidth / 2 - (minX + maxX) / 2;
			const centerY = 80;

			const g = svgSelection
				.append('g')
				.attr('class', 'content-group')
				.attr('transform', `translate(${centerX}, ${centerY})`);

			// Draw links
			g.selectAll('.link')
				.data(root.links())
				.enter()
				.append('path')
				.attr('class', 'link')
				.attr('fill', 'none')
				.attr('stroke', '#94a3b8')
				.attr('stroke-width', 2)
				.attr('d', (d) => {
					const sourceX = d.source.x || 0;
					const sourceY = d.source.y || 0;
					const targetX = d.target.x || 0;
					const targetY = d.target.y || 0;
					return `M ${sourceX} ${sourceY} C ${sourceX} ${(sourceY + targetY) / 2}, ${targetX} ${(sourceY + targetY) / 2}, ${targetX} ${targetY}`;
				});

			// Draw nodes
			const nodes = g
				.selectAll('.node')
				.data(descendants)
				.enter()
				.append('g')
				.attr('class', 'node')
				.attr('transform', (d) => `translate(${d.x || 0}, ${d.y || 0})`)
				.style('cursor', 'pointer')
				.on('click', (event, d) => handleNodeClick(event, d));

			// Node circles
			nodes
				.append('circle')
				.attr('r', 20)
				.attr('fill', (d) => changeTypeColors[d.data.changeType] || '#3b82f6')
				.attr('stroke', '#fff')
				.attr('stroke-width', 3);

			// Version labels
			nodes
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '0.35em')
				.attr('fill', 'white')
				.attr('font-size', '10px')
				.attr('font-weight', 'bold')
				.text((d) => {
					const parts = d.data.version.split('.');
					return `${parts[0]}.${parts[1]}`;
				});

			// Below labels
			nodes
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '40px')
				.attr('fill', '#475569')
				.attr('font-size', '11px')
				.attr('font-weight', '500')
				.text((d) => `v${d.data.version}`);

			// Date labels
			nodes
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '55px')
				.attr('fill', '#94a3b8')
				.attr('font-size', '9px')
				.text((d) => formatDate(d.data.createdAt));

			// Change type labels
			nodes
				.append('text')
				.attr('text-anchor', 'middle')
				.attr('dy', '70px')
				.attr('fill', (d) => changeTypeColors[d.data.changeType])
				.attr('font-size', '9px')
				.attr('text-transform', 'capitalize')
				.text((d) => d.data.changeType);

			// Selection indicator
			nodes
				.filter((d) => d.data.id === selectedVersionId)
				.append('circle')
				.attr('r', 26)
				.attr('fill', 'none')
				.attr('stroke', '#3b82f6')
				.attr('stroke-width', 2)
				.attr('stroke-dasharray', '4 2');

			// Hover effects
			nodes
				.on('mouseenter', function () {
					d3.select(this).select('circle:first-child').transition().duration(200).attr('r', 24);
				})
				.on('mouseleave', function () {
					d3.select(this).select('circle:first-child').transition().duration(200).attr('r', 20);
				});
		} catch (error) {
			console.error('Error rendering tree:', error);
		} finally {
			isRendering = false;
		}
	}

	let previousVersionsLength = $state(0);

	$effect(() => {
		if (!browser) return;

		// Only re-render if versions length changed
		if (versions.length !== previousVersionsLength) {
			previousVersionsLength = versions.length;
			setTimeout(renderTree, 50);
		}
	});

	onMount(() => {
		if (browser) {
			isBrowser = true;
			// Initial render after DOM is ready
			requestAnimationFrame(() => {
				setTimeout(renderTree, 100);
			});
		}
	});

	onDestroy(() => {
		if (browser) {
			d3.select(container).selectAll('svg').remove();
		}
	});
</script>

<div class={cn('relative', className)}>
	<!-- Toolbar -->
	<div class="mb-4 flex items-center justify-between">
		<h3 class="text-lg font-semibold">Version Genealogy Tree</h3>
		<div class="flex items-center gap-2">
			<button
				class="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleZoomIn}
				aria-label="Zoom in"
				type="button"
			>
				<ZoomIn class="h-4 w-4" />
			</button>
			<button
				class="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleZoomOut}
				aria-label="Zoom out"
				type="button"
			>
				<ZoomOut class="h-4 w-4" />
			</button>
			<button
				class="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleResetZoom}
				aria-label="Reset zoom"
				type="button"
			>
				<RotateCcw class="h-4 w-4" />
			</button>
			<button
				class="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
				onclick={handleExport}
				disabled={isExporting}
				aria-label="Export as image"
				type="button"
			>
				<Download class="h-4 w-4 {isExporting ? 'animate-pulse' : ''}" />
			</button>
		</div>
	</div>

	<!-- Tree container -->
	<div
		bind:this={container}
		class="w-full overflow-hidden rounded-lg border bg-card"
		style="min-height: 400px; max-height: 500px; cursor: grab;"
		role="img"
		aria-label="Version genealogy tree visualization"
	>
		{#if versions.length === 0}
			<div class="flex h-[400px] flex-col items-center justify-center p-4 text-center">
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
					class="mb-3 text-muted-foreground"
				>
					<path d="M12 22c-4.97 0-9-4.03-9-9s4.03-9 9-9c.95 0 1.86.16 2.71.45" />
					<path d="M22 12c0 4.97-4.03 9-9 9" />
					<circle cx="12" cy="12" r="3" />
					<path d="M19.5 4.5 22 2l-2 2-3.5-3.5" />
				</svg>
				<p class="text-sm text-muted-foreground">No version history</p>
				<p class="mt-1 text-xs text-muted-foreground">Create versions to see the genealogy tree</p>
			</div>
		{/if}
	</div>

	<!-- Legend -->
	{#if versions.length > 0}
		<div class="mt-4 flex items-center gap-6 text-sm">
			<div class="flex items-center gap-2">
				<div class="h-4 w-4 rounded-full bg-red-500"></div>
				<span class="text-muted-foreground">Major</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-4 w-4 rounded-full bg-yellow-500"></div>
				<span class="text-muted-foreground">Minor</span>
			</div>
			<div class="flex items-center gap-2">
				<div class="h-4 w-4 rounded-full bg-green-500"></div>
				<span class="text-muted-foreground">Patch</span>
			</div>
		</div>
	{/if}
</div>
