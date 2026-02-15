<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import ValidationSummary from './validation-summary.svelte';
	import ModelPickerRow from './model-picker-row.svelte';
	import CouncilRepeater from './council-repeater.svelte';
	import {
		validateFunctionField,
		validateMaxTokens,
		validateTemperature
	} from '$lib/validators/function-settings';

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

	interface CouncilAgent {
		id: string;
		modelId: string;
		temperature: number;
		maxTokens: number;
		promptId?: number | null;
	}

	interface PromptOption {
		id: number;
		title: string;
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
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	let settings = $state<Record<FunctionType, FunctionSetting>>({
		executor: { functionType: 'executor', modelId: '', temperature: 0.7, maxTokens: 4096 },
		judge: { functionType: 'judge', modelId: '', temperature: 0.3, maxTokens: 2048 },
		improve: { functionType: 'improve', modelId: '', temperature: 0.7, maxTokens: 4096 }
	});
	let councilAgents = $state<CouncilAgent[]>([
		{ id: crypto.randomUUID(), modelId: '', temperature: 0.5, maxTokens: 8192 },
		{ id: crypto.randomUUID(), modelId: '', temperature: 0.5, maxTokens: 8192 }
	]);
	let errors = $state<Record<string, Record<string, string>>>({});
	let groupedModels = $state<ProviderGroup[]>([]);
	let prompts = $state<PromptOption[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let connectionError = $state<string | null>(null);

	const debounceTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
	const rowTypes: FunctionType[] = ['executor', 'judge', 'improve'];
	let hasErrors = $derived(
		Object.values(errors).some((fieldErrors) => Object.keys(fieldErrors).length > 0)
	);

	function updateFieldError(functionType: string, field: string, message: string | null): void {
		if (message) {
			errors = {
				...errors,
				[functionType]: {
					...(errors[functionType] || {}),
					[field]: message
				}
			};
			return;
		}

		if (!errors[functionType]?.[field]) {
			return;
		}

		const { [field]: _discardedField, ...remainingFieldErrors } = errors[functionType];
		if (Object.keys(remainingFieldErrors).length === 0) {
			const { [functionType]: _discardedType, ...remainingErrors } = errors;
			errors = remainingErrors;
			return;
		}

		errors = {
			...errors,
			[functionType]: remainingFieldErrors
		};
	}

	function createDebounce(key: string, callback: () => void, delay: number): void {
		const existing = debounceTimeouts.get(key);
		if (existing) {
			clearTimeout(existing);
		}
		const timeout = setTimeout(callback, delay);
		debounceTimeouts.set(key, timeout);
	}

	function getFieldError(field: SettingField, value: unknown): string | null {
		if (field === 'modelId') {
			if (typeof value !== 'string' || value.trim() === '') {
				return null;
			}
			return validateFunctionField('modelId', value);
		}

		if (field === 'temperature') {
			return validateTemperature(Number(value));
		}

		return validateMaxTokens(Number(value));
	}

	function validateField(
		functionType: string,
		field: SettingField,
		value: unknown,
		immediate = false
	): void {
		const runValidation = () => {
			updateFieldError(functionType, field, getFieldError(field, value));
		};

		if (immediate) {
			runValidation();
			return;
		}

		createDebounce(`${functionType}:${field}`, runValidation, 300);
	}

	function validateCouncilAgentField(
		agentId: string,
		field: string,
		value: unknown,
		immediate = false
	): void {
		if (field !== 'modelId' && field !== 'temperature' && field !== 'maxTokens') {
			return;
		}

		validateField(`agent-${agentId}`, field, value, immediate);
	}

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
				const providerRecord = provider as {
					id?: unknown;
					name?: unknown;
					models?: unknown;
				};

				const modelList = Array.isArray(providerRecord.models)
					? providerRecord.models
					: Object.values((providerRecord.models as Record<string, unknown>) || {});

				const models = modelList
					.map((model) => model as { id?: unknown; name?: unknown })
					.filter((model) => typeof model.id === 'string' && model.id.length > 0)
					.map((model) => ({
						id: model.id as string,
						name:
							typeof model.name === 'string' && model.name.trim().length > 0
								? model.name
								: (model.id as string)
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

	async function loadData(): Promise<void> {
		try {
			const [catalogRes, settingsRes, promptsRes] = await Promise.all([
				fetch('/api/opencode/providers'),
				fetch('/api/admin/function-defaults'),
				fetch('/api/prompts?limit=200')
			]);

			if (catalogRes.ok) {
				groupedModels = normalizeProviderGroups(await catalogRes.json());
				connectionError = null;
			} else {
				const errorData = (await catalogRes.json()) as { message?: string };
				connectionError = errorData.message || 'OpenCode not connected';
			}

			const settingsData = (await settingsRes.json()) as {
				data?: Array<{
					id: number;
					functionType: string;
					modelId: string | null;
					temperature: number;
					maxTokens: number;
					promptId: number | null;
				}>;
			};

			for (const setting of settingsData.data || []) {
				if (setting.functionType === 'council') {
					continue;
				}

				if (
					setting.functionType === 'executor' ||
					setting.functionType === 'judge' ||
					setting.functionType === 'improve'
				) {
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

			const promptsData = (await promptsRes.json()) as {
				data?: { prompts?: PromptOption[] };
			};
			prompts = promptsData.data?.prompts || [];
		} catch (err) {
			console.error('Failed to load function settings data:', err);
			toast.error('Failed to load settings');
		} finally {
			isLoading = false;
		}
	}

	async function handleSave(): Promise<void> {
		if (hasErrors || isSaving) {
			return;
		}

		isSaving = true;

		try {
			const saveRows = rowTypes.map(async (type) => {
				const setting = settings[type];
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
					throw new Error(`Failed to save ${type}`);
				}
			});

			await Promise.all(saveRows);

			const configuredCouncilAgents = councilAgents.filter((agent) => agent.modelId);
			if (configuredCouncilAgents.length > 0) {
				const firstAgent = configuredCouncilAgents[0];
				const councilResponse = await fetch('/api/admin/function-defaults/council', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						modelId: firstAgent.modelId,
						temperature: firstAgent.temperature,
						maxTokens: firstAgent.maxTokens,
						promptId: firstAgent.promptId
					})
				});

				if (!councilResponse.ok) {
					throw new Error('Failed to save council defaults');
				}
			}

			toast.success('Function defaults saved');
		} catch (err) {
			console.error('Failed to save function defaults:', err);
			toast.error('Failed to save settings', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			isSaving = false;
		}
	}

	async function handleReset(functionType: FunctionType): Promise<void> {
		try {
			const response = await fetch(`/api/admin/function-defaults/${functionType}/reset`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`Failed to reset ${functionType}`);
			}

			const result = (await response.json()) as {
				data: {
					modelId: string | null;
					temperature: number;
					maxTokens: number;
					promptId: number | null;
				};
			};

			settings[functionType] = {
				...settings[functionType],
				modelId: result.data.modelId || '',
				temperature: result.data.temperature,
				maxTokens: result.data.maxTokens,
				promptId: result.data.promptId
			};

			const { [functionType]: _ignored, ...remainingErrors } = errors;
			errors = remainingErrors;
			toast.success(`${functionType} defaults reset`);
		} catch (err) {
			console.error('Failed to reset function defaults:', err);
			toast.error(`Failed to reset ${functionType}`);
		}
	}

	onMount(() => {
		loadData();
	});
</script>

<div class={className}>
	{#if isLoading}
		<div class="flex items-center gap-2 text-muted-foreground">
			<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
			<span>Loading function defaults...</span>
		</div>
	{:else}
		{#if connectionError}
			<div
				class="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
			>
				{connectionError}. Configure OpenCode connection to load model options.
			</div>
		{/if}

		<ValidationSummary {errors} class="mb-4" />

		<div class="overflow-x-auto rounded-md border">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b bg-muted/30">
						<th class="px-4 py-3 text-left font-medium">Function</th>
						<th class="px-4 py-3 text-left font-medium">Model</th>
						<th class="px-4 py-3 text-left font-medium">Temperature</th>
						<th class="px-4 py-3 text-left font-medium">Max Tokens</th>
						<th class="px-4 py-3 text-left font-medium">Prompt</th>
						<th class="px-4 py-3 text-left font-medium">Reset</th>
					</tr>
				</thead>
				<tbody>
					{#each rowTypes as type}
						<ModelPickerRow
							{type}
							bind:setting={settings[type]}
							error={errors[type] || {}}
							{groupedModels}
							{prompts}
							onModelChange={(modelId) => validateField(type, 'modelId', modelId, true)}
							onValidate={(field, value, immediate) => validateField(type, field, value, immediate)}
							onReset={() => handleReset(type)}
						/>
					{/each}

					<CouncilRepeater
						bind:agents={councilAgents}
						{errors}
						{groupedModels}
						{prompts}
						onValidate={validateCouncilAgentField}
					/>
				</tbody>
			</table>
		</div>

		<div class="mt-4 flex justify-end">
			<Button onclick={handleSave} disabled={hasErrors || isSaving}>
				{isSaving ? 'Saving...' : 'Save Settings'}
			</Button>
		</div>
	{/if}
</div>
