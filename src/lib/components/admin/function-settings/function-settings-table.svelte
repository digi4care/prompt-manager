<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import ValidationSummary from './validation-summary.svelte';
	import ModelPickerRow from './model-picker-row.svelte';
	import CouncilRepeater from './council-repeater.svelte';
	import type { CatalogResponse, ModelInfo } from '$lib/server/services/opencode.service';
	import { validateTemperature, validateMaxTokens } from '$lib/validators/function-settings';

	// Types
	interface FunctionSetting {
		id?: number;
		functionType: string;
		modelId: string;
		temperature: number;
		maxTokens: number;
		promptId?: number | null;
	}

	interface CouncilAgent {
		id: string;
		modelId: string;
		temperature: number;
		maxTokens: number;
		promptId?: number | null;
	}

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	// State
	let settings = $state<Record<string, FunctionSetting>>({
		executor: { functionType: 'executor', modelId: '', temperature: 0.7, maxTokens: 4096 },
		judge: { functionType: 'judge', modelId: '', temperature: 0.3, maxTokens: 2048 },
		improve: { functionType: 'improve', modelId: '', temperature: 0.7, maxTokens: 4096 }
	});

	let councilAgents = $state<CouncilAgent[]>([
		{ id: crypto.randomUUID(), modelId: '', temperature: 0.5, maxTokens: 8192 },
		{ id: crypto.randomUUID(), modelId: '', temperature: 0.5, maxTokens: 8192 }
	]);

	let errors = $state<Record<string, Record<string, string>>>({});
	let catalog = $state<CatalogResponse | null>(null);
	let prompts = $state<Array<{ id: number; title: string }>>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);

	// Derived
	let hasErrors = $derived(Object.keys(errors).length > 0);

	// Debounce helper
	function createDebounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
		let timeoutId: ReturnType<typeof setTimeout> | null = null;
		return ((...args: Parameters<T>) => {
			if (timeoutId) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => fn(...args), delay);
		}) as T;
	}

	// Validate a single field for a function type
	function validateField(
		functionType: string,
		field: string,
		value: unknown,
		immediate = false
	): void {
		const doValidate = () => {
			let errorMessage: string | null = null;

			if (field === 'temperature') {
				errorMessage = validateTemperature(value as number);
			} else if (field === 'maxTokens') {
				errorMessage = validateMaxTokens(value as number);
			} else if (field === 'modelId') {
				if (!value || (value as string).trim() === '') {
					// Model is optional for saving, so no error if empty
					errorMessage = null;
				}
			}

			// Update errors state
			if (errorMessage) {
				errors = {
					...errors,
					[functionType]: {
						...errors[functionType],
						[field]: errorMessage
					}
				};
			} else {
				// Clear error for this field
				if (errors[functionType]) {
					const { [field]: _, ...rest } = errors[functionType];
					if (Object.keys(rest).length === 0) {
						const { [functionType]: __, ...restErrors } = errors;
						errors = restErrors;
					} else {
						errors = { ...errors, [functionType]: rest };
					}
				}
			}
		};

		if (immediate) {
			doValidate();
		} else {
			// Debounce for number fields
			const debouncedValidate = createDebounce(doValidate, 300);
			debouncedValidate();
		}
	}

	// Validate council agent field
	function validateCouncilAgentField(
		agentId: string,
		field: string,
		value: unknown,
		immediate = false
	): void {
		const functionType = `agent-${agentId}`;
		validateField(functionType, field, value, immediate);
	}

	// Get all active models from catalog
	function getAllModels(): ModelInfo[] {
		if (!catalog?.providers) return [];
		const allModels: ModelInfo[] = [];
		for (const provider of catalog.providers) {
			for (const modelId in provider.models) {
				const model = provider.models[modelId];
				if (model.status === 'active') {
					allModels.push(model);
				}
			}
		}
		return allModels.sort((a, b) => a.name.localeCompare(b.name));
	}

	// Get models grouped by provider
	function getGroupedModels(): Array<{
		providerName: string;
		providerId: string;
		models: ModelInfo[];
	}> {
		if (!catalog?.providers) return [];
		return catalog.providers
			.map((provider) => ({
				providerName: provider.name,
				providerId: provider.id,
				models: Object.values(provider.models || {}).filter((m) => m.status === 'active')
			}))
			.filter((group) => group.models.length > 0)
			.sort((a, b) => a.providerName.localeCompare(b.providerName));
	}

	// Load data
	async function loadData() {
		try {
			const [catalogRes, settingsRes, promptsRes] = await Promise.all([
				fetch('/api/opencode/providers'),
				fetch('/api/admin/function-defaults'),
				fetch('/api/prompts?limit=200')
			]);

			catalog = await catalogRes.json();

			const settingsData = await settingsRes.json();
			if (settingsData.data) {
				for (const setting of settingsData.data) {
					if (setting.functionType === 'council') {
						// Council settings are handled separately via councilAgents
						continue;
					}
					settings[setting.functionType] = {
						id: setting.id,
						functionType: setting.functionType,
						modelId: setting.modelId || '',
						temperature: setting.temperature,
						maxTokens: setting.maxTokens,
						promptId: setting.promptId
					};
				}
			}

			const promptsData = await promptsRes.json();
			prompts = promptsData.data?.prompts || [];
		} catch (err) {
			console.error('Failed to load data:', err);
			toast.error('Failed to load settings');
		} finally {
			isLoading = false;
		}
	}

	// Handle save
	async function handleSave() {
		if (hasErrors || isSaving) return;

		isSaving = true;

		try {
			// Save each function type
			const savePromises = Object.entries(settings).map(async ([type, setting]) => {
				const response = await fetch(`/api/admin/function-defaults/${type}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						modelId: setting.modelId || null,
						temperature: setting.temperature,
						maxTokens: setting.maxTokens,
						promptId: setting.promptId
					})
				});

				if (!response.ok) {
					throw new Error(`Failed to save ${type} settings`);
				}
				return response.json();
			});

			// Save council agents (filter out empty ones)
			const validAgents = councilAgents.filter((a) => a.modelId);
			if (validAgents.length > 0) {
				const response = await fetch('/api/admin/function-defaults/council', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						modelId: validAgents[0].modelId,
						temperature: validAgents[0].temperature,
						maxTokens: validAgents[0].maxTokens,
						// Store council config as JSON in a separate mechanism later
						promptId: validAgents[0].promptId
					})
				});

				if (!response.ok) {
					throw new Error('Failed to save council settings');
				}
			}

			await Promise.all(savePromises);
			toast.success('Settings saved successfully');
		} catch (err) {
			console.error('Failed to save settings:', err);
			toast.error('Failed to save settings', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			isSaving = false;
		}
	}

	// Reset a single function type
	async function handleReset(functionType: string) {
		try {
			const response = await fetch(`/api/admin/function-defaults/${functionType}/reset`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`Failed to reset ${functionType}`);
			}

			const result = await response.json();
			settings[functionType] = {
				...settings[functionType],
				modelId: result.data.modelId || '',
				temperature: result.data.temperature,
				maxTokens: result.data.maxTokens,
				promptId: result.data.promptId
			};

			// Clear errors for this function type
			if (errors[functionType]) {
				const { [functionType]: _, ...restErrors } = errors;
				errors = restErrors;
			}

			toast.success(`${functionType} reset to defaults`);
		} catch (err) {
			console.error('Failed to reset:', err);
			toast.error(`Failed to reset ${functionType}`);
		}
	}

	// Expose validation functions to child components
	function validateModelField(functionType: string, modelId: string) {
		validateField(functionType, 'modelId', modelId, true);
	}

	onMount(() => {
		loadData();
	});
</script>

<Card class={className}>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="text-lg">Function Defaults</CardTitle>
				<CardDescription>
					Configure default model, temperature, and token limits for each function type
				</CardDescription>
			</div>
			<Button
				variant="default"
				size="sm"
				onclick={handleSave}
				disabled={hasErrors || isSaving || isLoading}
			>
				{isSaving ? 'Saving...' : 'Save Settings'}
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if isLoading}
			<div class="flex items-center gap-2 text-muted-foreground">
				<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
				<span>Loading settings...</span>
			</div>
		{:else}
			<!-- Validation Summary -->
			<ValidationSummary {errors} class="mb-4" />

			<!-- Settings Table -->
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b">
							<th class="px-4 py-3 text-left font-medium">Function</th>
							<th class="px-4 py-3 text-left font-medium">Model</th>
							<th class="px-4 py-3 text-left font-medium">Temperature</th>
							<th class="px-4 py-3 text-left font-medium">Max Tokens</th>
							<th class="px-4 py-3 text-left font-medium">Prompt</th>
							<th class="px-4 py-3 text-left font-medium">Reset</th>
						</tr>
					</thead>
					<tbody>
						<!-- Executor, Judge, Improve rows -->
						{#each ['executor', 'judge', 'improve'] as const as type}
							<ModelPickerRow
								{type}
								bind:setting={settings[type]}
								error={errors[type] || {}}
								groupedModels={getGroupedModels()}
								{prompts}
								onModelChange={(modelId) => validateModelField(type, modelId)}
								onValidate={(field, value, immediate) =>
									validateField(type, field, value, immediate)}
								onReset={() => handleReset(type)}
							/>
						{/each}

						<!-- Council row -->
						<CouncilRepeater
							bind:agents={councilAgents}
							{errors}
							groupedModels={getGroupedModels()}
							{prompts}
							onValidate={validateCouncilAgentField}
						/>
					</tbody>
				</table>
			</div>
		{/if}
	</CardContent>
</Card>
