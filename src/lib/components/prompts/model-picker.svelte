<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';

	// Re-define types here to avoid server-side import issues
	export type ModelInfo = {
		id: string;
		providerID: string;
		name: string;
		status: 'alpha' | 'beta' | 'deprecated' | 'active';
	};

	export type ProviderInfo = {
		id: string;
		name: string;
		displayName?: string;
		models: {
			[key: string]: ModelInfo;
		};
	};

	export type CatalogResponse = {
		providers: ProviderInfo[];
		cachedAt: string;
		ttlSeconds: number;
	};

	interface Props {
		// Selected model (provider/model format)
		value?: string;
		// Callback when model is selected
		onchange?: (modelId: string) => void;
		// Show temperature control
		showTemperature?: boolean;
		// Temperature value
		temperature?: number;
		// Callback when temperature changes
		onTemperatureChange?: (temp: number) => void;
		// Workflow type: 'improve' | 'judge'
		workflow?: 'improve' | 'judge';
		// Policy default model (for marking default)
		defaultModel?: string;
		// Optional catalog to use (instead of fetching)
		catalog?: CatalogResponse | null;
		// Class name for styling
		class?: string;
	}

	let {
		value = '',
		onchange,
		showTemperature = true,
		temperature = 0.5,
		onTemperatureChange,
		workflow = 'improve',
		defaultModel = '',
		class: className = ''
	}: Props = $props();

	let catalog = $state<CatalogResponse | null>(null);
	let isLoadingCatalog = $state(true);
	let selectedProvider = $state<string | null>(null);
	let selectedModel = $state<string>('');

	onMount(async () => {
		if (!catalog) {
			await loadCatalog();
		}
		initializeSelection();
	});

	async function loadCatalog() {
		try {
			const response = await fetch('/api/opencode/providers');
			const result = await response.json();
			catalog = result;
		} catch (err) {
			console.error('Failed to load catalog:', err);
		} finally {
			isLoadingCatalog = false;
		}
	}

	function initializeSelection() {
		// Parse value into provider and model
		if (value && value.includes('/')) {
			const parts = value.split('/');
			selectedProvider = parts[0];
			selectedModel = parts.slice(1).join('/');
		}
	}

	// Watch for external value changes
	$effect(() => {
		if (value !== `${selectedProvider}/${selectedModel}`) {
			initializeSelection();
		}
	});

	function getProviders(): ProviderInfo[] {
		if (!catalog?.providers) return [];
		return catalog.providers.filter((p: ProviderInfo) => {
			// Filter providers that have active models
			return Object.keys(p.models).length > 0;
		});
	}

	function getModelsForProvider(providerId: string): ModelInfo[] {
		if (!catalog?.providers) return [];

		const provider = catalog.providers.find((p: ProviderInfo) => p.id === providerId);
		if (!provider) return [];

		return Object.values(provider.models)
			.filter((m: ModelInfo) => m.status === 'active')
			.sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
	}

	function isModelDefault(modelId: string): boolean {
		return defaultModel === modelId;
	}

	function handleProviderChange(providerId: string) {
		selectedProvider = providerId;
		selectedModel = ''; // Reset model selection
		// Don't trigger onchange until model is selected
	}

	function handleModelChange(modelId: string) {
		selectedModel = modelId;

		// Emit full model path: provider/model
		if (selectedProvider && modelId) {
			const fullModelId = `${selectedProvider}/${modelId}`;
			onchange?.(fullModelId);
		}
	}

	function handleTemperatureChange(newTemp: number) {
		temperature = newTemp;
		onTemperatureChange?.(newTemp);
	}
</script>

<div class={cn('model-picker space-y-4', className)}>
	{#if isLoadingCatalog}
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
			<span>Loading models...</span>
		</div>
	{:else if catalog}
		<!-- Provider Selection -->
		<div class="space-y-2">
			<label for="provider-select" class="text-sm font-medium"> Provider </label>
			<select
				id="provider-select"
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				bind:value={selectedProvider}
				onchange={(e: Event) => handleProviderChange((e.target as HTMLSelectElement).value)}
			>
				<option value="">Select provider...</option>
				{#each getProviders() as provider}
					<option value={provider.id}>{provider.displayName || provider.name}</option>
				{/each}
			</select>
		</div>

		<!-- Model Selection -->
		{#if selectedProvider}
			<div class="space-y-2">
				<label for="model-select" class="text-sm font-medium"> Model </label>
				<select
					id="model-select"
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					bind:value={selectedModel}
					onchange={(e: Event) => handleModelChange((e.target as HTMLSelectElement).value)}
				>
					<option value="">Select model...</option>
					{#each getModelsForProvider(selectedProvider) as model}
						<option value={model.id}>
							{model.name}
							{#if isModelDefault(model.id)}
								(默认)
							{/if}
						</option>
					{/each}
				</select>

				{#if selectedModel}
					<div class="mt-1 text-xs text-muted-foreground">
						Selected: {selectedProvider}/{selectedModel}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Temperature Control -->
		{#if showTemperature}
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<label for="temperature" class="text-sm font-medium">Temperature</label>
					<span class="text-xs text-muted-foreground">{temperature.toFixed(1)}</span>
				</div>
				<input
					id="temperature"
					type="range"
					min="0"
					max="1"
					step="0.1"
					bind:value={temperature}
					oninput={(e: Event) =>
						handleTemperatureChange(parseFloat((e.target as HTMLInputElement).value))}
					class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-input accent-primary"
				/>
				<div class="flex justify-between text-xs text-muted-foreground">
					<span>Precise (0.0)</span>
					<span>Creative (1.0)</span>
				</div>
			</div>
		{/if}
	{/if}
</div>
