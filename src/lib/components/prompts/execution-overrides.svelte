<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import type { RunOverrides } from '$lib/server/services/settings-cascade.service';

	interface Props {
		overrides: RunOverrides;
		onchange: (overrides: RunOverrides) => void;
		defaults: {
			modelId: string;
			temperature: number;
			maxTokens: number;
		};
		disabled?: boolean;
		class?: string;
	}

	let { overrides, onchange, defaults, disabled = false, class: className = '' }: Props = $props();

	// Track if any overrides are set
	let hasOverrides = $derived(
		overrides.modelId !== undefined ||
			overrides.temperature !== undefined ||
			overrides.maxTokens !== undefined
	);

	// Local state for inputs
	let localModelId = $state('');
	let localTemperature = $state('');
	let localMaxTokens = $state('');

	// Sync local state when overrides change externally
	$effect(() => {
		localModelId = overrides.modelId ?? '';
		localTemperature = overrides.temperature?.toString() ?? '';
		localMaxTokens = overrides.maxTokens?.toString() ?? '';
	});

	function handleModelChange(value: string) {
		localModelId = value;
		if (value.trim()) {
			onchange({ ...overrides, modelId: value.trim() });
		} else {
			const { modelId: _, ...rest } = overrides;
			onchange(rest);
		}
	}

	function handleTemperatureChange(value: string) {
		localTemperature = value;
		const parsed = parseFloat(value);
		if (!isNaN(parsed) && parsed >= 0 && parsed <= 2) {
			onchange({ ...overrides, temperature: Math.round(parsed * 10) / 10 });
		} else if (value === '') {
			const { temperature: _, ...rest } = overrides;
			onchange(rest);
		}
	}

	function handleMaxTokensChange(value: string) {
		localMaxTokens = value;
		const parsed = parseInt(value, 10);
		if (!isNaN(parsed) && parsed >= 1 && parsed <= 1000000) {
			onchange({ ...overrides, maxTokens: parsed });
		} else if (value === '') {
			const { maxTokens: _, ...rest } = overrides;
			onchange(rest);
		}
	}

	function handleReset() {
		localModelId = '';
		localTemperature = '';
		localMaxTokens = '';
		onchange({});
	}
</script>

<div class={cn('execution-overrides', className)}>
	<details class="group rounded-lg border bg-muted/30">
		<summary
			class="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-medium hover:bg-muted/50"
		>
			<div class="flex items-center gap-2">
				<ChevronDown class="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
				<span>Execution Settings</span>
				{#if hasOverrides}
					<span
						class="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300"
					>
						Modified
					</span>
				{/if}
			</div>
		</summary>

		<div class="space-y-4 border-t p-4">
			<!-- Helper text -->
			<p class="text-sm text-muted-foreground">
				Override defaults for this execution. Leave empty to use prompt settings.
			</p>

			<!-- Default values display -->
			<div class="rounded bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
				<span class="font-medium">Defaults:</span>
				{defaults.modelId} · temp {defaults.temperature} · {defaults.maxTokens.toLocaleString()} tokens
			</div>

			<!-- Model override -->
			<div class="space-y-2">
				<label for="override-model" class="text-sm font-medium"> Model Override </label>
				<input
					id="override-model"
					type="text"
					placeholder="e.g., anthropic/claude-3-5-sonnet"
					value={localModelId}
					oninput={(e) => handleModelChange(e.currentTarget.value)}
					{disabled}
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				/>
				<p class="text-xs text-muted-foreground">
					Format: provider/model-id (e.g., anthropic/claude-3-5-sonnet)
				</p>
			</div>

			<!-- Temperature override -->
			<div class="space-y-2">
				<label for="override-temperature" class="text-sm font-medium"> Temperature Override </label>
				<div class="flex items-center gap-3">
					<input
						id="override-temperature"
						type="number"
						min="0"
						max="2"
						step="0.1"
						placeholder={defaults.temperature.toString()}
						value={localTemperature}
						oninput={(e) => handleTemperatureChange(e.currentTarget.value)}
						{disabled}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<span class="shrink-0 text-sm text-muted-foreground">0.0 - 2.0</span>
				</div>
				<p class="text-xs text-muted-foreground">Lower = more focused, Higher = more creative</p>
			</div>

			<!-- Max tokens override -->
			<div class="space-y-2">
				<label for="override-maxtokens" class="text-sm font-medium"> Max Tokens Override </label>
				<div class="flex items-center gap-3">
					<input
						id="override-maxtokens"
						type="number"
						min="1"
						max="1000000"
						step="1"
						placeholder={defaults.maxTokens.toString()}
						value={localMaxTokens}
						oninput={(e) => handleMaxTokensChange(e.currentTarget.value)}
						{disabled}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<span class="shrink-0 text-sm text-muted-foreground">1 - 1,000,000</span>
				</div>
				<p class="text-xs text-muted-foreground">Maximum length of the response</p>
			</div>

			<!-- Reset button -->
			{#if hasOverrides}
				<Button variant="ghost" size="sm" onclick={handleReset} {disabled}>
					<RotateCcw class="mr-2 h-4 w-4" />
					Reset to Defaults
				</Button>
			{/if}
		</div>
	</details>
</div>
