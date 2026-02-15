<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import ValidationSummary from './validation-summary.svelte';
	import {
		validateFunctionField,
		validateMaxTokens,
		validateTemperature
	} from '$lib/validators/function-settings';

	type FunctionType = 'executor' | 'judge' | 'improve';
	type SettingField = 'modelId' | 'temperature' | 'maxTokens';

	interface FunctionSetting {
		modelId: string;
		temperature: number;
		maxTokens: number;
		promptId: number | null;
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
		executor: { modelId: '', temperature: 0.7, maxTokens: 4096, promptId: null },
		judge: { modelId: '', temperature: 0.3, maxTokens: 2048, promptId: null },
		improve: { modelId: '', temperature: 0.7, maxTokens: 4096, promptId: null }
	});

	let councilConfiguredAgents = $state(0);
	let errors = $state<Record<string, Record<string, string>>>({});
	let groupedModels = $state<ProviderGroup[]>([]);
	let prompts = $state<PromptOption[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);

	const rowTypes: FunctionType[] = ['executor', 'judge', 'improve'];
	const fieldDebounce = new Map<string, ReturnType<typeof setTimeout>>();

	let hasErrors = $derived(
		Object.values(errors).some((fieldErrors) => Object.keys(fieldErrors).length > 0)
	);

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
				const modelsSource = Array.isArray(providerRecord.models)
					? providerRecord.models
					: Object.values((providerRecord.models as Record<string, unknown>) || {});

				const models = modelsSource
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
		const existing = fieldDebounce.get(key);
		if (existing) {
			clearTimeout(existing);
		}
		const timeout = setTimeout(callback, delay);
		fieldDebounce.set(key, timeout);
	}

	function getFieldError(field: SettingField, value: unknown): string | null {
		if (field === 'modelId') {
			return validateFunctionField('modelId', typeof value === 'string' ? value : '');
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

	function parseApiError(payload: string): string {
		if (!payload || payload.trim().length === 0) return 'Request failed';
		const normalized = payload.trimStart().toLowerCase();
		if (normalized.startsWith('<!doctype') || normalized.startsWith('<html')) {
			return 'Login required. Open /login and refresh this page.';
		}

		try {
			const parsed = JSON.parse(payload) as { message?: string; error?: string };
			return parsed.message || parsed.error || payload;
		} catch {
			return payload;
		}
	}

	function validateRequiredModels(): boolean {
		let isValid = true;

		for (const type of rowTypes) {
			const message = getFieldError('modelId', settings[type].modelId);
			updateFieldError(type, 'modelId', message);
			if (message) {
				isValid = false;
			}
		}

		return isValid;
	}

	async function loadData(): Promise<void> {
		try {
			const [catalogRes, settingsRes, promptsRes, councilRes] = await Promise.all([
				fetch('/api/opencode/providers'),
				fetch('/api/admin/function-defaults'),
				fetch('/api/prompts?limit=200'),
				fetch('/api/admin/function-defaults/council')
			]);

			const [catalogText, settingsText, promptsText, councilText] = await Promise.all([
				catalogRes.text(),
				settingsRes.text(),
				promptsRes.text(),
				councilRes.text()
			]);

			const settingsError = parseApiError(settingsText);

			if (catalogRes.ok) {
				groupedModels = normalizeProviderGroups(JSON.parse(catalogText));
			}

			if (settingsRes.ok) {
				const settingsData = JSON.parse(settingsText) as {
					data?: Array<{
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
							modelId: setting.modelId || '',
							temperature: setting.temperature,
							maxTokens: setting.maxTokens,
							promptId: setting.promptId ?? null
						};
					}
				}
			} else {
				console.warn('Function defaults unavailable:', settingsError || settingsRes.statusText);
			}

			if (promptsRes.ok) {
				const promptsData = JSON.parse(promptsText) as {
					data?: { prompts?: PromptOption[] };
				};
				prompts = promptsData.data?.prompts || [];
			}

			if (councilRes.ok) {
				const councilData = JSON.parse(councilText) as {
					data?: {
						agents?: Array<{
							modelId: string;
						}>;
					};
				};
				councilConfiguredAgents = (councilData.data?.agents || []).filter(
					(agent) => typeof agent.modelId === 'string' && agent.modelId.trim().length > 0
				).length;
			}

			validateRequiredModels();
		} catch (err) {
			console.error('Failed to load function settings data:', err);
			toast.error('Failed to load settings');
		} finally {
			isLoading = false;
		}
	}

	async function handleSave(): Promise<void> {
		if (isSaving) {
			return;
		}

		if (!validateRequiredModels()) {
			toast.error('Selecteer eerst een model voor Executor, Judge en Improve.');
			return;
		}

		if (hasErrors) {
			toast.error('Please resolve validation errors before saving.');
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
						modelId: setting.modelId,
						temperature: setting.temperature,
						maxTokens: setting.maxTokens,
						promptId: setting.promptId ?? null
					})
				});

				if (!response.ok) {
					throw new Error(parseApiError(await response.text()) || `Failed to save ${type}`);
				}
			});

			await Promise.all(saveRows);

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

	function handleReset(functionType: FunctionType): void {
		const defaults: Record<FunctionType, FunctionSetting> = {
			executor: { modelId: '', temperature: 0.7, maxTokens: 4096, promptId: null },
			judge: { modelId: '', temperature: 0.3, maxTokens: 2048, promptId: null },
			improve: { modelId: '', temperature: 0.7, maxTokens: 4096, promptId: null }
		};
		settings[functionType] = { ...defaults[functionType] };
		const { [functionType]: _discarded, ...rest } = errors;
		errors = rest;
		toast.success(`${functionType} reset to defaults`);
	}

	function updateSetting(
		functionType: FunctionType,
		field: keyof FunctionSetting,
		value: string
	): void {
		if (field === 'temperature') {
			settings[functionType].temperature = Number(value);
			validateField(functionType, 'temperature', settings[functionType].temperature);
			return;
		}

		if (field === 'maxTokens') {
			settings[functionType].maxTokens = Number(value);
			validateField(functionType, 'maxTokens', settings[functionType].maxTokens);
			return;
		}

		if (field === 'promptId') {
			settings[functionType].promptId = value ? Number(value) : null;
			return;
		}

		settings[functionType].modelId = value;
		validateField(functionType, 'modelId', value, true);
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
		<ValidationSummary {errors} class="mb-4" />

		<div class="overflow-x-auto rounded-lg border">
			<table class="w-full text-sm">
				<thead>
					<tr class="bg-muted/40">
						<th class="px-3 py-2 text-left font-medium">Function</th>
						<th class="px-3 py-2 text-left font-medium">Model</th>
						<th class="px-3 py-2 text-left font-medium">Temperature</th>
						<th class="px-3 py-2 text-left font-medium">Max Tokens</th>
						<th class="px-3 py-2 text-left font-medium">Prompt</th>
						<th class="px-3 py-2 text-left font-medium">Reset</th>
					</tr>
				</thead>
				<tbody>
					{#each rowTypes as type}
						<tr class="border-t align-top">
							<td class="px-3 py-2 font-medium capitalize">
								{type}
								<div
									class="mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground"
								>
									default
								</div>
							</td>
							<td class="px-3 py-2">
								<select
									class="h-9 w-full rounded-md border border-input bg-background px-2"
									class:border-destructive={Boolean(errors[type]?.modelId)}
									value={settings[type].modelId}
									onchange={(event) =>
										updateSetting(type, 'modelId', (event.target as HTMLSelectElement).value)}
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
								{#if errors[type]?.modelId}
									<div class="mt-1 text-xs text-destructive">{errors[type].modelId}</div>
								{/if}
							</td>
							<td class="px-3 py-2">
								<input
									type="number"
									min="0"
									max="2"
									step="0.1"
									class="h-9 w-28 rounded-md border border-input bg-background px-2"
									class:border-destructive={Boolean(errors[type]?.temperature)}
									value={settings[type].temperature}
									onchange={(event) =>
										updateSetting(type, 'temperature', (event.target as HTMLInputElement).value)}
									onblur={() =>
										validateField(type, 'temperature', settings[type].temperature, true)}
								/>
							</td>
							<td class="px-3 py-2">
								<input
									type="number"
									min="1"
									max="1000000"
									step="1"
									class="h-9 w-36 rounded-md border border-input bg-background px-2"
									class:border-destructive={Boolean(errors[type]?.maxTokens)}
									value={settings[type].maxTokens}
									onchange={(event) =>
										updateSetting(type, 'maxTokens', (event.target as HTMLInputElement).value)}
									onblur={() => validateField(type, 'maxTokens', settings[type].maxTokens, true)}
								/>
							</td>
							<td class="px-3 py-2">
								<select
									class="h-9 w-full rounded-md border border-input bg-background px-2"
									value={settings[type].promptId ?? ''}
									onchange={(event) =>
										updateSetting(type, 'promptId', (event.target as HTMLSelectElement).value)}
								>
									<option value="">None</option>
									{#each prompts as prompt}
										<option value={prompt.id}>{prompt.title}</option>
									{/each}
								</select>
							</td>
							<td class="px-3 py-2">
								<Button variant="outline" size="sm" onclick={() => handleReset(type)}>Reset</Button>
							</td>
						</tr>
					{/each}
					<tr class="border-t bg-muted/20">
						<td class="px-3 py-2 font-medium">Council</td>
						<td colspan="5" class="px-3 py-2 text-sm text-muted-foreground">
							Council repeater setup is available in the next task. Current configured agents: {councilConfiguredAgents}.
						</td>
					</tr>
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
