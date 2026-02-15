<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ImprovementPanel, JudgeResults, VariantComparison } from '$lib/components/improvement';
	import { PromptEditor } from '$lib/components/prompts';
	import { promptsStore } from '$lib/stores/prompts.svelte';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';

	// Types for improvement result
	interface JudgeResponse {
		clarity: number;
		completeness: number;
		specificity: number;
		gaps: string[];
		recommendations: string[];
	}

	interface PromptVariant {
		id: number;
		version: string;
		content: string;
		changeType: string;
		changeNotes: string | null;
		createdAt: string;
		createdBy: string;
	}

	interface ImprovementResult {
		loopId: number;
		status: 'pending_selection' | 'completed';
		evaluation: JudgeResponse;
		variants: PromptVariant[];
		selectedVariant?: PromptVariant;
	}

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Improvement state
	let improvementResult = $state<ImprovementResult | null>(null);
	let selectedVariant = $state<PromptVariant | null>(null);
	let applyingVariant = $state(false);
	let applyError = $state('');

	// Get current version content
	let currentContent = $derived(data.currentVersion?.content || '');
	let currentVersionId = $derived(data.currentVersion?.id || null);

	// Format date for display
	function formatDate(date: Date | string): string {
		const d = new Date(date);
		return d.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Handle improvement complete
	function handleImprovementComplete(variant: PromptVariant) {
		improvementResult = improvementResult
			? { ...improvementResult, selectedVariant: variant }
			: null;
		selectedVariant = variant;
	}

	// Handle apply variant (save as new version)
	async function handleApplyVariant() {
		if (!selectedVariant || applyingVariant) return;

		applyingVariant = true;
		applyError = '';

		try {
			await promptsStore.createVersion(
				data.prompt.id,
				selectedVariant.content,
				selectedVariant.changeType as 'major' | 'minor' | 'patch',
				selectedVariant.changeNotes || 'AI-improved version'
			);

			// Navigate back to prompt detail page
			goto(`/prompts/${data.prompt.id}`);
		} catch (err) {
			applyError = err instanceof Error ? err.message : 'Failed to apply variant';
		} finally {
			applyingVariant = false;
		}
	}

	// Handle cancel
	function handleCancel() {
		goto(`/prompts/${data.prompt.id}`);
	}

	// Handle back to improvement
	function handleBackToImprovement() {
		selectedVariant = null;
		improvementResult = improvementResult
			? { ...improvementResult, selectedVariant: undefined }
			: null;
	}
</script>

<svelte:head>
	<title>Improve: {data.prompt.title} | Prompt Management</title>
	<meta name="description" content="AI-powered improvement for {data.prompt.title}" />
</svelte:head>

<div class="space-y-6" id="improve-prompt-section">
	<!-- Page Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex-1">
			<!-- Breadcrumb -->
			<nav
				class="mb-2 flex items-center gap-1 text-sm text-muted-foreground"
				aria-label="Breadcrumb"
			>
				<a href="/prompts" class="transition-colors hover:text-foreground">Prompts</a>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
				<a href="/prompts/{data.prompt.id}" class="transition-colors hover:text-foreground">
					{data.prompt.title}
				</a>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
				<span class="font-medium text-foreground">Improve</span>
			</nav>

			<h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-primary"
				>
					<path
						d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
					/>
				</svg>
				Improve Prompt
			</h1>

			<p class="mt-2 text-muted-foreground">
				Use AI to analyze and improve your prompt for better results.
			</p>
		</div>

		<!-- Action Buttons -->
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={handleCancel}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="mr-2"
				>
					<path d="m12 19-7-7 7-7" />
					<path d="M19 12H5" />
				</svg>
				Back to Prompt
			</Button>
		</div>
	</div>

	<!-- Main Content -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Left Column: Current Version & Improvement Panel -->
		<div class="space-y-6 lg:col-span-2">
			<!-- Current Version Content -->
			<div class="rounded-lg border bg-card">
				<div class="flex flex-col space-y-1.5 p-6">
					<h2 class="text-lg leading-none font-semibold tracking-tight">Current Version</h2>
					<p class="text-sm text-muted-foreground">
						Version {data.currentVersion?.version || 'N/A'} - {data.currentVersion?.changeType ||
							'N/A'}
						change
						{#if data.currentVersion?.createdAt}
							• {formatDate(data.currentVersion.createdAt)}
						{/if}
					</p>
				</div>
				<div class="p-6 pt-0">
					<PromptEditor value={currentContent} readonly={true} class="w-full" />
				</div>
			</div>

			<!-- Improvement Panel -->
			<div class="rounded-lg border bg-card">
				<div class="flex flex-col space-y-1.5 p-6">
					<h2 class="text-lg leading-none font-semibold tracking-tight">AI Improvement</h2>
					<p class="text-sm text-muted-foreground">
						Analyze and generate improved versions of your prompt
					</p>
				</div>
				<div class="p-6 pt-0">
					<ImprovementPanel
						promptId={data.prompt.id}
						currentVersionId={currentVersionId || undefined}
						onimprovementcomplete={handleImprovementComplete}
					/>
				</div>
			</div>

			<!-- Judge Results (shown when improvement is complete) -->
			{#if improvementResult?.evaluation}
				<div class="rounded-lg border bg-card">
					<div class="flex flex-col space-y-1.5 p-6">
						<h2 class="text-lg leading-none font-semibold tracking-tight">Evaluation Results</h2>
						<p class="text-sm text-muted-foreground">Analysis of your current prompt</p>
					</div>
					<div class="p-6 pt-0">
						<JudgeResults evaluation={improvementResult.evaluation} />
					</div>
				</div>
			{/if}

			<!-- Variant Comparison (shown when improvement is complete) -->
			{#if improvementResult && improvementResult.variants.length > 0}
				<div class="rounded-lg border bg-card">
					<div class="flex flex-col space-y-1.5 p-6">
						<h2 class="text-lg leading-none font-semibold tracking-tight">Generated Variants</h2>
						<p class="text-sm text-muted-foreground">
							{improvementResult.variants.length} variant{improvementResult.variants.length !== 1
								? 's'
								: ''} generated
						</p>
					</div>
					<div class="p-6 pt-0">
						<VariantComparison
							parentVersion={{
								id: currentVersionId || 0,
								version: data.currentVersion?.version || '1.0.0',
								content: currentContent,
								title: data.prompt.title,
								description: data.prompt.description ?? undefined,
								tags: data.prompt.tags,
								purpose: data.prompt.purpose ?? undefined
							}}
							variants={improvementResult.variants.map((v) => ({
								variant: v,
								evaluation: improvementResult!.evaluation
							}))}
							onselect={(variant) => handleImprovementComplete(variant)}
						/>
					</div>
				</div>
			{/if}
		</div>

		<!-- Right Column: Sidebar -->
		<aside class="space-y-6">
			<!-- Prompt Info Card -->
			<div class="rounded-lg border bg-card p-6">
				<h3 class="mb-4 flex items-center gap-2 font-semibold">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="16" x2="12" y2="12" />
						<line x1="12" y1="8" x2="12.01" y2="8" />
					</svg>
					Prompt Info
				</h3>

				<div class="space-y-4">
					<div>
						<div class="text-sm font-medium text-muted-foreground">Title</div>
						<div class="font-medium">{data.prompt.title}</div>
					</div>

					{#if data.prompt.description}
						<div>
							<div class="text-sm font-medium text-muted-foreground">Description</div>
							<div class="text-sm">{data.prompt.description}</div>
						</div>
					{/if}

					{#if data.prompt.purpose}
						<div>
							<div class="text-sm font-medium text-muted-foreground">Purpose</div>
							<div class="text-sm">{data.prompt.purpose}</div>
						</div>
					{/if}

					{#if data.prompt.tags && data.prompt.tags.length > 0}
						<div>
							<div class="mb-2 text-sm font-medium text-muted-foreground">Tags</div>
							<div class="flex flex-wrap gap-1">
								{#each data.prompt.tags as tag}
									<span
										class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
									>
										{tag}
									</span>
								{/each}
							</div>
						</div>
					{/if}

					<div class="border-t pt-2">
						<div class="flex justify-between text-sm">
							<span class="text-muted-foreground">Current Version</span>
							<span class="font-medium">v{data.currentVersion?.version || 'N/A'}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Selected Variant Card (shown when variant is selected) -->
			{#if selectedVariant}
				<div class="rounded-lg border bg-card p-6">
					<h3 class="mb-4 flex items-center gap-2 font-semibold">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="text-green-500"
						>
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
						Selected Variant
					</h3>

					<div class="space-y-4">
						<div
							class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
						>
							<div class="mb-2 flex items-center justify-between">
								<span class="font-medium">Version {selectedVariant.version}</span>
								<span
									class="rounded-full bg-green-100 px-2 py-0.5 text-xs capitalize dark:bg-green-900/40"
								>
									{selectedVariant.changeType}
								</span>
							</div>
							{#if selectedVariant.changeNotes}
								<p class="text-sm text-muted-foreground">{selectedVariant.changeNotes}</p>
							{/if}
						</div>

						{#if applyError}
							<div
								class="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
							>
								{applyError}
							</div>
						{/if}

						<div class="flex flex-col gap-2">
							<Button
								variant="default"
								onclick={handleApplyVariant}
								loading={applyingVariant}
								class="w-full"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									class="mr-2"
								>
									<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
									<polyline points="17 21 13 21 13 13" />
									<polyline points="1 21 5 21 5 13" />
									<polyline points="3 17 7 17" />
									<polyline points="17 7 13 7" />
								</svg>
								Apply as New Version
							</Button>
							<Button
								variant="outline"
								onclick={handleBackToImprovement}
								disabled={applyingVariant}
								class="w-full"
							>
								Back to Selection
							</Button>
						</div>
					</div>
				</div>
			{/if}

			<!-- Help Card -->
			<div class="rounded-lg border bg-muted/50 p-6">
				<h3 class="mb-3 flex items-center gap-2 font-semibold">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
						<path d="M12 17h.01" />
					</svg>
					How it works
				</h3>
				<ol class="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
					<li>Click "Improve with AI" to start</li>
					<li>AI analyzes your prompt</li>
					<li>Review generated variants</li>
					<li>Select the best version</li>
					<li>Apply as new version</li>
				</ol>
			</div>
		</aside>
	</div>
</div>
