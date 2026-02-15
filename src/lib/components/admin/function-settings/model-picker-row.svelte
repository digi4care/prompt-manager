<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';

	type FunctionType = 'executor' | 'judge' | 'improve';
	type SettingField = 'modelId' | 'temperature' | 'maxTokens';

	interface FunctionSetting {
		id?: number;
		functionType: FunctionType;
		modelId: string;
		temperature: number;
		maxTokens: number;
		promptId?: number | null;
	}

	interface GroupedModel {
		id: string;
		name: string;
	}

	interface Props {
		type: FunctionType;
		setting: FunctionSetting;
		error: Record<string, string>;
		groupedModels: Array<{
			providerName: string;
			providerId: string;
			models: GroupedModel[];
		}>;
		prompts: Array<{ id: number; title: string }>;
		onModelChange: (modelId: string) => void;
		onValidate: (field: SettingField, value: unknown, immediate: boolean) => void;
		onReset: () => void;
	}

	let {
		type,
		setting = $bindable(),
		error,
		groupedModels,
		prompts,
		onModelChange,
		onValidate,
		onReset
	}: Props = $props();

	let hasError = $derived(Object.keys(error).length > 0);

	function handleModelChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		setting.modelId = target.value;
		onModelChange(target.value);
	}

	function handleTemperatureChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value)) {
			setting.temperature = value;
			onValidate('temperature', value, false);
		}
	}

	function handleMaxTokensChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseInt(target.value, 10);
		if (!isNaN(value)) {
			setting.maxTokens = value;
			onValidate('maxTokens', value, false);
		}
	}

	function handlePromptChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		setting.promptId = target.value ? parseInt(target.value, 10) : null;
	}

	function handleTemperatureBlur() {
		onValidate('temperature', setting.temperature, true);
	}

	function handleMaxTokensBlur() {
		onValidate('maxTokens', setting.maxTokens, true);
	}

	function handleResetClick() {
		if (confirm(`Reset ${type} to default values?`)) {
			onReset();
		}
	}

	// Function display names
	const functionLabels: Record<string, string> = {
		executor: 'Executor',
		judge: 'Judge',
		improve: 'Improve'
	};

	// Default temperatures for display
	const defaultTemperatures: Record<string, number> = {
		executor: 0.7,
		judge: 0.3,
		improve: 0.7
	};

	// Default max tokens for display
	const defaultMaxTokens: Record<string, number> = {
		executor: 4096,
		judge: 2048,
		improve: 4096
	};
</script>

<tr class={cn('border-b', hasError && 'bg-destructive/5')}>
	<!-- Function Name -->
	<td class="px-4 py-3">
		<div class="flex items-center gap-2">
			<span class="font-medium capitalize">{functionLabels[type]}</span>
			<span
				class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
				title="Global default setting"
			>
				[default]
			</span>
		</div>
		<div class="mt-1 text-xs text-muted-foreground">
			{#if type === 'executor'}
				Runs prompt content
			{:else if type === 'judge'}
				Evaluates output quality
			{:else if type === 'improve'}
				Enhances prompt quality
			{/if}
		</div>
	</td>

	<!-- Model Picker -->
	<td class="px-4 py-3">
		<div class="flex items-center gap-2">
			<!-- Provider Logo -->
			{#if setting.modelId}
				{@const providerId = setting.modelId.split('/')[0]}
				<img
					src="https://models.dev/logos/{providerId}.svg"
					alt="{providerId} logo"
					class="h-5 w-5 shrink-0"
					onerror={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
				/>
			{/if}

			<!-- Model Dropdown -->
			<select
				class={cn(
					'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
					error.modelId && 'border-destructive'
				)}
				value={setting.modelId}
				onchange={handleModelChange}
			>
				<option value="">Select model...</option>
				{#each groupedModels as group}
					<optgroup label={group.providerName}>
						{#each group.models as model}
							<option value={model.id}>{group.providerName} / {model.name}</option>
						{/each}
					</optgroup>
				{/each}
			</select>
		</div>
		{#if setting.modelId}
			<div class="mt-1 font-mono text-xs text-muted-foreground">
				{setting.modelId}
			</div>
		{/if}
		{#if error.modelId}
			<div class="mt-1 text-xs text-destructive">{error.modelId}</div>
		{/if}
	</td>

	<!-- Temperature -->
	<td class="px-4 py-3">
		<input
			type="number"
			min="0"
			max="2"
			step="0.1"
			class={cn(
				'flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
				error.temperature && 'border-destructive'
			)}
			value={setting.temperature}
			onchange={handleTemperatureChange}
			onblur={handleTemperatureBlur}
		/>
		<div class="mt-1 text-xs text-muted-foreground">0-2, default: {defaultTemperatures[type]}</div>
		{#if error.temperature}
			<div class="mt-1 text-xs text-destructive">{error.temperature}</div>
		{/if}
	</td>

	<!-- Max Tokens -->
	<td class="px-4 py-3">
		<input
			type="number"
			min="1"
			max="1000000"
			step="1"
			class={cn(
				'flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
				error.maxTokens && 'border-destructive'
			)}
			value={setting.maxTokens}
			onchange={handleMaxTokensChange}
			onblur={handleMaxTokensBlur}
		/>
		<div class="mt-1 text-xs text-muted-foreground">
			1-{(1000000).toLocaleString()}, default: {defaultMaxTokens[type].toLocaleString()}
		</div>
		{#if error.maxTokens}
			<div class="mt-1 text-xs text-destructive">{error.maxTokens}</div>
		{/if}
	</td>

	<!-- Prompt Link (optional) -->
	<td class="px-4 py-3">
		<select
			class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			value={setting.promptId || ''}
			onchange={handlePromptChange}
		>
			<option value="">None</option>
			{#each prompts as prompt}
				<option value={prompt.id}>{prompt.title}</option>
			{/each}
		</select>
		<div class="mt-1 text-xs text-muted-foreground">Optional prompt template</div>
	</td>

	<!-- Reset Button -->
	<td class="px-4 py-3">
		<Button variant="ghost" size="sm" onclick={handleResetClick}>Reset</Button>
	</td>
</tr>
