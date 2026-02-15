<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import ValidationSummary from './validation-summary.svelte';
	import ModelPickerRow from './model-picker-row.svelte';
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
	let prompts = $state<PromptOption[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);

	const rowTypes: FunctionType[] = ['executor', 'judge', 'improve'];
	const fieldDebounce = new Map<string, ReturnType<typeof setTimeout>>();

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
			const [settingsRes, promptsRes, councilRes] = await Promise.all([
				fetch('/api/admin/function-defaults'),
				fetch('/api/prompts?limit=200'),
				fetch('/api/admin/function-defaults/council')
			]);

			const [settingsText, promptsText, councilText] = await Promise.all([
				settingsRes.text(),
				promptsRes.text(),
				councilRes.text()
			]);

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
				console.warn('Function defaults unavailable:', parseApiError(settingsText));
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

	onMount(() => {
		void loadData();
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
						<ModelPickerRow
							{type}
							bind:setting={settings[type]}
							error={errors[type] || {}}
							{prompts}
							onValidate={(field, value, immediate) => validateField(type, field, value, immediate)}
							onReset={() => handleReset(type)}
						/>
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
