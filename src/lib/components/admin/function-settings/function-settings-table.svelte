<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { getCachedModelCatalog, setCachedModelCatalog } from '$lib/client/model-catalog-cache';
	import ValidationSummary from './validation-summary.svelte';
	import ModelPickerRow from './model-picker-row.svelte';
	import CouncilRepeater from './council-repeater.svelte';
	import {
		validateFunctionField,
		validateMaxTokens,
		validateTemperature
	} from '$lib/validators/function-settings';

	type FunctionType = 'executor' | 'judge' | 'improve';
	type PolicyScope = FunctionType | 'council';
	type SettingField = 'modelId' | 'modelVariant' | 'temperature' | 'maxTokens';

	interface FunctionSetting {
		id?: number;
		functionType: FunctionType;
		modelId: string;
		modelVariant?: string | null;
		temperature: number;
		maxTokens: number;
		promptId?: number | null;
	}

	interface CouncilAgent {
		id: string;
		modelId: string;
		modelVariant?: string | null;
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
		variantOptions?: string[];
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
		executor: {
			functionType: 'executor',
			modelId: '',
			modelVariant: null,
			temperature: 0.7,
			maxTokens: 4096
		},
		judge: {
			functionType: 'judge',
			modelId: '',
			modelVariant: null,
			temperature: 0.3,
			maxTokens: 2048
		},
		improve: {
			functionType: 'improve',
			modelId: '',
			modelVariant: null,
			temperature: 0.7,
			maxTokens: 4096
		}
	});
	let councilAgents = $state<CouncilAgent[]>([
		{ id: crypto.randomUUID(), modelId: '', modelVariant: null, temperature: 0.5, maxTokens: 8192 },
		{ id: crypto.randomUUID(), modelId: '', modelVariant: null, temperature: 0.5, maxTokens: 8192 }
	]);
	let errors = $state<Record<string, Record<string, string>>>({});
	let groupedModels = $state<ProviderGroup[]>([]);
	let allowedModelIds = $state<string[]>([]);
	let allowedModelMatrix = $state<Record<string, Record<PolicyScope, boolean>>>({});
	let allowedModelVariants = $state<Record<string, string[]>>({});
	let prompts = $state<PromptOption[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let connectionError = $state<string | null>(null);
	let authRequired = $state(false);
	let initialSnapshot = $state('');

	const debounceTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
	const rowTypes: FunctionType[] = ['executor', 'judge', 'improve'];
	let hasAllowlist = $derived(allowedModelIds.length > 0);
	let hasPolicyMatrix = $derived(Object.keys(allowedModelMatrix).length > 0);
	let hasVariantPolicy = $derived(Object.keys(allowedModelVariants).length > 0);
	let allowedModelSet = $derived(new Set(allowedModelIds));
	let hasErrors = $derived(
		Object.values(errors).some((fieldErrors) => Object.keys(fieldErrors).length > 0)
	);
	let configuredCouncilAgentCount = $derived(
		councilAgents.filter((agent) => agent.modelId.trim().length > 0).length
	);
	let snapshot = $derived(buildSnapshot());
	let hasUnsavedChanges = $derived(snapshot !== initialSnapshot);
	function filterAllowedVariants(modelId: string, variantOptions?: string[]): string[] | undefined {
		if (!variantOptions || variantOptions.length === 0) {
			return undefined;
		}

		const allowedVariants = allowedModelVariants[modelId];
		if (!Array.isArray(allowedVariants) || allowedVariants.length === 0) {
			return variantOptions;
		}

		const allowedSet = new Set(allowedVariants);
		const filtered = variantOptions.filter((variant) => allowedSet.has(variant));
		return filtered.length > 0 ? filtered : [variantOptions[0]];
	}

	let allGroupedModelsWithVariantPolicy = $derived.by(() => {
		return groupedModels.map((provider) => ({
			...provider,
			models: provider.models.map((model) => ({
				...model,
				variantOptions: filterAllowedVariants(model.id, model.variantOptions)
			}))
		}));
	});

	let displayGroupedModelsByScope = $derived.by(() => {
		const filterByScope = (scope: PolicyScope): ProviderGroup[] => {
			if (!hasAllowlist && !hasPolicyMatrix) {
				return groupedModels.map((provider) => ({
					...provider,
					models: provider.models.map((model) => ({
						...model,
						variantOptions: filterAllowedVariants(model.id, model.variantOptions)
					}))
				}));
			}

			return groupedModels
				.map((provider) => ({
					...provider,
					models: provider.models
						.filter((model) => isModelAllowedByPolicy(model.id, scope))
						.map((model) => ({
							...model,
							variantOptions: filterAllowedVariants(model.id, model.variantOptions)
						}))
				}))
				.filter((provider) => provider.models.length > 0);
		};

		return {
			executor: filterByScope('executor'),
			judge: filterByScope('judge'),
			improve: filterByScope('improve'),
			council: filterByScope('council')
		};
	});

	function parsePolicyMatrix(raw: string): Record<string, Record<PolicyScope, boolean>> {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				return {};
			}

			const matrix: Record<string, Record<PolicyScope, boolean>> = {};
			for (const [modelId, scopes] of Object.entries(parsed as Record<string, unknown>)) {
				if (typeof modelId !== 'string' || modelId.trim().length === 0) {
					continue;
				}

				const scopeRecord =
					typeof scopes === 'object' && scopes !== null && !Array.isArray(scopes)
						? (scopes as Record<string, unknown>)
						: {};

				matrix[modelId] = {
					executor: Boolean(scopeRecord.executor),
					judge: Boolean(scopeRecord.judge),
					improve: Boolean(scopeRecord.improve),
					council: Boolean(scopeRecord.council)
				};
			}

			return matrix;
		} catch {
			return {};
		}
	}

	function parseAllowedModelVariants(raw: string): Record<string, string[]> {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				return {};
			}

			const variantMap: Record<string, string[]> = {};
			for (const [modelId, variants] of Object.entries(parsed as Record<string, unknown>)) {
				if (
					typeof modelId !== 'string' ||
					modelId.trim().length === 0 ||
					!Array.isArray(variants)
				) {
					continue;
				}

				const normalizedVariants = Array.from(
					new Set(
						variants.filter(
							(value): value is string => typeof value === 'string' && value.trim().length > 0
						)
					)
				);

				if (normalizedVariants.length > 0) {
					variantMap[modelId] = normalizedVariants;
				}
			}

			return variantMap;
		} catch {
			return {};
		}
	}

	function isModelAllowedByPolicy(modelId: string, scope: PolicyScope): boolean {
		if (!hasAllowlist && !hasPolicyMatrix) {
			return true;
		}

		if (hasAllowlist && !allowedModelSet.has(modelId)) {
			return false;
		}

		if (!hasPolicyMatrix) {
			return true;
		}

		const scopeMatrix = allowedModelMatrix[modelId];
		if (!scopeMatrix) {
			return false;
		}

		return Boolean(scopeMatrix[scope]);
	}

	function getScopeLabel(scope: PolicyScope): string {
		if (scope === 'council') {
			return 'Council Agent';
		}
		return scope[0].toUpperCase() + scope.slice(1);
	}

	function getModelVariantOptions(modelId: string): string[] {
		if (!modelId) {
			return [];
		}

		for (const provider of groupedModels) {
			const model = provider.models.find((entry) => entry.id === modelId);
			if (model?.variantOptions && model.variantOptions.length > 0) {
				return filterAllowedVariants(modelId, model.variantOptions) || [];
			}
		}

		return [];
	}

	function normalizeVariantForModel(
		modelId: string,
		modelVariant: string | null | undefined
	): string | null {
		const variantOptions = getModelVariantOptions(modelId);
		if (variantOptions.length === 0) {
			return null;
		}

		if (typeof modelVariant === 'string' && variantOptions.includes(modelVariant)) {
			return modelVariant;
		}

		return variantOptions[0];
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
		const existing = debounceTimeouts.get(key);
		if (existing) {
			clearTimeout(existing);
		}
		const timeout = setTimeout(callback, delay);
		debounceTimeouts.set(key, timeout);
	}

	function getFieldError(field: SettingField, value: unknown, scope: PolicyScope): string | null {
		if (field === 'modelId') {
			const modelId = typeof value === 'string' ? value : '';
			const requiredError = validateFunctionField('modelId', modelId);
			if (requiredError) {
				return requiredError;
			}

			if (!isModelAllowedByPolicy(modelId, scope)) {
				return `Model is not allowed by AI Policy for ${getScopeLabel(scope)}`;
			}

			return null;
		}

		if (field === 'modelVariant') {
			const payload =
				typeof value === 'object' && value !== null
					? (value as { modelId?: unknown; modelVariant?: unknown })
					: {};
			const modelId = typeof payload.modelId === 'string' ? payload.modelId : '';
			const modelVariant = typeof payload.modelVariant === 'string' ? payload.modelVariant : null;

			if (!modelId) {
				return null;
			}

			const variantOptions = getModelVariantOptions(modelId);
			if (variantOptions.length === 0) {
				return null;
			}

			if (!modelVariant || modelVariant.trim().length === 0) {
				return 'Variant is required for selected model';
			}

			if (!variantOptions.includes(modelVariant)) {
				return 'Variant is not supported by selected model';
			}

			return null;
		}

		if (field === 'temperature') {
			return validateTemperature(Number(value));
		}

		return validateMaxTokens(Number(value));
	}

	function validateField(
		functionType: string,
		field: SettingField,
		scope: PolicyScope,
		value: unknown,
		immediate = false
	): void {
		const runValidation = () => {
			updateFieldError(functionType, field, getFieldError(field, value, scope));
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
		if (
			field !== 'modelId' &&
			field !== 'modelVariant' &&
			field !== 'temperature' &&
			field !== 'maxTokens'
		) {
			return;
		}

		validateField(`agent-${agentId}`, field, 'council', value, immediate);
	}

	function normalizeProviderGroups(payload: unknown): ProviderGroup[] {
		const providers =
			typeof payload === 'object' && payload !== null && 'providers' in payload
				? (payload as { providers?: unknown[] }).providers
				: [];

		if (!Array.isArray(providers)) {
			return [];
		}

		const normalizeVariantOptions = (modelId: string, model: Record<string, unknown>): string[] => {
			const candidates: unknown[] = [
				model.variants,
				model.variantOptions,
				model.variant_options,
				model.reasoningEffortLevels,
				model.reasoning_effort_levels,
				typeof model.reasoning === 'object' && model.reasoning !== null
					? (model.reasoning as Record<string, unknown>).levels
					: undefined
			];

			for (const candidate of candidates) {
				if (Array.isArray(candidate)) {
					const values = candidate.filter(
						(value): value is string => typeof value === 'string' && value.trim().length > 0
					);
					if (values.length > 0) {
						return Array.from(new Set(values));
					}
				}
			}

			if (modelId.toLowerCase().includes('codex')) {
				return ['default', 'low', 'medium', 'high', 'xhigh'];
			}

			return [];
		};

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
					.map((model) => model as Record<string, unknown>)
					.filter((model) => typeof model.id === 'string' && model.id.length > 0)
					.map((model) => {
						const modelId = model.id as string;
						const variantOptions = normalizeVariantOptions(modelId, model);

						return {
							id: modelId,
							name:
								typeof model.name === 'string' && model.name.trim().length > 0
									? (model.name as string)
									: modelId,
							variantOptions: variantOptions.length > 0 ? variantOptions : undefined
						};
					});

				return {
					providerName: typeof providerRecord.name === 'string' ? providerRecord.name : 'Unknown',
					providerId: typeof providerRecord.id === 'string' ? providerRecord.id : 'unknown',
					models
				};
			})
			.filter((provider) => provider.models.length > 0)
			.sort((a, b) => a.providerName.localeCompare(b.providerName));
	}

	function parseApiError(payload: string): string {
		if (!payload || payload.trim().length === 0) {
			return 'Request failed';
		}

		const normalized = payload.trimStart().toLowerCase();
		if (normalized.startsWith('<!doctype') || normalized.startsWith('<html')) {
			return 'Login required. Open /login and refresh this page.';
		}

		try {
			const parsed = JSON.parse(payload) as {
				message?: unknown;
				error?: unknown;
				errors?: unknown;
			};

			const rawMessage =
				typeof parsed.message === 'string'
					? parsed.message
					: typeof parsed.error === 'string'
						? parsed.error
						: null;

			if (rawMessage && rawMessage.trim().startsWith('{')) {
				try {
					const nested = JSON.parse(rawMessage) as {
						message?: string;
						errors?: Record<string, string> | string[] | string;
					};

					if (nested.errors && typeof nested.errors === 'object' && !Array.isArray(nested.errors)) {
						const messages = Object.values(nested.errors).filter(
							(value): value is string => typeof value === 'string' && value.length > 0
						);
						if (messages.length > 0) {
							return messages.join(', ');
						}
					}

					if (Array.isArray(nested.errors) && nested.errors.length > 0) {
						return nested.errors.join(', ');
					}

					if (typeof nested.errors === 'string') {
						return nested.errors;
					}

					if (nested.message) {
						return nested.message;
					}
				} catch {
					// Keep raw message fallback
				}
			}

			if (parsed.errors && typeof parsed.errors === 'object' && !Array.isArray(parsed.errors)) {
				const messages = Object.values(parsed.errors as Record<string, unknown>).filter(
					(value): value is string => typeof value === 'string' && value.length > 0
				);
				if (messages.length > 0) {
					return messages.join(', ');
				}
			}

			if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
				return parsed.errors.join(', ');
			}

			if (typeof parsed.errors === 'string') {
				return parsed.errors;
			}

			return rawMessage || payload;
		} catch {
			return payload;
		}
	}

	function buildSnapshot(): string {
		const functionState = rowTypes.map((type) => ({
			type,
			modelId: settings[type].modelId,
			modelVariant: settings[type].modelVariant ?? null,
			temperature: settings[type].temperature,
			maxTokens: settings[type].maxTokens,
			promptId: settings[type].promptId ?? null
		}));

		const councilState = councilAgents
			.filter((agent) => agent.modelId.trim().length > 0)
			.map((agent) => ({
				modelId: agent.modelId,
				modelVariant: agent.modelVariant ?? null,
				temperature: agent.temperature,
				maxTokens: agent.maxTokens,
				promptId: agent.promptId ?? null
			}));

		return JSON.stringify({ functionState, councilState });
	}

	function validateRequiredModels(): boolean {
		let isValid = true;

		for (const type of rowTypes) {
			const message = getFieldError('modelId', settings[type].modelId, type);
			updateFieldError(type, 'modelId', message);
			if (message) {
				isValid = false;
			}

			const variantError = getFieldError(
				'modelVariant',
				{ modelId: settings[type].modelId, modelVariant: settings[type].modelVariant ?? null },
				type
			);
			updateFieldError(type, 'modelVariant', variantError);
			if (variantError) {
				isValid = false;
			}
		}

		return isValid;
	}

	function validateCouncilAgents(): boolean {
		let isValid = true;

		for (const agent of councilAgents) {
			if (!agent.modelId) {
				continue;
			}

			const modelError = getFieldError('modelId', agent.modelId, 'council');
			updateFieldError(`agent-${agent.id}`, 'modelId', modelError);
			if (modelError) {
				isValid = false;
			}

			const variantError = getFieldError(
				'modelVariant',
				{ modelId: agent.modelId, modelVariant: agent.modelVariant ?? null },
				'council'
			);
			updateFieldError(`agent-${agent.id}`, 'modelVariant', variantError);
			if (variantError) {
				isValid = false;
			}
		}

		return isValid;
	}

	function applyVariantDefaults(): void {
		if (groupedModels.length === 0) {
			return;
		}

		for (const type of rowTypes) {
			const normalizedVariant = normalizeVariantForModel(
				settings[type].modelId,
				settings[type].modelVariant
			);
			if ((settings[type].modelVariant ?? null) !== normalizedVariant) {
				settings[type].modelVariant = normalizedVariant;
			}
		}

		let didChangeCouncil = false;
		const normalizedCouncilAgents = councilAgents.map((agent) => {
			const normalizedVariant = normalizeVariantForModel(agent.modelId, agent.modelVariant);
			if ((agent.modelVariant ?? null) === normalizedVariant) {
				return agent;
			}

			didChangeCouncil = true;
			return {
				...agent,
				modelVariant: normalizedVariant
			};
		});

		if (didChangeCouncil) {
			councilAgents = normalizedCouncilAgents;
		}
	}

	async function loadData(): Promise<void> {
		try {
			authRequired = false;

			const cachedCatalogPayload = getCachedModelCatalog();
			if (cachedCatalogPayload) {
				groupedModels = normalizeProviderGroups(cachedCatalogPayload);
				connectionError = null;
			}

			const [catalogRes, settingsRes, promptsRes, councilRes, policyRes] = await Promise.all([
				cachedCatalogPayload ? null : fetch('/api/opencode/providers'),
				fetch('/api/admin/function-defaults'),
				fetch('/api/prompts?limit=200'),
				fetch('/api/admin/function-defaults/council'),
				fetch('/api/admin/settings')
			]);

			const [catalogText, settingsText, promptsText, councilText, policyText] = await Promise.all([
				catalogRes ? catalogRes.text() : Promise.resolve(''),
				settingsRes.text(),
				promptsRes.text(),
				councilRes.text(),
				policyRes.text()
			]);

			const settingsError = parseApiError(settingsText);
			const promptsError = parseApiError(promptsText);
			const councilError = parseApiError(councilText);
			const policyError = parseApiError(policyText);

			if (
				settingsRes.redirected ||
				settingsRes.url.includes('/login') ||
				promptsRes.redirected ||
				promptsRes.url.includes('/login') ||
				councilRes.redirected ||
				councilRes.url.includes('/login') ||
				policyRes.redirected ||
				policyRes.url.includes('/login') ||
				settingsRes.status === 401 ||
				promptsRes.status === 401 ||
				councilRes.status === 401 ||
				policyRes.status === 401 ||
				settingsError.startsWith('Login required') ||
				promptsError.startsWith('Login required') ||
				councilError.startsWith('Login required') ||
				policyError.startsWith('Login required')
			) {
				authRequired = true;
			}

			if (policyRes.ok && !policyError.startsWith('Login required')) {
				const policyData = JSON.parse(policyText) as {
					data?: {
						models?: {
							opencode_allowed_models?: string;
							opencode_allowed_models_matrix?: string;
							opencode_allowed_model_variants?: string;
						};
					};
				};

				const rawAllowlist = policyData.data?.models?.opencode_allowed_models || '[]';
				const rawPolicyMatrix = policyData.data?.models?.opencode_allowed_models_matrix || '{}';
				const rawAllowedModelVariants =
					policyData.data?.models?.opencode_allowed_model_variants || '{}';
				try {
					const parsedAllowlist = JSON.parse(rawAllowlist) as unknown;
					const parsedPolicyMatrix = parsePolicyMatrix(rawPolicyMatrix);
					const parsedAllowedModelVariants = parseAllowedModelVariants(rawAllowedModelVariants);
					if (Array.isArray(parsedAllowlist)) {
						const filteredAllowlist = parsedAllowlist.filter(
							(value): value is string => typeof value === 'string' && value.trim().length > 0
						);
						allowedModelIds = Array.from(
							new Set([
								...filteredAllowlist,
								...Object.keys(parsedPolicyMatrix),
								...Object.keys(parsedAllowedModelVariants)
							])
						);
					} else {
						allowedModelIds = Array.from(
							new Set([
								...Object.keys(parsedPolicyMatrix),
								...Object.keys(parsedAllowedModelVariants)
							])
						);
					}
					allowedModelMatrix = parsedPolicyMatrix;
					allowedModelVariants = parsedAllowedModelVariants;
				} catch {
					allowedModelIds = [];
					allowedModelMatrix = {};
					allowedModelVariants = {};
				}
			} else {
				allowedModelIds = [];
				allowedModelMatrix = {};
				allowedModelVariants = {};
			}

			if (catalogRes) {
				if (catalogRes.ok) {
					const parsedCatalog = JSON.parse(catalogText);
					setCachedModelCatalog(parsedCatalog);
					groupedModels = normalizeProviderGroups(parsedCatalog);
					connectionError = null;
				} else if (!cachedCatalogPayload) {
					connectionError = parseApiError(catalogText) || 'OpenCode not connected';
				}
			}

			if (settingsRes.ok && !settingsError.startsWith('Login required')) {
				const settingsData = JSON.parse(settingsText) as {
					data?: Array<{
						id: number;
						functionType: string;
						modelId: string | null;
						modelVariant?: string | null;
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
							modelVariant: setting.modelVariant ?? null,
							temperature: setting.temperature,
							maxTokens: setting.maxTokens,
							promptId: setting.promptId
						};
					}
				}
			} else {
				console.warn('Function defaults unavailable:', settingsError || settingsRes.statusText);
			}

			if (promptsRes.ok && !promptsError.startsWith('Login required')) {
				const promptsData = JSON.parse(promptsText) as {
					data?: { prompts?: PromptOption[] };
				};
				prompts = promptsData.data?.prompts || [];
			} else {
				prompts = [];
			}

			if (councilRes.ok && !councilError.startsWith('Login required')) {
				const councilData = JSON.parse(councilText) as {
					data?: {
						agents?: Array<{
							id?: number;
							modelId: string;
							modelVariant?: string | null;
							temperature: number;
							maxTokens: number;
							promptId?: number | null;
						}>;
					};
				};

				const persistedAgents = (councilData.data?.agents || [])
					.filter((agent) => typeof agent.modelId === 'string' && agent.modelId.trim().length > 0)
					.map((agent, index) => ({
						id: agent.id ? String(agent.id) : `persisted-${index}-${crypto.randomUUID()}`,
						modelId: agent.modelId,
						modelVariant: agent.modelVariant ?? null,
						temperature: agent.temperature,
						maxTokens: agent.maxTokens,
						promptId: agent.promptId ?? null
					}));

				if (persistedAgents.length === 0) {
					councilAgents = [
						{
							id: crypto.randomUUID(),
							modelId: '',
							modelVariant: null,
							temperature: 0.5,
							maxTokens: 8192
						},
						{
							id: crypto.randomUUID(),
							modelId: '',
							modelVariant: null,
							temperature: 0.5,
							maxTokens: 8192
						}
					];
				} else if (persistedAgents.length === 1) {
					councilAgents = [
						persistedAgents[0],
						{
							id: crypto.randomUUID(),
							modelId: '',
							modelVariant: null,
							temperature: 0.5,
							maxTokens: 8192
						}
					];
				} else {
					councilAgents = persistedAgents;
				}
			}

			applyVariantDefaults();

			validateRequiredModels();
			validateCouncilAgents();
			initialSnapshot = buildSnapshot();
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

		if (authRequired) {
			toast.error('Login required', {
				description: 'Open /login and refresh this page before saving settings.'
			});
			return;
		}

		const requiredModelsValid = validateRequiredModels();
		const councilModelsValid = validateCouncilAgents();

		if (!requiredModelsValid || !councilModelsValid) {
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
						modelVariant: setting.modelVariant ?? null,
						temperature: setting.temperature,
						maxTokens: setting.maxTokens,
						promptId: setting.promptId
					})
				});

				if (!response.ok) {
					const payload = await response.text();
					const message = parseApiError(payload);
					if (
						response.redirected ||
						response.url.includes('/login') ||
						response.status === 401 ||
						message.startsWith('Login required')
					) {
						authRequired = true;
						throw new Error('Login required. Open /login and refresh this page.');
					}

					throw new Error(message || `Failed to save ${type}`);
				}
			});

			await Promise.all(saveRows);

			const configuredCouncilAgents = councilAgents.filter(
				(agent) => agent.modelId.trim().length > 0
			);
			if (configuredCouncilAgents.length > 0) {
				const councilResponse = await fetch('/api/admin/function-defaults/council', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						agents: configuredCouncilAgents.map((agent) => ({
							modelId: agent.modelId,
							modelVariant: agent.modelVariant ?? null,
							temperature: agent.temperature,
							maxTokens: agent.maxTokens,
							promptId: agent.promptId ?? null
						}))
					})
				});

				if (!councilResponse.ok) {
					const payload = await councilResponse.text();
					const message = parseApiError(payload);
					if (
						councilResponse.redirected ||
						councilResponse.url.includes('/login') ||
						councilResponse.status === 401 ||
						message.startsWith('Login required')
					) {
						authRequired = true;
						throw new Error('Login required. Open /login and refresh this page.');
					}

					throw new Error(message || 'Failed to save council defaults');
				}

				const councilPayload = await councilResponse.json();
				const savedAgents =
					(councilPayload?.data?.agents as
						| Array<{
								id?: number;
								modelId: string;
								modelVariant?: string | null;
								temperature: number;
								maxTokens: number;
								promptId?: number | null;
						  }>
						| undefined) ?? [];

				if (savedAgents.length > 0) {
					councilAgents = savedAgents.map((agent, index) => ({
						id: agent.id ? String(agent.id) : `saved-${index}-${crypto.randomUUID()}`,
						modelId: agent.modelId,
						modelVariant: agent.modelVariant ?? null,
						temperature: agent.temperature,
						maxTokens: agent.maxTokens,
						promptId: agent.promptId ?? null
					}));
				}
			}

			initialSnapshot = buildSnapshot();

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
			if (authRequired) {
				throw new Error('Login required. Open /login and refresh this page.');
			}

			const response = await fetch(`/api/admin/function-defaults/${functionType}/reset`, {
				method: 'POST'
			});

			if (!response.ok) {
				const payload = await response.text();
				const message = parseApiError(payload);
				if (
					response.redirected ||
					response.url.includes('/login') ||
					response.status === 401 ||
					message.startsWith('Login required')
				) {
					authRequired = true;
					throw new Error('Login required. Open /login and refresh this page.');
				}

				throw new Error(message || `Failed to reset ${functionType}`);
			}

			const result = (await response.json()) as {
				data: {
					modelId: string | null;
					modelVariant?: string | null;
					temperature: number;
					maxTokens: number;
					promptId: number | null;
				};
			};

			settings[functionType] = {
				...settings[functionType],
				modelId: result.data.modelId || '',
				modelVariant: result.data.modelVariant ?? null,
				temperature: result.data.temperature,
				maxTokens: result.data.maxTokens,
				promptId: result.data.promptId
			};

			initialSnapshot = buildSnapshot();

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

		{#if hasAllowlist || hasVariantPolicy}
			<div
				class="mb-4 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs text-blue-900"
			>
				AI Policy active
				{#if hasAllowlist}
					({allowedModelIds.length} models)
				{/if}
				.
				{#if hasPolicyMatrix}
					Per-function matrix is applied for Judge, Executor, Improve, and Council Agent.
				{:else}
					Function default pickers only show allowed models.
				{/if}
				{#if hasVariantPolicy}
					Variant restrictions from AI Policy are enforced.
				{/if}
			</div>
		{/if}

		<div class="mb-4 flex flex-wrap items-center justify-end gap-2 text-xs">
			<span class="rounded-md border bg-muted px-2 py-1 text-muted-foreground"
				>{configuredCouncilAgentCount} council configured</span
			>
			{#if hasUnsavedChanges}
				<span class="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900"
					>Unsaved changes</span
				>
			{/if}
		</div>

		<ValidationSummary {errors} class="mb-4" />

		<div class="space-y-4">
			{#each rowTypes as type}
				<ModelPickerRow
					{type}
					bind:setting={settings[type]}
					error={errors[type] || {}}
					groupedModels={displayGroupedModelsByScope[type]}
					allGroupedModels={allGroupedModelsWithVariantPolicy}
					{prompts}
					onModelChange={(modelId) => validateField(type, 'modelId', type, modelId, true)}
					onValidate={(field, value, immediate) =>
						validateField(type, field, type, value, immediate)}
					onReset={() => handleReset(type)}
				/>
			{/each}

			<div class="rounded-lg border border-border/60 bg-card/40 p-2">
				<CouncilRepeater
					bind:agents={councilAgents}
					{errors}
					groupedModels={displayGroupedModelsByScope.council}
					allGroupedModels={allGroupedModelsWithVariantPolicy}
					{prompts}
					onValidate={validateCouncilAgentField}
				/>
			</div>
		</div>

		<div class="mt-4 flex justify-end">
			<Button
				onclick={handleSave}
				disabled={!hasUnsavedChanges || hasErrors || isSaving || authRequired}
			>
				{isSaving ? 'Saving...' : 'Save Settings'}
			</Button>
		</div>
	{/if}
</div>
