<script lang="ts">
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';

	type SettingField = 'modelId' | 'temperature' | 'maxTokens';

	interface CouncilAgent {
		id: string;
		modelId: string;
		temperature: number;
		maxTokens: number;
		promptId?: number | null;
	}

	interface Props {
		agents: CouncilAgent[];
		errors: Record<string, Record<string, string>>;
		groupedModels: Array<{
			providerName: string;
			providerId: string;
			models: Array<{ id: string; name: string }>;
		}>;
		prompts: Array<{ id: number; title: string }>;
		onValidate: (agentId: string, field: SettingField, value: unknown, immediate: boolean) => void;
	}

	let { agents = $bindable(), errors, groupedModels, prompts, onValidate }: Props = $props();

	// Keep minimum two rows available.
	$effect(() => {
		const currentAgents = agents;
		if (currentAgents.length >= 2) {
			return;
		}

		const missingRows = 2 - currentAgents.length;
		const newRows = Array.from({ length: missingRows }, () => ({
			id: crypto.randomUUID(),
			modelId: '',
			temperature: 0.5,
			maxTokens: 8192
		}));

		agents = [...currentAgents, ...newRows];
	});

	// Auto-add row when last agent has a model selected.
	$effect(() => {
		const currentAgents = agents;
		const lastAgent = currentAgents[currentAgents.length - 1];
		if (lastAgent?.modelId) {
			agents = [
				...currentAgents,
				{ id: crypto.randomUUID(), modelId: '', temperature: 0.5, maxTokens: 8192 }
			];
		}
	});

	function getAgentError(agentId: string): Record<string, string> {
		const functionType = `agent-${agentId}`;
		return errors[functionType] || {};
	}

	function handleModelChange(agent: CouncilAgent, value: string) {
		agent.modelId = value;
		onValidate(agent.id, 'modelId', value, true);
	}

	function handleTemperatureChange(agent: CouncilAgent, value: string) {
		const numValue = parseFloat(value);
		if (!isNaN(numValue)) {
			agent.temperature = numValue;
			onValidate(agent.id, 'temperature', numValue, false);
		}
	}

	function handleMaxTokensChange(agent: CouncilAgent, value: string) {
		const numValue = parseInt(value, 10);
		if (!isNaN(numValue)) {
			agent.maxTokens = numValue;
			onValidate(agent.id, 'maxTokens', numValue, false);
		}
	}

	function handlePromptChange(agent: CouncilAgent, value: string) {
		agent.promptId = value ? parseInt(value, 10) : null;
	}

	function handleTemperatureBlur(agent: CouncilAgent) {
		onValidate(agent.id, 'temperature', agent.temperature, true);
	}

	function handleMaxTokensBlur(agent: CouncilAgent) {
		onValidate(agent.id, 'maxTokens', agent.maxTokens, true);
	}

	function removeAgent(id: string) {
		if (agents.length <= 2) return;
		agents = agents.filter((a) => a.id !== id);
	}

	function addAgent() {
		agents = [
			...agents,
			{ id: crypto.randomUUID(), modelId: '', temperature: 0.5, maxTokens: 8192 }
		];
	}
</script>

<!-- Council Header Row -->
<tr class="border-b bg-muted/50">
	<td colspan="6" class="px-4 py-3">
		<div class="flex items-center gap-2">
			<span class="font-semibold">Council Agents</span>
			<span class="text-xs text-muted-foreground">
				({agents.filter((a) => a.modelId).length} configured, minimum 2)
			</span>
		</div>
	</td>
</tr>

<!-- Agent Rows -->
{#each agents as agent, index (agent.id)}
	{@const agentError = getAgentError(agent.id)}
	{@const hasError = Object.keys(agentError).length > 0}
	<tr class={cn('border-b', hasError && 'bg-destructive/5')}>
		<!-- Agent Name -->
		<td class="px-4 py-3">
			<div class="flex items-center gap-2 pl-4">
				<span class="font-medium">Agent {index + 1}</span>
				{#if !agent.modelId && index === agents.length - 1}
					<span class="text-xs text-muted-foreground">(empty - add model)</span>
				{/if}
			</div>
		</td>

		<!-- Model Picker -->
		<td class="px-4 py-3">
			<div class="flex items-center gap-2">
				<!-- Provider Logo -->
				{#if agent.modelId}
					{@const providerId = agent.modelId.split('/')[0]}
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
						agentError.modelId && 'border-destructive'
					)}
					value={agent.modelId}
					onchange={(e) => handleModelChange(agent, (e.target as HTMLSelectElement).value)}
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
			{#if agent.modelId}
				<div class="mt-1 font-mono text-xs text-muted-foreground">
					{agent.modelId}
				</div>
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
					agentError.temperature && 'border-destructive'
				)}
				value={agent.temperature}
				onchange={(e) => handleTemperatureChange(agent, (e.target as HTMLInputElement).value)}
				onblur={() => handleTemperatureBlur(agent)}
			/>
			{#if agentError.temperature}
				<div class="mt-1 text-xs text-destructive">{agentError.temperature}</div>
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
					agentError.maxTokens && 'border-destructive'
				)}
				value={agent.maxTokens}
				onchange={(e) => handleMaxTokensChange(agent, (e.target as HTMLInputElement).value)}
				onblur={() => handleMaxTokensBlur(agent)}
			/>
			{#if agentError.maxTokens}
				<div class="mt-1 text-xs text-destructive">{agentError.maxTokens}</div>
			{/if}
		</td>

		<!-- Prompt Link -->
		<td class="px-4 py-3">
			<select
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				value={agent.promptId || ''}
				onchange={(e) => handlePromptChange(agent, (e.target as HTMLSelectElement).value)}
			>
				<option value="">None</option>
				{#each prompts as prompt}
					<option value={prompt.id}>{prompt.title}</option>
				{/each}
			</select>
		</td>

		<!-- Remove Button -->
		<td class="px-4 py-3">
			{#if agents.length > 2}
				<Button variant="ghost" size="sm" onclick={() => removeAgent(agent.id)}>Remove</Button>
			{/if}
		</td>
	</tr>
{/each}

<tr>
	<td colspan="6" class="px-4 py-3">
		<div class="flex justify-end">
			<Button variant="outline" size="sm" onclick={addAgent}>Add Agent</Button>
		</div>
	</td>
</tr>
