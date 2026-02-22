<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ExecutionOverrides from './execution-overrides.svelte';
	import ExecutionResult from './execution-result.svelte';
	import { cn } from '$lib/utils';
	import Play from '@lucide/svelte/icons/play';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import AlertCircle from '@lucide/svelte/icons/alert-circle';
	import type { RunOverrides } from '$lib/server/services/settings-cascade.service';
	import { onMount } from 'svelte';
	import { getCachedModelCatalog, setCachedModelCatalog } from '$lib/client/model-catalog-cache';

	// Execution result type matching API response
	interface ExecutionResultData {
		content: string;
		model: { displayName: string; providerId: string; modelId: string };
		usage: { inputTokens: number; outputTokens: number; totalTokens: number };
		duration: { ms: number; seconds: number };
		source: 'run' | 'prompt' | 'default';
	}

	interface ErrorInfo {
		message: string;
		code?: string;
		recovery?: string;
	}

	interface FunctionDefault {
		id: number;
		functionType: string;
		modelId: string;
		temperature: number;
		maxTokens: number;
		createdAt: number;
		updatedAt: number;
	}

	interface GroupedModel {
		id: string;
		name: string;
		variantOptions?: string[];
	}

	interface ProviderGroup {
		providerName: string;
		providerId: string;
		models: GroupedModel[];
	}

	interface Props {
		promptId: number;
		content: string;
		functionType?: 'executor' | 'judge' | 'improve' | 'council';
		class?: string;
	}

	let { promptId, content, functionType = 'executor', class: className = '' }: Props = $props();

	// State machine
	type ExecutionState = 'idle' | 'loading' | 'success' | 'error';

	let executionState = $state('idle') as ExecutionState;
	let result = $state(null) as ExecutionResultData | null;
	let errorInfo = $state(null) as ErrorInfo | null;
	let overrides = $state({}) as RunOverrides;
	let isLoadingDefaults = $state(true);
	let defaultsLoadError = $state<string | null>(null);

	// Model catalog
	let groupedModels = $state<ProviderGroup[]>([]);

	// Default settings (loaded from API)
	let defaults = $state({
		modelId: 'openai/glm-5', // fallback
		temperature: 0.7,
		maxTokens: 4096
	});

	// Derived states
	let isExecuting = $derived(executionState === 'loading');
	let canExecute = $derived(executionState !== 'loading' && content.trim().length > 0);
	let hasResult = $derived(executionState === 'success' && result !== null);
	let hasError = $derived(executionState === 'error' && errorInfo !== null);

	// Find selected model info for display
	let selectedModel = $derived.by(() => {
		const modelId = overrides.modelId || defaults.modelId;
		for (const group of groupedModels) {
			const model = group.models.find((entry) => entry.id === modelId);
			if (model) {
				return {
					...model,
					providerName: group.providerName,
					providerId: group.providerId
				};
			}
		}
		return null;
	});

	// Normalize provider groups from API response
	function normalizeProviderGroups(providers: unknown[]): ProviderGroup[] {
		return providers.map((p: unknown) => {
			const provider = p as {
				name?: string;
				id?: string;
				providerID?: string;
				models?:
					| Array<{ name?: string; id?: string; modelID?: string; variantOptions?: string[] }>
					| Record<
							string,
							{ name?: string; id?: string; modelID?: string; variantOptions?: string[] }
					  >;
			};
			// Convert models object to array if needed
			let modelsArray: Array<{
				name?: string;
				id?: string;
				modelID?: string;
				variantOptions?: string[];
			}> = [];
			if (provider.models) {
				if (Array.isArray(provider.models)) {
					modelsArray = provider.models;
				} else {
					// Models is an object with model IDs as keys
					modelsArray = Object.entries(provider.models).map(([key, model]) => ({
						...model,
						id: model.id || model.modelID || key,
						name: model.name || model.id || model.modelID || key
					}));
				}
			}
			return {
				providerName: provider.name || provider.id || 'Unknown',
				providerId: provider.id || provider.providerID || 'unknown',
				models: modelsArray.map((m) => ({
					id: m.id || m.modelID || '',
					name: m.name || m.id || m.modelID || 'Unknown',
					variantOptions: m.variantOptions
				}))
			};
		});
	}

	// Load defaults and model catalog on mount
	onMount(async () => {
		try {
			// Load in parallel
			const [defaultsResponse, cachedCatalog] = await Promise.all([
				fetch(`/api/admin/function-defaults/${functionType}`),
				Promise.resolve(getCachedModelCatalog())
			]);

			// Process defaults
			if (defaultsResponse.ok) {
				const responseData = await defaultsResponse.json();
				// API returns { data: FunctionDefault }
				const data = responseData.data || responseData;
				if (data.modelId) {
					defaults = {
						modelId: data.modelId,
						temperature: data.temperature ?? 0.7,
						maxTokens: data.maxTokens ?? 4096
					};
				}
			} else {
				console.warn(`Failed to load ${functionType} defaults, using fallback`);
				defaultsLoadError = 'Could not load defaults from settings';
			}

			// Process model catalog
			if (cachedCatalog && Array.isArray(cachedCatalog)) {
				groupedModels = cachedCatalog as ProviderGroup[];
			} else {
				try {
					const providersResponse = await fetch('/api/opencode/providers');
					if (providersResponse.ok) {
						const data = await providersResponse.json();
						// API returns { providers: [...], ttlSeconds: number }
						const providers = data.providers || data;
						if (Array.isArray(providers)) {
							const normalized = normalizeProviderGroups(providers);
							groupedModels = normalized;
							setCachedModelCatalog(normalized);
						}
					}
				} catch (e) {
					console.warn('Failed to load model catalog:', e);
				}
			}
		} catch (e) {
			console.error('Error loading settings:', e);
			defaultsLoadError = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoadingDefaults = false;
		}
	});

	async function handleExecute() {
		if (!canExecute) return;

		executionState = 'loading';
		errorInfo = null;
		result = null;

		try {
			const response = await fetch(`/api/prompts/${promptId}/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					content,
					functionType,
					overrides: Object.keys(overrides).length > 0 ? overrides : undefined
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw {
					message: data.message || 'Execution failed',
					code: data.code,
					recovery: data.recovery
				};
			}

			result = await response.json();
			executionState = 'success';
		} catch (e) {
			errorInfo = e instanceof Error ? { message: e.message } : (e as ErrorInfo);
			executionState = 'error';
		}
	}

	function handleRetry() {
		handleExecute();
	}

	function handleReset() {
		executionState = 'idle';
		result = null;
		errorInfo = null;
	}

	function handleOverridesChange(newOverrides: RunOverrides) {
		overrides = newOverrides;
	}
</script>

<div class={cn('execution-panel space-y-4', className)}>
	<!-- Loading defaults indicator -->
	{#if isLoadingDefaults}
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<Loader2 class="h-4 w-4 animate-spin" />
			Loading settings...
		</div>
	{:else}
		<!-- Current settings display -->
		<div class="rounded-md border bg-muted/30 px-3 py-2">
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				{#if selectedModel}
					<img
						src="https://models.dev/logos/{selectedModel.providerId}.svg"
						alt="{selectedModel.providerId} logo"
						class="h-4 w-4 shrink-0"
						onerror={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
					/>
					<span>{selectedModel.providerName} / {selectedModel.name}</span>
				{:else}
					<span>{defaults.modelId}</span>
				{/if}
				<span class="text-muted-foreground/50">·</span>
				<span>temp {(overrides.temperature ?? defaults.temperature).toFixed(1)}</span>
				<span class="text-muted-foreground/50">·</span>
				<span>{(overrides.maxTokens ?? defaults.maxTokens).toLocaleString()} tokens</span>
			</div>
		</div>

		<!-- Override controls (collapsible) -->
		<ExecutionOverrides
			{overrides}
			onchange={handleOverridesChange}
			{defaults}
			{groupedModels}
			disabled={isExecuting}
		/>

		{#if defaultsLoadError}
			<p class="text-xs text-amber-600 dark:text-amber-400">
				⚠ Using fallback settings: {defaultsLoadError}
			</p>
		{/if}

		<!-- Execute button -->
		<Button onclick={handleExecute} disabled={!canExecute} class="w-full">
			{#if isExecuting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Executing...
			{:else}
				<Play class="mr-2 h-4 w-4" />
				Execute
			{/if}
		</Button>

		<!-- Error display -->
		{#if hasError}
			<div
				class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
			>
				<div class="flex items-start gap-3">
					<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
					<div class="flex-1">
						<p class="font-medium text-red-800 dark:text-red-200">{errorInfo?.message}</p>
						{#if errorInfo?.recovery}
							<p class="mt-1 text-sm text-red-600 dark:text-red-300">{errorInfo.recovery}</p>
						{/if}
						{#if errorInfo?.code}
							<p class="mt-1 text-xs text-red-500 dark:text-red-400">
								Error code: {errorInfo.code}
							</p>
						{/if}
					</div>
				</div>
				<div class="mt-3 flex gap-2">
					<Button variant="outline" size="sm" onclick={handleRetry}>Retry</Button>
					<Button variant="ghost" size="sm" onclick={handleReset}>Dismiss</Button>
				</div>
			</div>
		{/if}

		<!-- Success result -->
		{#if hasResult && result}
			<ExecutionResult {result} />
			<div class="flex justify-end">
				<Button variant="outline" size="sm" onclick={handleReset}>Clear Result</Button>
			</div>
		{/if}
	{/if}
</div>
