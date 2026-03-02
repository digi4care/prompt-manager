<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import ModelPickerModal from '$lib/components/shared/model-selection/model-picker-modal.svelte';
	import Users from '@lucide/svelte/icons/users';

	type SettingField = 'modelId' | 'modelVariant' | 'temperature' | 'maxTokens';

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

	interface CouncilAgent {
		id: string;
		modelId: string;
		modelVariant?: string | null;
		temperature: number;
		maxTokens: number;
		promptId?: number | null;
	}

	interface Props {
		agents: CouncilAgent[];
		errors: Record<string, Record<string, string>>;
		groupedModels: ProviderGroup[];
		allGroupedModels: ProviderGroup[];
		prompts: Array<{ id: number; title: string }>;
		onValidate: (agentId: string, field: SettingField, value: unknown, immediate: boolean) => void;
	}

	let {
		agents = $bindable(),
		errors,
		groupedModels,
		allGroupedModels,
		prompts,
		onValidate
	}: Props = $props();

	let activeModelPickerAgentId = $state<string | null>(null);

	$effect(() => {
		const currentAgents = agents;
		if (currentAgents.length >= 2) {
			return;
		}

		const missingRows = 2 - currentAgents.length;
		const newRows = Array.from({ length: missingRows }, () => ({
			id: crypto.randomUUID(),
			modelId: '',
			modelVariant: null,
			temperature: 0.5,
			maxTokens: 8192
		}));

		agents = [...currentAgents, ...newRows];
	});

	function getVariantOptionsForModel(modelId: string): string[] {
		if (!modelId) {
			return [];
		}

		for (const group of allGroupedModels) {
			const model = group.models.find((entry) => entry.id === modelId);
			if (model?.variantOptions && model.variantOptions.length > 0) {
				return model.variantOptions;
			}
		}

		return [];
	}

	function normalizeAgentVariant(agent: CouncilAgent, immediate = true): void {
		const variantOptions = getVariantOptionsForModel(agent.modelId);
		let nextVariant: string | null = null;

		if (variantOptions.length > 0) {
			nextVariant =
				typeof agent.modelVariant === 'string' && variantOptions.includes(agent.modelVariant)
					? agent.modelVariant
					: variantOptions[0];
		}

		if ((agent.modelVariant ?? null) === nextVariant) {
			return;
		}

		agent.modelVariant = nextVariant;
		onValidate(
			agent.id,
			'modelVariant',
			{ modelId: agent.modelId, modelVariant: agent.modelVariant ?? null },
			immediate
		);
	}

	$effect(() => {
		for (const agent of agents) {
			normalizeAgentVariant(agent, true);
		}
	});

	let activeAgent = $derived(
		activeModelPickerAgentId
			? agents.find((agent) => agent.id === activeModelPickerAgentId) || null
			: null
	);

	let activeSelectedModel = $derived.by(() => {
		if (!activeAgent?.modelId) {
			return null;
		}

		for (const group of allGroupedModels) {
			const model = group.models.find((entry) => entry.id === activeAgent.modelId);
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

	function getAgentError(agentId: string): Record<string, string> {
		return errors[`agent-${agentId}`] || {};
	}

	function getSelectedModel(agent: CouncilAgent): {
		id: string;
		name: string;
		providerName: string;
		providerId: string;
		variantOptions?: string[];
	} | null {
		if (!agent.modelId) {
			return null;
		}

		for (const group of allGroupedModels) {
			const model = group.models.find((entry) => entry.id === agent.modelId);
			if (model) {
				return {
					...model,
					providerName: group.providerName,
					providerId: group.providerId
				};
			}
		}

		return null;
	}

	function openModelPicker(agentId: string): void {
		activeModelPickerAgentId = agentId;
	}

	function closeModelPicker(): void {
		activeModelPickerAgentId = null;
	}

	function handleModelSave(modelId: string): void {
		if (!activeModelPickerAgentId) {
			return;
		}

		const targetAgent = agents.find((agent) => agent.id === activeModelPickerAgentId);
		if (!targetAgent) {
			return;
		}

		targetAgent.modelId = modelId;
		normalizeAgentVariant(targetAgent, true);
		onValidate(targetAgent.id, 'modelId', modelId, true);
	}

	function handleVariantChange(agent: CouncilAgent, value: string): void {
		agent.modelVariant = value || null;
		onValidate(
			agent.id,
			'modelVariant',
			{ modelId: agent.modelId, modelVariant: agent.modelVariant ?? null },
			true
		);
	}

	function handleTemperatureChange(agent: CouncilAgent, value: string): void {
		const numValue = parseFloat(value);
		if (!isNaN(numValue)) {
			agent.temperature = numValue;
			onValidate(agent.id, 'temperature', numValue, false);
		}
	}

	function handleMaxTokensChange(agent: CouncilAgent, value: string): void {
		const numValue = parseInt(value, 10);
		if (!isNaN(numValue)) {
			agent.maxTokens = numValue;
			onValidate(agent.id, 'maxTokens', numValue, false);
		}
	}

	function handlePromptChange(agent: CouncilAgent, value: string): void {
		agent.promptId = value ? parseInt(value, 10) : null;
	}

	function handleTemperatureBlur(agent: CouncilAgent): void {
		onValidate(agent.id, 'temperature', agent.temperature, true);
	}

	function handleMaxTokensBlur(agent: CouncilAgent): void {
		onValidate(agent.id, 'maxTokens', agent.maxTokens, true);
	}

	function removeAgent(id: string): void {
		if (agents.length <= 2) return;
		agents = agents.filter((agent) => agent.id !== id);
	}

	function addAgent(): void {
		agents = [
			...agents,
			{
				id: crypto.randomUUID(),
				modelId: '',
				modelVariant: null,
				temperature: 0.5,
				maxTokens: 8192
			}
		];
	}
</script>

<div class="space-y-3 rounded-lg border bg-card p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h4 class="flex items-center gap-2 font-semibold">
				<Users class="h-4 w-4 text-muted-foreground" />
				Council Agents
			</h4>
			<p class="text-xs text-muted-foreground">
				{agents.filter((a) => a.modelId).length} configured, minimum 2 agents
			</p>
		</div>
		<Button variant="outline" size="sm" class="w-full sm:w-auto" onclick={addAgent}
			>Add Agent</Button
		>
	</div>

	{#each agents as agent, index (agent.id)}
		{@const agentError = getAgentError(agent.id)}
		{@const hasError = Object.keys(agentError).length > 0}
		{@const selectedModel = getSelectedModel(agent)}

		<div
			class={cn(
				'rounded-md border p-3',
				hasError && 'border-destructive/40 bg-destructive/5',
				!agent.modelId && index === agents.length - 1 && 'border-dashed border-muted-foreground/30'
			)}
		>
			<div class="mb-3 flex flex-wrap items-start justify-between gap-2">
				<div class="flex items-center gap-2">
					<span class="font-medium">Agent {index + 1}</span>
					{#if !agent.modelId && index === agents.length - 1}
						<span class="text-xs text-muted-foreground">(empty draft)</span>
					{/if}
				</div>
				{#if agents.length > 2}
					<Button
						variant="ghost"
						size="sm"
						class="w-full sm:w-auto"
						onclick={() => removeAgent(agent.id)}
					>
						Remove
					</Button>
				{/if}
			</div>

			<div class="grid gap-4 xl:grid-cols-2">
				<div class="space-y-3 rounded-md border bg-background/60 p-3">
					<div class="rounded-md border bg-background px-3 py-2">
						<dl class="space-y-1">
							<dt class="text-[11px] tracking-wide text-muted-foreground uppercase">
								Selected model
							</dt>
							<dd class="flex min-w-0 items-center gap-2 text-sm">
								{#if selectedModel}
									<img
										src="https://models.dev/logos/{selectedModel.providerId}.svg"
										alt="{selectedModel.providerId} logo"
										class="h-4 w-4 shrink-0"
										onerror={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
									/>
									<span class="break-words"
										>{selectedModel.providerName} / {selectedModel.name}</span
									>
								{:else}
									<span class="text-muted-foreground">No model selected</span>
								{/if}
							</dd>
							{#if selectedModel}
								<dd class="font-mono text-[11px] text-muted-foreground">{selectedModel.id}</dd>
							{/if}
						</dl>
					</div>

					{#if selectedModel?.variantOptions && selectedModel.variantOptions.length > 0}
						<div>
							<label
								for={`council-${agent.id}-variant`}
								class="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
								>Variant</label
							>
							<select
								id={`council-${agent.id}-variant`}
								class={cn(
									'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
									agentError.modelVariant && 'border-destructive'
								)}
								value={agent.modelVariant || selectedModel.variantOptions[0]}
								onchange={(e) => handleVariantChange(agent, (e.target as HTMLSelectElement).value)}
							>
								{#each selectedModel.variantOptions as variant}
									<option value={variant}>{variant}</option>
								{/each}
							</select>
						</div>
					{/if}

					<Button
						variant="outline"
						size="sm"
						class="w-full sm:w-auto"
						onclick={() => openModelPicker(agent.id)}
					>
						{selectedModel ? 'Change model' : 'Choose model'}
					</Button>

					{#if agentError.modelId}
						<div class="text-xs text-destructive">{agentError.modelId}</div>
					{/if}
					{#if agentError.modelVariant}
						<div class="text-xs text-destructive">{agentError.modelVariant}</div>
					{/if}
				</div>

				<div class="space-y-3 rounded-md border bg-background/60 p-3">
					<div class="grid gap-3 md:grid-cols-2">
						<div>
							<label
								for={`council-${agent.id}-temperature`}
								class="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
								>Temperature</label
							>
							<input
								id={`council-${agent.id}-temperature`}
								type="number"
								min="0"
								max="2"
								step="0.1"
								class={cn(
									'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
									agentError.temperature && 'border-destructive'
								)}
								value={agent.temperature}
								onchange={(e) =>
									handleTemperatureChange(agent, (e.target as HTMLInputElement).value)}
								onblur={() => handleTemperatureBlur(agent)}
							/>
							{#if agentError.temperature}
								<div class="mt-1 text-xs text-destructive">{agentError.temperature}</div>
							{/if}
						</div>

						<div>
							<label
								for={`council-${agent.id}-max-tokens`}
								class="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
								>Max tokens</label
							>
							<input
								id={`council-${agent.id}-max-tokens`}
								type="number"
								min="1"
								max="1000000"
								step="1"
								class={cn(
									'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
									agentError.maxTokens && 'border-destructive'
								)}
								value={agent.maxTokens}
								onchange={(e) => handleMaxTokensChange(agent, (e.target as HTMLInputElement).value)}
								onblur={() => handleMaxTokensBlur(agent)}
							/>
							{#if agentError.maxTokens}
								<div class="mt-1 text-xs text-destructive">{agentError.maxTokens}</div>
							{/if}
						</div>
					</div>

					<div>
						<label
							for={`council-${agent.id}-prompt`}
							class="mb-1 block text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
							>Prompt</label
						>
						<select
							id={`council-${agent.id}-prompt`}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							value={agent.promptId || ''}
							onchange={(e) => handlePromptChange(agent, (e.target as HTMLSelectElement).value)}
						>
							<option value="">None</option>
							{#each prompts as prompt}
								<option value={prompt.id}>{prompt.title}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>

<ModelPickerModal
	open={activeModelPickerAgentId !== null}
	title="Select council agent model"
	{groupedModels}
	selectedModelId={activeAgent?.modelId || ''}
	onSave={handleModelSave}
	onClose={closeModelPicker}
/>
