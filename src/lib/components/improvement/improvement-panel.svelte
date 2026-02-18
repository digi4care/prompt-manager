<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import Collapsible from '$lib/components/admin/ai-settings/collapsible.svelte';
	import ModelPicker from '$lib/components/prompts/model-picker.svelte';
	import PresetSelector from '$lib/components/prompts/preset-selector.svelte';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';

	// Types for judge evaluation
	export interface JudgeResponse {
		clarity: number;
		completeness: number;
		specificity: number;
		gaps: string[];
		recommendations: string[];
	}

	// Type for thinking block
	export interface ThinkingBlock {
		thinking: string;
		signature?: string;
	}

	// Types for improvement result
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
		thinking?: ThinkingBlock | null;
		variants: PromptVariant[];
		selectedVariant?: PromptVariant;
	}

	interface Props {
		promptId: number;
		currentVersionId?: number;
		onimprovementcomplete?: (selectedVariant: PromptVariant) => void;
		class?: string;
	}

	let {
		promptId,
		currentVersionId,
		onimprovementcomplete,
		class: className = ''
	}: Props = $props();

	// State
	let isLoading = $state(false);
	let isImproving = $state(false);
	let progress = $state(0);
	let progressStep = $state<'idle' | 'evaluating' | 'generating' | 'complete'>('idle');
	let error = $state<string | null>(null);
	let result = $state<ImprovementResult | null>(null);
	let showResults = $state(false);
	let showThinking = $state(false);
	let copyThinkingSuccess = $state(false);

	// ara.7: UI controls for improve options
	let selectedPreset = $state<number | null>(null);
	let selectedPresetData = $state<any>(null);
	let customInstruction = $state('');
	let selectedModel = $state('');
	let temperature = $state(0.5);
	let showAdvanced = $state(false);

	// Policy settings for model picker
	let policySettings = $state<{
		improveDefaultModel: string;
		improveTemperature: number;
	}>({
		improveDefaultModel: '',
		improveTemperature: 0.5
	});

	// Improvement steps for progress
	const IMPROVEMENT_STEPS = [
		{ key: 'evaluating', label: 'Evaluating current prompt', weight: 25 },
		{ key: 'generating', label: 'Generating improved variants', weight: 75 }
	] as const;
	const scoreCriteria: Array<'clarity' | 'completeness' | 'specificity'> = [
		'clarity',
		'completeness',
		'specificity'
	];

	onMount(async () => {
		await loadPolicySettings();
	});

	async function loadPolicySettings() {
		try {
			const response = await fetch('/api/admin/settings');
			const result = await response.json();
			const settings = result.data || {};

			policySettings = {
				improveDefaultModel: settings.models?.opencode_improve_default_model || '',
				improveTemperature:
					settings.temperature?.opencode_improve_temperature !== undefined
						? settings.temperature.opencode_improve_temperature
						: 0.5
			};

			// Initialize with policy defaults
			temperature = policySettings.improveTemperature;
		} catch (err) {
			console.error('Failed to load policy settings:', err);
		}
	}

	// Start improvement process
	async function handleImprove(): Promise<void> {
		if (isImproving) return;

		isImproving = true;
		isLoading = true;
		error = null;
		result = null;
		progress = 0;
		progressStep = 'evaluating';

		try {
			// Prepare request body with ara.5 parameters
			const requestBody: any = {
				versionId: currentVersionId,
				variantCount: 3,
				autoSelect: false
			};

			// Add instruction (either from preset or custom)
			if (customInstruction) {
				requestBody.instruction = customInstruction;
			}

			// Add preset if selected
			if (selectedPreset) {
				requestBody.preset = selectedPreset;
			}

			// Add model selection if specified
			if (selectedModel) {
				const parts = selectedModel.split('/');
				if (parts.length === 2) {
					requestBody.providerId = parts[0];
					requestBody.modelId = parts[1];
				}
			}

			// Add temperature if different from policy default
			if (temperature !== policySettings.improveTemperature) {
				requestBody.temperature = temperature;
			}

			// Start improvement
			const response = await fetch(`/api/prompts/${promptId}/improve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `HTTP ${response.status}: Improvement request failed`);
			}

			const data = await response.json();

			// CCM API returns data directly without success field
			if (!data.data) {
				throw new Error(data.error?.message || 'Improvement request failed');
			}

			result = data.data as ImprovementResult;
			progress = 100;
			progressStep = 'complete';
			showResults = true;

			// Auto-select if single variant
			if (result.variants.length === 1) {
				onimprovementcomplete?.(result.variants[0]);
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
			error = `Failed to improve prompt: ${errorMessage}`;
		} finally {
			isImproving = false;
			isLoading = false;
		}
	}

	// Handle preset selection
	function handlePresetSelect(presetId: number | null) {
		selectedPreset = presetId;
	}

	// Handle preset data retrieval (auto-fill model/temperature)
	function handlePresetData(preset: any) {
		selectedPresetData = preset;

		if (preset) {
			// Auto-fill model if preset has one
			if (preset.model) {
				selectedModel = preset.model;
			}

			// Auto-fill temperature if preset has one
			if (preset.temperature !== null && preset.temperature !== undefined) {
				temperature = preset.temperature;
			}
		}
	}

	// Retry improvement
	function handleRetry(): void {
		error = null;
		handleImprove();
	}

	// Select a variant
	function handleSelectVariant(variant: PromptVariant): void {
		result = result ? { ...result, selectedVariant: variant } : null;
		onimprovementcomplete?.(variant);
		showResults = false;
	}

	// Close results dialog
	function handleCloseResults(): void {
		showResults = false;
	}

	// Get score color based on value
	function getScoreColor(score: number): string {
		if (score >= 80) return 'text-green-600 dark:text-green-400';
		if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-red-600 dark:text-red-400';
	}

	// Get score bg color based on value
	function getScoreBgColor(score: number): string {
		if (score >= 80) return 'bg-green-500';
		if (score >= 60) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	// Calculate overall score
	function getOverallScore(evaluation: JudgeResponse): number {
		return Math.round((evaluation.clarity + evaluation.completeness + evaluation.specificity) / 3);
	}

	// Format score label
	function formatScore(score: number): string {
		if (score >= 90) return 'Excellent';
		if (score >= 80) return 'Good';
		if (score >= 70) return 'Fair';
		if (score >= 60) return 'Needs Work';
		return 'Poor';
	}

	// Copy thinking to clipboard
	async function copyThinkingToClipboard(): Promise<void> {
		if (!result?.thinking?.thinking) return;

		try {
			await navigator.clipboard.writeText(result.thinking.thinking);
			copyThinkingSuccess = true;
			setTimeout(() => {
				copyThinkingSuccess = false;
			}, 2000);
		} catch {
			// Clipboard access failed, silently handle
		}
	}

	// Toggle thinking visibility
	function toggleThinking(): void {
		showThinking = !showThinking;
	}
</script>

<div class={cn('space-y-4', className)}>
	<!-- ara.7: Preset and instruction controls -->
	<div class="space-y-4 rounded-lg border bg-muted/20 p-4">
		<PresetSelector
			value={selectedPreset}
			onchange={handlePresetSelect}
			ongetpreset={handlePresetData}
		/>

		<div class="space-y-2">
			<label for="custom-instruction" class="text-sm font-medium">
				Custom Instruction (optional)
			</label>
			<textarea
				id="custom-instruction"
				class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				placeholder="Add specific instructions for this improvement run (e.g., 'Focus on clarity and conciseness', 'Make it more professional tone')"
				bind:value={customInstruction}
			></textarea>
			<p class="text-xs text-muted-foreground">
				This will be applied in addition to the preset instruction, or used alone if no preset is
				selected.
			</p>
		</div>

		<!-- ara.7: Advanced section with model picker (collapsed by default) -->
		<Collapsible title="Advanced: Model Selection" defaultOpen={false}>
			<div class="space-y-4">
				<div class="text-sm text-muted-foreground">
					<p>
						Override the default model and temperature for this improvement run. The selected model
						must be allowed by the policy.
					</p>
				</div>

				<ModelPicker
					value={selectedModel}
					onchange={(modelId) => (selectedModel = modelId)}
					{temperature}
					onTemperatureChange={(temp) => (temperature = temp)}
					workflow="improve"
					defaultModel={policySettings.improveDefaultModel}
				/>
			</div>
		</Collapsible>
	</div>

	<!-- Improve with AI Button -->
	<Button
		variant="default"
		size="lg"
		disabled={isImproving}
		onclick={handleImprove}
		class="w-full sm:w-auto"
	>
		{#if isImproving}
			<svg
				class="mr-2 h-4 w-4 animate-spin"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			Improving...
		{:else}
			<svg
				class="mr-2 h-4 w-4"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
				<path d="M12 6v6l4 2" />
			</svg>
			Improve with AI
		{/if}
	</Button>

	<!-- Progress Indicator -->
	{#if isImproving}
		<Card>
			<CardContent class="pt-6">
				<div class="space-y-4">
					<!-- Step indicator -->
					<div class="flex items-center justify-between text-sm">
						<span class="font-medium">Improving your prompt...</span>
						<span class="text-muted-foreground">{progress}%</span>
					</div>

					<!-- Progress bar -->
					<Progress value={progress} max={100} class="h-2" />

					<!-- Current step -->
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						{#if progressStep === 'evaluating'}
							<svg
								class="h-4 w-4 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>{IMPROVEMENT_STEPS[0].label}</span>
						{:else if progressStep === 'generating'}
							<svg
								class="h-4 w-4 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>{IMPROVEMENT_STEPS[1].label}</span>
						{:else}
							<svg
								class="h-4 w-4 text-green-500"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<path
									d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<polyline
									points="22 4 12 14.01 9 11.01"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							<span>Complete!</span>
						{/if}
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Error State -->
	{#if error}
		<Card class="border-destructive/50">
			<CardContent class="pt-6">
				<div class="flex flex-col gap-3">
					<div class="flex items-center gap-2 text-destructive">
						<svg
							class="h-5 w-5"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="8" x2="12" y2="12" />
							<line x1="12" y1="16" x2="12.01" y2="16" />
						</svg>
						<span class="font-medium">Improvement Failed</span>
					</div>
					<p class="text-sm text-muted-foreground">{error}</p>
					<div class="flex gap-2">
						<Button variant="outline" size="sm" onclick={handleRetry}>
							<svg
								class="mr-2 h-4 w-4"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
								<path d="M3 3v5h5" />
							</svg>
							Try Again
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	{/if}
</div>

<!-- Results Modal/Dialog -->
{#if showResults && result}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) handleCloseResults();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') handleCloseResults();
		}}
		tabindex="0"
		role="dialog"
		aria-modal="true"
		aria-labelledby="results-title"
	>
		<div
			class="relative z-50 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
			role="document"
		>
			<!-- Header -->
			<div class="mb-6 flex items-center justify-between">
				<h2 id="results-title" class="text-xl font-semibold">AI Improvement Results</h2>
				<Button variant="ghost" size="icon" onclick={handleCloseResults}>
					<svg
						class="h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</Button>
			</div>

			<!-- Judge Evaluation Results -->
			{#if result.evaluation}
				{@const overallScore = getOverallScore(result.evaluation)}
				<Card class="mb-6">
					<CardHeader>
						<CardTitle class="text-base">Judge Evaluation</CardTitle>
					</CardHeader>
					<CardContent>
						<!-- Overall Score -->
						<div class="mb-6 flex items-center gap-4">
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
							>
								{overallScore}
							</div>
							<div>
								<div class="text-lg font-medium">{formatScore(overallScore)}</div>
								<div class="text-sm text-muted-foreground">Overall Quality Score</div>
							</div>
						</div>

						<!-- Score Breakdown -->
						<div class="mb-6 grid grid-cols-3 gap-4">
							{#each scoreCriteria as criterion}
								{@const score =
									criterion === 'clarity'
										? result.evaluation.clarity
										: criterion === 'completeness'
											? result.evaluation.completeness
											: result.evaluation.specificity}
								<div class="space-y-2">
									<div class="flex items-center justify-between text-sm">
										<span class="capitalize">{criterion}</span>
										<span class={cn('font-medium', getScoreColor(score))}>{score}%</span>
									</div>
									<Progress value={score} max={100} class={cn('h-2', getScoreBgColor(score))} />
								</div>
							{/each}
						</div>

						<!-- Gaps -->
						{#if result.evaluation.gaps.length > 0}
							<div class="space-y-2">
								<h4 class="flex items-center gap-2 text-sm font-medium">
									<svg
										class="h-4 w-4 text-amber-500"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path
											d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
										/>
										<line x1="12" y1="9" x2="12" y2="13" />
										<line x1="12" y1="17" x2="12.01" y2="17" />
									</svg>
									Identified Gaps
								</h4>
								<ul class="space-y-1 text-sm text-muted-foreground">
									{#each result.evaluation.gaps as gap}
										<li class="flex items-start gap-2">
											<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"></span>
											<span>{gap}</span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						<!-- Recommendations -->
						{#if result.evaluation.recommendations.length > 0}
							<div class="mt-4 space-y-2">
								<h4 class="flex items-center gap-2 text-sm font-medium">
									<svg
										class="h-4 w-4 text-blue-500"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M12 2a10 10 0 1 0 10 10H12V2z" />
										<path d="M12 2a10 10 0 0 1 10 10" />
										<path d="M12 12 2.1 10.55" />
									</svg>
									Recommendations
								</h4>
								<ul class="space-y-1 text-sm text-muted-foreground">
									{#each result.evaluation.recommendations as rec}
										<li class="flex items-start gap-2">
											<span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"></span>
											<span>{rec}</span>
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						<!-- Thinking/Reasoning Display -->
						{#if result.thinking?.thinking}
							<div class="mt-6 border-t pt-4">
								<div class="mb-3 flex items-center justify-between">
									<Button
										variant="ghost"
										size="sm"
										onclick={toggleThinking}
										class="flex items-center gap-2"
									>
										<svg
											class="h-4 w-4 transition-transform duration-200"
											class:rotate-90={showThinking}
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="m9 18 6-6-6-6" />
										</svg>
										{showThinking ? 'Hide' : 'Show'} Reasoning
									</Button>

									<div class="flex items-center gap-2">
										{#if result.thinking.signature}
											<span
												class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400"
												title="Thinking signature verified"
											>
												<svg
													class="h-3 w-3"
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
													<polyline points="22 4 12 14.01 9 11.01" />
												</svg>
												Verified
											</span>
										{/if}
										<Button
											variant="ghost"
											size="icon"
											onclick={copyThinkingToClipboard}
											class="h-8 w-8"
											title="Copy reasoning to clipboard"
										>
											{#if copyThinkingSuccess}
												<svg
													class="h-4 w-4 text-green-500"
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
													<polyline points="22 4 12 14.01 9 11.01" />
												</svg>
											{:else}
												<svg
													class="h-4 w-4"
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
													<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
												</svg>
											{/if}
										</Button>
									</div>
								</div>

								{#if showThinking}
									<div
										class="max-h-80 overflow-auto rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground transition-all duration-200 ease-in-out"
									>
										<pre class="font-mono leading-relaxed whitespace-pre-wrap">{result.thinking
												.thinking}</pre>
									</div>
								{/if}
							</div>
						{/if}
					</CardContent>
				</Card>
			{/if}

			<!-- Variant Generation Status -->
			<Card>
				<CardHeader>
					<CardTitle class="text-base">Generated Variants ({result.variants.length})</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						{#each result.variants as variant, index}
							<div
								class={cn(
									'flex items-center justify-between rounded-lg border p-3',
									result.selectedVariant?.id === variant.id
										? 'border-primary bg-primary/5'
										: 'hover:bg-muted/50'
								)}
							>
								<div class="flex items-center gap-3">
									<div
										class={cn(
											'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
											result.selectedVariant?.id === variant.id
												? 'bg-primary text-primary-foreground'
												: 'bg-muted text-muted-foreground'
										)}
									>
										{index + 1}
									</div>
									<div>
										<div class="font-medium">Variant {index + 1}</div>
										<div class="text-xs text-muted-foreground">
											{variant.changeNotes || 'AI-generated improvement'}
										</div>
									</div>
								</div>
								<Button
									variant={result.selectedVariant?.id === variant.id ? 'default' : 'outline'}
									size="sm"
									onclick={() => handleSelectVariant(variant)}
								>
									{result.selectedVariant?.id === variant.id ? 'Selected' : 'Select'}
								</Button>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
{/if}
