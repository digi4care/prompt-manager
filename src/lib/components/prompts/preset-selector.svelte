<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils';

	interface ImprovePreset {
		id: number;
		name: string;
		description?: string | null;
		instruction: string;
		model?: string | null;
		temperature?: number | null;
		allowedModels?: string | null;
		isDefault: boolean;
	}

	interface Props {
		// Selected preset ID
		value?: number | null;
		// Callback when preset is selected
		onchange?: (presetId: number | null) => void;
		// Callback to get selected preset details
		ongetpreset?: (preset: ImprovePreset | null) => void;
		// Optional presets list (to avoid refetching)
		presets?: ImprovePreset[];
		// Class name for styling
		class?: string;
	}

	let {
		value = null,
		onchange,
		ongetpreset,
		presets: presetsProp,
		class: className = ''
	}: Props = $props();

	let presets = $state<ImprovePreset[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let selectedPreset = $derived(value ? presets.find((p) => p.id === value) || null : null);

	onMount(async () => {
		if (!presetsProp) {
			await loadPresets();
		} else {
			presets = presetsProp;
			isLoading = false;
		}
	});

	async function loadPresets() {
		try {
			const response = await fetch('/api/admin/improve-presets');
			const result = await response.json();
			presets = result.data || [];
			error = null;
		} catch (err) {
			console.error('Failed to load presets:', err);
			error = err instanceof Error ? err.message : 'Failed to load presets';
		} finally {
			isLoading = false;
		}
	}

	function handlePresetChange(e: Event) {
		const presetId = (e.target as HTMLSelectElement).value;
		const id = presetId === '' ? null : parseInt(presetId);
		onchange?.(id);

		// Notify parent of selected preset details
		const preset = id ? presets.find((p) => p.id === id) || null : null;
		ongetpreset?.(preset);
	}
</script>

<div class={cn('preset-selector space-y-2', className)}>
	<label for="preset-select" class="text-sm font-medium"> Preset (optional) </label>

	{#if isLoading}
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
			<span>Loading presets...</span>
		</div>
	{:else if error}
		<div class="text-sm text-red-600 dark:text-red-400">
			<p>Failed to load presets: {error}</p>
		</div>
	{:else if presets.length === 0}
		<select
			id="preset-select"
			class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm opacity-50"
			disabled
		>
			<option value="">No presets available</option>
		</select>
	{:else}
		<select
			id="preset-select"
			class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			value={value ?? ''}
			onchange={handlePresetChange}
		>
			<option value="">No preset (use default)</option>
			{#each presets as preset}
				<option value={preset.id}>
					{preset.name}
					{#if preset.isDefault}
						(默认){/if}
					{#if preset.description}
						- {preset.description}{/if}
				</option>
			{/each}
		</select>

		<!-- Show selected preset info -->
		{#if value && selectedPreset}
			<div class="mt-2 space-y-2 rounded-lg bg-muted/50 p-3">
				<div class="flex items-start gap-2">
					<svg
						class="mt-0.5 h-4 w-4 text-primary"
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
					<div class="min-w-0 flex-1">
						<div class="text-sm font-medium">{selectedPreset.name}</div>
						{#if selectedPreset.description}
							<div class="mt-0.5 text-xs text-muted-foreground">{selectedPreset.description}</div>
						{/if}
					</div>
				</div>

				<!-- Show preset instruction preview -->
				{#if selectedPreset.instruction}
					<div class="mt-2">
						<div class="mb-1 text-xs font-medium text-muted-foreground">Instruction:</div>
						<div class="line-clamp-2 text-xs text-muted-foreground">
							{selectedPreset.instruction}
						</div>
					</div>
				{/if}

				<!-- Show model/temp if set -->
				{#if selectedPreset.model || (selectedPreset.temperature !== null && selectedPreset.temperature !== undefined)}
					<div class="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
						{#if selectedPreset.model}
							<span>Model: {selectedPreset.model}</span>
						{/if}
						{#if selectedPreset.temperature !== null && selectedPreset.temperature !== undefined}
							<span>Temp: {selectedPreset.temperature}</span>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
