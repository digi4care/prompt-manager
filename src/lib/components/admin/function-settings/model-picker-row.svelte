<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { getCachedModelCatalog, setCachedModelCatalog } from '$lib/client/model-catalog-cache';

	type FunctionType = 'executor' | 'judge' | 'improve';
	type SettingField = 'modelId' | 'temperature' | 'maxTokens';

	interface FunctionSetting {
		modelId: string;
		temperature: number;
		maxTokens: number;
		promptId: number | null;
	}

	interface GroupedModel {
		id: string;
		name: string;
	}

	interface ProviderGroup {
		providerName: string;
		providerId: string;
		models: GroupedModel[];
	}

	interface Props {
		type: FunctionType;
		setting: FunctionSetting;
		error?: Record<string, string>;
		prompts: Array<{ id: number; title: string }>;
		onValidate: (field: SettingField, value: unknown, immediate?: boolean) => void;
		onReset: () => void;
	}

	let { type, setting = $bindable(), error = {}, prompts, onValidate, onReset }: Props = $props();

	let groupedModels = $state<ProviderGroup[]>([]);

	const labels: Record<FunctionType, string> = {
		executor: 'Executor',
		judge: 'Judge',
		improve: 'Improve'
	};

	let selectedProvider = $derived.by(() => {
		for (const provider of groupedModels) {
			if (provider.models.some((model) => model.id === setting.modelId)) {
				return provider;
			}
		}
		return null;
	});

	let selectedModel = $derived.by(() => {
		if (!selectedProvider) {
			return null;
		}
		return selectedProvider.models.find((model) => model.id === setting.modelId) ?? null;
	});

	function normalizeProviderGroups(payload: unknown): ProviderGroup[] {
		const providers =
			typeof payload === 'object' && payload !== null && 'providers' in payload
				? (payload as { providers?: unknown[] }).providers
				: [];

		if (!Array.isArray(providers)) {
			return [];
		}

		return providers
			.map((provider) => {
				const providerRecord = provider as { id?: unknown; name?: unknown; models?: unknown };
				const modelList = Array.isArray(providerRecord.models)
					? providerRecord.models
					: Object.values((providerRecord.models as Record<string, unknown>) || {});

				const models = modelList
					.map((entry) => entry as { id?: unknown; name?: unknown })
					.filter((entry) => typeof entry.id === 'string' && entry.id.length > 0)
					.map((entry) => ({
						id: entry.id as string,
						name:
							typeof entry.name === 'string' && entry.name.trim().length > 0
								? entry.name
								: (entry.id as string)
					}));

				return {
					providerName: typeof providerRecord.name === 'string' ? providerRecord.name : 'Unknown',
					providerId: typeof providerRecord.id === 'string' ? providerRecord.id : 'unknown',
					models
				};
			})
			.filter((provider) => provider.models.length > 0)
			.sort((a, b) => a.providerName.localeCompare(b.providerName));
	}

	async function loadCatalog(): Promise<void> {
		try {
			const cachedCatalog = getCachedModelCatalog();
			if (cachedCatalog) {
				groupedModels = normalizeProviderGroups(cachedCatalog);
				return;
			}

			const response = await fetch('/api/opencode/providers');
			if (!response.ok) {
				return;
			}

			const payload = await response.json();
			setCachedModelCatalog(payload);
			groupedModels = normalizeProviderGroups(payload);
		} catch (error) {
			console.error('Failed to load model providers:', error);
		}
	}

	function handleModelChange(event: Event): void {
		const value = (event.target as HTMLSelectElement).value;
		setting.modelId = value;
		onValidate('modelId', value, true);
	}

	function handleTemperatureChange(event: Event): void {
		const value = Number((event.target as HTMLInputElement).value);
		setting.temperature = value;
		onValidate('temperature', value, false);
	}

	function handleMaxTokensChange(event: Event): void {
		const value = Number((event.target as HTMLInputElement).value);
		setting.maxTokens = value;
		onValidate('maxTokens', value, false);
	}

	function handlePromptChange(event: Event): void {
		const value = (event.target as HTMLSelectElement).value;
		setting.promptId = value ? Number(value) : null;
	}

	function handleReset(): void {
		if (confirm(`Reset ${labels[type]} to defaults?`)) {
			onReset();
		}
	}

	onMount(() => {
		void loadCatalog();
	});
</script>

<tr class="border-t align-top {Object.keys(error).length > 0 ? 'bg-destructive/5' : ''}">
	<td class="px-3 py-2 font-medium">
		<div>{labels[type]}</div>
		<div class="mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
			[default]
		</div>
	</td>
	<td class="px-3 py-2">
		<select
			class="h-9 w-full rounded-md border border-input bg-background px-2"
			class:border-destructive={Boolean(error.modelId)}
			value={setting.modelId}
			onchange={handleModelChange}
		>
			<option value="">Select model...</option>
			{#each groupedModels as provider}
				<optgroup label={provider.providerName}>
					{#each provider.models as model}
						<option value={model.id}>{provider.providerName} / {model.name}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
		{#if selectedProvider && selectedModel}
			<div class="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
				<img
					src="https://models.dev/logos/{selectedProvider.providerId}.svg"
					alt="{selectedProvider.providerId} logo"
					class="h-3.5 w-3.5"
					onerror={(event) => ((event.target as HTMLImageElement).style.display = 'none')}
				/>
				<span class="font-mono">{selectedModel.id}</span>
			</div>
		{/if}
		{#if error.modelId}
			<div class="mt-1 text-xs text-destructive">{error.modelId}</div>
		{/if}
	</td>
	<td class="px-3 py-2">
		<input
			type="number"
			min="0"
			max="2"
			step="0.1"
			class="h-9 w-28 rounded-md border border-input bg-background px-2"
			class:border-destructive={Boolean(error.temperature)}
			value={setting.temperature}
			onchange={handleTemperatureChange}
			onblur={() => onValidate('temperature', setting.temperature, true)}
		/>
		{#if error.temperature}
			<div class="mt-1 text-xs text-destructive">{error.temperature}</div>
		{/if}
	</td>
	<td class="px-3 py-2">
		<input
			type="number"
			min="1"
			max="1000000"
			step="1"
			class="h-9 w-36 rounded-md border border-input bg-background px-2"
			class:border-destructive={Boolean(error.maxTokens)}
			value={setting.maxTokens}
			onchange={handleMaxTokensChange}
			onblur={() => onValidate('maxTokens', setting.maxTokens, true)}
		/>
		{#if error.maxTokens}
			<div class="mt-1 text-xs text-destructive">{error.maxTokens}</div>
		{/if}
	</td>
	<td class="px-3 py-2">
		<select
			class="h-9 w-full rounded-md border border-input bg-background px-2"
			value={setting.promptId ?? ''}
			onchange={handlePromptChange}
			onblur={() => onValidate('modelId', setting.modelId, true)}
		>
			<option value="">None</option>
			{#each prompts as prompt}
				<option value={prompt.id}>{prompt.title}</option>
			{/each}
		</select>
	</td>
	<td class="px-3 py-2">
		<Button variant="outline" size="sm" onclick={handleReset}>Reset</Button>
	</td>
</tr>
