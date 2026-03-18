<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import { Trash2, ExternalLink } from 'lucide-svelte';
	import { getCachedModelCatalog, setCachedModelCatalog } from '$lib/client/model-catalog-cache';
	import ModelPickerModal from '$lib/components/shared/model-selection/model-picker-modal.svelte';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';
	import type { ProviderGroup, ThinkingLevel } from '$lib/types/model.types';
	import { normalizeToProviderGroups } from '$lib/types/model.types';

	type PolicyScope = 'judge' | 'executor' | 'improve' | 'council';

	interface ScopeToggles {
		judge: boolean;
		executor: boolean;
		improve: boolean;
		council: boolean;
	}

	interface Props {
		class?: string;
		onSave?: () => void;
		models?: unknown[];
		allowedModels?: string[];
		blockedModels?: string[];
		requireApproval?: boolean;
		onChange?: (config: {
			allowedModels: string[];
			blockedModels: string[];
			requireApproval: boolean;
		}) => void;
	}

	let {
		class: className = '',
		onSave,
		models: propModels,
		allowedModels: propAllowedModels,
		blockedModels: propBlockedModels,
		requireApproval: propRequireApproval,
		onChange
	}: Props = $props();

	let groupedModels = $state<ProviderGroup[]>([]);
	let isLoadingCatalog = $state(true);
	let isSaving = $state(false);
	let isPickerOpen = $state(false);

	let allowedModels = $state<string[]>([]);
	let policyMatrix = $state<Record<string, ScopeToggles>>({});
	let allowedModelVariants = $state<Record<string, string[]>>({});
	let allowedModelThinkingLevels = $state<Record<string, ThinkingLevel | null>>({});
	let initialAllowedModelsSnapshot = $state('[]');
	let initialPolicyMatrixSnapshot = $state('{}');
	let initialAllowedVariantsSnapshot = $state('{}');
	let initialAllowedThinkingLevelsSnapshot = $state('{}');

	let hasChanges = $derived(
		JSON.stringify(normalizeModelIds(allowedModels)) !== initialAllowedModelsSnapshot ||
			serializePolicyMatrix(policyMatrix, allowedModels) !== initialPolicyMatrixSnapshot ||
			serializeAllowedModelVariants(allowedModelVariants, allowedModels) !==
				initialAllowedVariantsSnapshot ||
			serializeAllowedModelThinkingLevels(allowedModelThinkingLevels, allowedModels) !==
				initialAllowedThinkingLevelsSnapshot
	);

	let selectedPreviewModels = $derived.by(() => {
		return normalizeModelIds(allowedModels)
			.map((modelId) => resolveModelById(modelId))
			.filter((model): model is NonNullable<typeof model> => model !== null);
	});

	let matrixRows = $derived.by(() => {
		return normalizeModelIds(allowedModels).map((modelId) => ({
			modelId,
			model: resolveModelById(modelId),
			scopes: policyMatrix[modelId] ?? createDefaultScopeToggles(),
			allowedVariants: getAllowedVariantsForModel(modelId),
			thinkingLevel: allowedModelThinkingLevels[modelId] ?? null
		}));
	});

	onMount(async () => {
		await Promise.all([loadCatalog(), loadPolicy()]);
	});

	function createDefaultScopeToggles(): ScopeToggles {
		return {
			judge: true,
			executor: true,
			improve: true,
			council: true
		};
	}

	function normalizeScopeToggles(value: unknown): ScopeToggles {
		const record =
			typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
		return {
			judge: Boolean(record.judge),
			executor: Boolean(record.executor),
			improve: Boolean(record.improve),
			council: Boolean(record.council)
		};
	}

	function normalizeModelIds(modelIds: string[]): string[] {
		return Array.from(
			new Set(
				modelIds.filter((modelId) => typeof modelId === 'string' && modelId.trim().length > 0)
			)
		).sort((a, b) => a.localeCompare(b));
	}

	function parseApiError(payload: string): string {
		const normalized = payload.trimStart().toLowerCase();
		if (normalized.startsWith('<!doctype') || normalized.startsWith('<html')) {
			const match = payload.match(/<title[^>]*>([^<]*)<\/title>/i);
			if (match?.[1]) {
				return match[1].trim();
			}
			return 'Server returned HTML error page';
		}

		try {
			const parsed = JSON.parse(payload);
			if (parsed.error?.message) {
				return parsed.error.message;
			}
			if (parsed.message) {
				return parsed.message;
			}
			if (parsed.error) {
				return typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
			}
		} catch {
			// Not JSON, return as-is
		}

		return payload.trim() || 'Unknown error';
	}

	function parseAllowedModelList(json: string): string[] {
		try {
			const parsed = JSON.parse(json);
			if (Array.isArray(parsed)) {
				return parsed.filter((item): item is string => typeof item === 'string');
			}
		} catch {
			// Invalid JSON
		}
		return [];
	}

	function parsePolicyMatrix(json: string): Record<string, ScopeToggles> {
		try {
			const parsed = JSON.parse(json);
			if (typeof parsed === 'object' && parsed !== null) {
				const result: Record<string, ScopeToggles> = {};
				for (const [key, value] of Object.entries(parsed)) {
					if (typeof key === 'string') {
						result[key] = normalizeScopeToggles(value);
					}
				}
				return result;
			}
		} catch {
			// Invalid JSON
		}
		return {};
	}

	function parseAllowedModelVariants(json: string): Record<string, string[]> {
		try {
			const parsed = JSON.parse(json);
			if (typeof parsed === 'object' && parsed !== null) {
				const result: Record<string, string[]> = {};
				for (const [key, value] of Object.entries(parsed)) {
					if (
						typeof key === 'string' &&
						Array.isArray(value) &&
						value.every((item) => typeof item === 'string')
					) {
						result[key] = value;
					}
				}
				return result;
			}
		} catch {
			// Invalid JSON
		}
		return {};
	}

	function parseAllowedModelThinkingLevels(json: string): Record<string, ThinkingLevel | null> {
		try {
			const parsed = JSON.parse(json);
			if (typeof parsed === 'object' && parsed !== null) {
				const result: Record<string, ThinkingLevel | null> = {};
				for (const [key, value] of Object.entries(parsed)) {
					if (typeof key === 'string') {
						if (value === null) {
							result[key] = null;
						} else if (['low', 'medium', 'high'].includes(value as string)) {
							result[key] = value as ThinkingLevel;
						}
					}
				}
				return result;
			}
		} catch {
			// Invalid JSON
		}
		return {};
	}

	function serializePolicyMatrix(matrix: Record<string, ScopeToggles>, modelIds: string[]): string {
		const normalized: Record<string, ScopeToggles> = {};
		for (const modelId of modelIds) {
			if (matrix[modelId]) {
				normalized[modelId] = normalizeScopeToggles(matrix[modelId]);
			}
		}
		return JSON.stringify(normalized);
	}

	function serializeAllowedModelVariants(
		variants: Record<string, string[]>,
		modelIds: string[]
	): string {
		const normalized: Record<string, string[]> = {};
		for (const modelId of modelIds) {
			const modelVariants = variants[modelId];
			if (!Array.isArray(modelVariants)) {
				continue;
			}

			const normalizedVariants = Array.from(
				new Set(
					modelVariants.filter(
						(value): value is string => typeof value === 'string' && value.trim().length > 0
					)
				)
			);

			if (normalizedVariants.length > 0) {
				normalized[modelId] = normalizedVariants;
			}
		}

		return JSON.stringify(normalized);
	}

	function serializeAllowedModelThinkingLevels(
		thinkingLevels: Record<string, ThinkingLevel | null>,
		modelIds: string[]
	): string {
		const normalized: Record<string, ThinkingLevel | null> = {};
		for (const modelId of modelIds) {
			const level = thinkingLevels[modelId];
			if (level !== undefined) {
				normalized[modelId] = level;
			}
		}
		return JSON.stringify(normalized);
	}

	function getModelVariantOptions(modelId: string): string[] {
		const model = resolveModelById(modelId);
		return model?.variantOptions || [];
	}

	function getAllowedVariantsForModel(modelId: string): string[] {
		const variantOptions = getModelVariantOptions(modelId);
		if (variantOptions.length === 0) {
			return [];
		}

		const allowedVariants = allowedModelVariants[modelId];
		if (!Array.isArray(allowedVariants) || allowedVariants.length === 0) {
			return variantOptions;
		}

		const allowedSet = new Set(allowedVariants);
		const filtered = variantOptions.filter((variant) => allowedSet.has(variant));
		return filtered.length > 0 ? filtered : [variantOptions[0]];
	}

	function normalizeVariantsToOptions(variants: unknown): string[] {
		if (!variants) return [];

		if (Array.isArray(variants)) {
			if (variants.length === 0) return [];

			if (typeof variants[0] === 'string') {
				return variants as string[];
			}

			if (typeof variants[0] === 'object' && variants[0] !== null) {
				return variants.map((v: unknown) => {
					const obj = v as { id?: string; label?: string };
					return obj.id || obj.label || String(v);
				});
			}

			return variants.map(String);
		}

		if (typeof variants === 'object' && variants !== null) {
			const keys = Object.keys(variants);
			if (keys.length === 0) return [];
			return keys;
		}

		return [];
	}

	function resolveModelById(modelId: string): {
		id: string;
		name: string;
		providerName: string;
		providerId: string;
		variantOptions?: string[];
		supportsThinking?: boolean;
	} | null {
		if (!modelId) {
			return null;
		}

		const slashIndex = modelId.indexOf('/');
		if (slashIndex > 0) {
			const providerId = modelId.slice(0, slashIndex);
			const actualModelId = modelId.slice(slashIndex + 1);
			const provider = groupedModels.find((p) => p.providerId === providerId);
			if (provider) {
				const model = provider.models.find((entry) => entry.id === actualModelId);
				if (model) {
					return {
						id: modelId,
						name: model.name,
						providerName: provider.providerName,
						providerId: provider.providerId,
						variantOptions: normalizeVariantsToOptions(model.variants),
						supportsThinking: model.supportsThinking ?? false
					};
				}
			}
			return null;
		}

		for (const provider of groupedModels) {
			const model = provider.models.find((entry) => entry.id === modelId);
			if (model) {
				return {
					id: modelId,
					name: model.name,
					providerName: provider.providerName,
					providerId: provider.providerId,
					variantOptions: normalizeVariantsToOptions(model.variants),
					supportsThinking: model.supportsThinking ?? false
				};
			}
		}

		return null;
	}

	async function loadCatalog(): Promise<void> {
		try {
			if (propModels && Array.isArray(propModels) && propModels.length > 0) {
				groupedModels = normalizeToProviderGroups(propModels as Record<string, unknown>[]);
				isLoadingCatalog = false;
				return;
			}

			const cachedCatalog = getCachedModelCatalog();
			if (cachedCatalog) {
				groupedModels = normalizeToProviderGroups(cachedCatalog as Record<string, unknown>[]);
				isLoadingCatalog = false;
				return;
			}

			const response = await fetch('/api/opencode/providers');
			const payload = await response.text();

			if (parseApiError(payload).startsWith('Login required')) {
				throw new Error('Login required. Open /login and refresh this page.');
			}

			if (!response.ok) {
				throw new Error(parseApiError(payload));
			}

			const parsedCatalog = JSON.parse(payload);
			setCachedModelCatalog(parsedCatalog);
			groupedModels = normalizeToProviderGroups(parsedCatalog as Record<string, unknown>[]);
		} catch (err) {
			console.error('Failed to load catalog:', err);
			toast.error('Failed to load model catalog');
		} finally {
			isLoadingCatalog = false;
		}
	}

	async function loadPolicy(): Promise<void> {
		try {
			const response = await fetch('/api/admin/settings');
			const payload = await response.text();

			if (parseApiError(payload).startsWith('Login required')) {
				throw new Error('Login required. Open /login and refresh this page.');
			}

			if (!response.ok) {
				throw new Error(parseApiError(payload));
			}

			const result = JSON.parse(payload) as { data?: Record<string, Record<string, string>> };
			const settings = result.data;

			const allowedFromSettings = parseAllowedModelList(
				settings?.models?.opencode_allowed_models || '[]'
			);
			const matrixFromSettings = parsePolicyMatrix(
				settings?.models?.opencode_allowed_models_matrix || '{}'
			);
			const variantsFromSettings = parseAllowedModelVariants(
				settings?.models?.opencode_allowed_model_variants || '{}'
			);
			const thinkingLevelsFromSettings = parseAllowedModelThinkingLevels(
				settings?.models?.opencode_allowed_model_thinking_levels || '{}'
			);

			const allModelIds = normalizeModelIds([
				...allowedFromSettings,
				...Object.keys(matrixFromSettings),
				...Object.keys(variantsFromSettings),
				...Object.keys(thinkingLevelsFromSettings)
			]);

			allowedModels = allModelIds;

			const normalizedMatrix: Record<string, ScopeToggles> = {};
			for (const modelId of allModelIds) {
				normalizedMatrix[modelId] = matrixFromSettings[modelId] || createDefaultScopeToggles();
			}
			policyMatrix = normalizedMatrix;
			allowedModelVariants = variantsFromSettings;
			allowedModelThinkingLevels = thinkingLevelsFromSettings;

			initialAllowedModelsSnapshot = JSON.stringify(allModelIds);
			initialPolicyMatrixSnapshot = serializePolicyMatrix(normalizedMatrix, allModelIds);
			initialAllowedVariantsSnapshot = serializeAllowedModelVariants(
				variantsFromSettings,
				allModelIds
			);
			initialAllowedThinkingLevelsSnapshot = serializeAllowedModelThinkingLevels(
				thinkingLevelsFromSettings,
				allModelIds
			);
		} catch (err) {
			console.error('Failed to load policy:', err);
			toast.error('Failed to load policy settings');
		}
	}

	function applyModelSelection(modelIds: string[]): void {
		const normalizedIds = normalizeModelIds(modelIds);
		const nextMatrix: Record<string, ScopeToggles> = {};
		const nextVariants: Record<string, string[]> = {};
		const nextThinkingLevels: Record<string, ThinkingLevel | null> = {};

		for (const modelId of normalizedIds) {
			nextMatrix[modelId] = policyMatrix[modelId] || createDefaultScopeToggles();
			const variantOptions = getModelVariantOptions(modelId);
			if (variantOptions.length > 0) {
				const existingVariants = allowedModelVariants[modelId] || variantOptions;
				const existingVariantSet = new Set(existingVariants);
				const normalizedVariants = variantOptions.filter((variant) =>
					existingVariantSet.has(variant)
				);
				nextVariants[modelId] =
					normalizedVariants.length > 0 ? normalizedVariants : [variantOptions[0]];
			}

			// Preserve existing thinking level or default to null
			nextThinkingLevels[modelId] = allowedModelThinkingLevels[modelId] ?? null;
		}

		allowedModels = normalizedIds;
		policyMatrix = nextMatrix;
		allowedModelVariants = nextVariants;
		allowedModelThinkingLevels = nextThinkingLevels;
	}

	function removeAllowedModel(modelId: string): void {
		allowedModels = allowedModels.filter((id) => id !== modelId);

		const { [modelId]: _discarded, ...remaining } = policyMatrix;
		policyMatrix = remaining;

		if (allowedModelVariants[modelId]) {
			const { [modelId]: _removedVariant, ...remainingVariants } = allowedModelVariants;
			allowedModelVariants = remainingVariants;
		}

		if (allowedModelThinkingLevels[modelId] !== undefined) {
			const { [modelId]: _removedThinking, ...remainingThinking } = allowedModelThinkingLevels;
			allowedModelThinkingLevels = remainingThinking;
		}
	}

	function toggleScope(modelId: string, scope: PolicyScope): void {
		const currentScopes = policyMatrix[modelId] || createDefaultScopeToggles();
		policyMatrix = {
			...policyMatrix,
			[modelId]: {
				...currentScopes,
				[scope]: !currentScopes[scope]
			}
		};
	}

	function handleModelSelectionSave(modelIds: string[]): void {
		applyModelSelection(modelIds);
	}

	function toggleVariant(modelId: string, variant: string): void {
		const variantOptions = getModelVariantOptions(modelId);
		if (variantOptions.length === 0) {
			return;
		}

		const currentVariants = getAllowedVariantsForModel(modelId);
		const currentSet = new Set(currentVariants);

		if (currentSet.has(variant)) {
			if (currentSet.size === 1) {
				toast.error('At least one variant must remain enabled per model.');
				return;
			}
			currentSet.delete(variant);
		} else {
			currentSet.add(variant);
		}

		const normalizedVariants = variantOptions.filter((option) => currentSet.has(option));
		allowedModelVariants = {
			...allowedModelVariants,
			[modelId]: normalizedVariants
		};
	}

	function handleThinkingLevelChange(modelId: string, level: ThinkingLevel | null): void {
		allowedModelThinkingLevels = {
			...allowedModelThinkingLevels,
			[modelId]: level
		};
	}

	async function handleSave(): Promise<void> {
		if (!hasChanges || isSaving) {
			return;
		}

		isSaving = true;

		try {
			const normalizedAllowedModels = normalizeModelIds(allowedModels);
			const normalizedPolicyMatrixRaw: Record<string, ScopeToggles> = {};
			const normalizedAllowedVariantsRaw: Record<string, string[]> = {};
			const normalizedAllowedThinkingLevelsRaw: Record<string, ThinkingLevel | null> = {};

			for (const modelId of normalizedAllowedModels) {
				normalizedPolicyMatrixRaw[modelId] = normalizeScopeToggles(policyMatrix[modelId]);
				const variantOptions = getModelVariantOptions(modelId);
				if (variantOptions.length > 0) {
					const selectedVariants = getAllowedVariantsForModel(modelId);
					normalizedAllowedVariantsRaw[modelId] =
						selectedVariants.length > 0 ? selectedVariants : [variantOptions[0]];
				}

				// Only save thinking level if model supports thinking
				const model = resolveModelById(modelId);
				if (model?.supportsThinking) {
					normalizedAllowedThinkingLevelsRaw[modelId] = allowedModelThinkingLevels[modelId] ?? null;
				}
			}

			const updates = [
				{
					key: 'opencode_allowed_models',
					value: JSON.stringify(normalizedAllowedModels),
					updatedBy: 'admin'
				},
				{
					key: 'opencode_allowed_models_matrix',
					value: JSON.stringify(normalizedPolicyMatrixRaw),
					updatedBy: 'admin'
				},
				{
					key: 'opencode_allowed_model_variants',
					value: JSON.stringify(normalizedAllowedVariantsRaw),
					updatedBy: 'admin'
				},
				{
					key: 'opencode_allowed_model_thinking_levels',
					value: JSON.stringify(normalizedAllowedThinkingLevelsRaw),
					updatedBy: 'admin'
				}
			];

			for (const update of updates) {
				const response = await fetch(`/api/admin/settings/${update.key}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(update)
				});

				if (!response.ok) {
					const payload = await response.text();
					throw new Error(parseApiError(payload) || `Failed to save ${update.key}`);
				}
			}

			allowedModels = normalizedAllowedModels;
			policyMatrix = normalizedPolicyMatrixRaw;
			allowedModelVariants = normalizedAllowedVariantsRaw;
			allowedModelThinkingLevels = normalizedAllowedThinkingLevelsRaw;
			initialAllowedModelsSnapshot = JSON.stringify(normalizedAllowedModels);
			initialPolicyMatrixSnapshot = serializePolicyMatrix(
				normalizedPolicyMatrixRaw,
				normalizedAllowedModels
			);
			initialAllowedVariantsSnapshot = serializeAllowedModelVariants(
				normalizedAllowedVariantsRaw,
				normalizedAllowedModels
			);
			initialAllowedThinkingLevelsSnapshot = serializeAllowedModelThinkingLevels(
				normalizedAllowedThinkingLevelsRaw,
				normalizedAllowedModels
			);

			toast.success('Policy settings saved successfully');

			onSave?.();
		} catch (err) {
			console.error('Failed to save policy:', err);
			toast.error('Failed to save policy settings', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			isSaving = false;
		}
	}
</script>

<Card class={className}>
	<CardHeader class="pb-4">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-1">
				<CardTitle class="text-xl font-semibold">AI Policy</CardTitle>
				<CardDescription class="text-sm">
					Whitelist + scope matrix for Judge, Executor, Improve, and Council Agent.
				</CardDescription>
			</div>
			<Button
				variant="default"
				size="sm"
				onclick={handleSave}
				disabled={!hasChanges || isSaving || isLoadingCatalog}
				class="min-h-[40px] min-w-[120px] focus:ring-2 focus:ring-offset-2"
			>
				{isSaving ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	</CardHeader>
	<CardContent class="space-y-6">
		{#if isLoadingCatalog}
			<div class="flex items-center gap-2 text-muted-foreground">
				<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
				<span>Loading catalog...</span>
			</div>
		{:else}
			<div class="space-y-2">
				{#if groupedModels.length === 0}
					<div
						class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
					>
						⚠️ No models available. Connect at least one provider in the "Providers" section first.
					</div>
				{/if}
				<div class="flex items-start justify-between gap-4">
					<div>
						<p class="text-sm font-medium">Whitelist Models</p>
						<p class="text-xs text-muted-foreground">
							{allowedModels.length === 0
								? 'No whitelist rows. All catalog models are currently allowed.'
								: `${allowedModels.length} model(s) in whitelist matrix`}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={groupedModels.length === 0}
						onclick={() => {
							isPickerOpen = true;
						}}
						class="touch-target min-h-[40px] hover:bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						Select models
					</Button>
				</div>

				<button
					type="button"
					class="w-full rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/40"
					onclick={() => (isPickerOpen = true)}
				>
					<dl class="space-y-1">
						<dt class="text-[11px] tracking-wide text-muted-foreground uppercase">
							Model preview (click to pick multiple)
						</dt>
						<dd class="text-sm">
							{#if selectedPreviewModels.length > 0}
								{selectedPreviewModels.length} model(s) selected
							{:else}
								<span class="text-muted-foreground">No models selected yet</span>
							{/if}
						</dd>
						{#if selectedPreviewModels.length > 0}
							<dd class="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
								{#each selectedPreviewModels.slice(0, 6) as model}
									<span class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5">
										<ProviderLogo providerId={model.providerId} size="sm" />
										{model.name}
									</span>
								{/each}
								{#if selectedPreviewModels.length > 6}
									<span class="rounded border px-1.5 py-0.5 text-muted-foreground">
										+{selectedPreviewModels.length - 6} more
									</span>
								{/if}
							</dd>
						{/if}
					</dl>
				</button>
			</div>

			{#if matrixRows.length === 0}
				<div
					class="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 px-4 py-8 text-center"
				>
					<p class="text-sm text-muted-foreground">
						AI Policy matrix is empty. Every catalog model is currently allowed for all functions.
					</p>
					<p class="mt-2 text-xs text-muted-foreground/70">
						Click "Select models" above to add models to the policy.
					</p>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="hidden overflow-hidden rounded-xl border border-border shadow-sm lg:block">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-border bg-muted/30">
									<th
										class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
										>Model</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
										>Variants</th
									>
									<th
										class="px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
										>Thinking</th
									>
									<th
										class="w-20 px-3 py-3 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
										>Judge</th
									>
									<th
										class="w-24 px-3 py-3 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
										>Executor</th
									>
									<th
										class="w-20 px-3 py-3 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
										>Improve</th
									>
									<th
										class="w-20 px-3 py-3 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase"
										>Council</th
									>
									<th class="w-16 px-3 py-3"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/50">
								{#each matrixRows as row, i (row.modelId)}
									<tr class="transition-colors hover:bg-muted/30">
										<td class="px-4 py-3">
											<div class="flex items-center gap-2">
												<ProviderLogo providerId={row.modelId.split('/')[0]} size="sm" />
												<div class="min-w-0">
													<div class="truncate font-medium">
														{row.model?.name ?? row.modelId.split('/').slice(1).join('/')}
													</div>
													<div class="truncate font-mono text-[11px] text-muted-foreground">
														{row.modelId}
													</div>
												</div>
											</div>
										</td>
										<td class="px-4 py-3">
											{#if row.model?.variantOptions && row.model.variantOptions.length > 0}
												<div class="flex flex-wrap gap-1.5">
													{#each row.model.variantOptions as variant}
														<button
															type="button"
															onclick={() => toggleVariant(row.modelId, variant)}
															class="min-h-[28px] rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:outline-none {row.allowedVariants.includes(
																variant
															)
																? 'border-primary bg-primary/10 text-primary'
																: 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/30'}"
														>
															{variant}
														</button>
													{/each}
												</div>
											{:else}
												<span class="text-xs text-muted-foreground">—</span>
											{/if}
										</td>
										<td class="px-4 py-3">
											{#if row.model?.supportsThinking}
												<select
													class="h-8 rounded border border-input bg-background px-2 text-xs focus:ring-2 focus:ring-ring"
													value={row.thinkingLevel || ''}
													onchange={(e) =>
														handleThinkingLevelChange(
															row.modelId,
															(e.currentTarget.value as ThinkingLevel) || null
														)}
												>
													<option value="">Disabled</option>
													<option value="low">Low</option>
													<option value="medium">Medium</option>
													<option value="high">High</option>
												</select>
											{:else}
												<span class="text-xs text-muted-foreground">—</span>
											{/if}
										</td>
										<td class="px-3 py-3 text-center">
											<label
												class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center"
											>
												<input
													type="checkbox"
													checked={row.scopes.judge}
													onchange={() => toggleScope(row.modelId, 'judge')}
													class="h-5 w-5 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
												/>
											</label>
										</td>
										<td class="px-3 py-3 text-center">
											<label
												class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center"
											>
												<input
													type="checkbox"
													checked={row.scopes.executor}
													onchange={() => toggleScope(row.modelId, 'executor')}
													class="h-5 w-5 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
												/>
											</label>
										</td>
										<td class="px-3 py-3 text-center">
											<label
												class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center"
											>
												<input
													type="checkbox"
													checked={row.scopes.improve}
													onchange={() => toggleScope(row.modelId, 'improve')}
													class="h-5 w-5 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
												/>
											</label>
										</td>
										<td class="px-3 py-3 text-center">
											<label
												class="inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center"
											>
												<input
													type="checkbox"
													checked={row.scopes.council}
													onchange={() => toggleScope(row.modelId, 'council')}
													class="h-5 w-5 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
												/>
											</label>
										</td>
										<td class="px-3 py-3 text-center">
											<Button
												variant="ghost"
												size="icon"
												onclick={() => removeAllowedModel(row.modelId)}
												class="min-h-[44px] min-w-[44px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:ring-2 focus:ring-destructive focus:ring-offset-2"
												aria-label="Remove model"
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="flex flex-col gap-3 lg:hidden">
						{#each matrixRows as row, i (row.modelId)}
							<div class="rounded-xl border border-border bg-card p-4 shadow-sm">
								<div class="flex items-start justify-between gap-3">
									<div class="flex min-w-0 items-center gap-2">
										<ProviderLogo providerId={row.modelId.split('/')[0]} size="sm" />
										<div class="min-w-0">
											<div class="truncate font-medium">
												{row.model?.name ?? row.modelId.split('/').slice(1).join('/')}
											</div>
											<div class="truncate font-mono text-[11px] text-muted-foreground">
												{row.modelId}
											</div>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => removeAllowedModel(row.modelId)}
										class="min-h-[44px] min-w-[44px] shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
										aria-label="Remove model"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>

								{#if row.model?.variantOptions && row.model.variantOptions.length > 0}
									<div class="mt-3">
										<p
											class="mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
										>
											Variants
										</p>
										<div class="flex flex-wrap gap-1.5">
											{#each row.model.variantOptions as variant}
												<button
													type="button"
													onclick={() => toggleVariant(row.modelId, variant)}
													class="min-h-[36px] rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:outline-none {row.allowedVariants.includes(
														variant
													)
														? 'border-primary bg-primary/10 text-primary'
														: 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/30'}"
												>
													{variant}
												</button>
											{/each}
										</div>
									</div>
								{/if}

								{#if row.model?.supportsThinking}
									<div class="mt-3">
										<p
											class="mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
										>
											Thinking Level
										</p>
										<select
											class="h-9 w-full rounded border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-ring"
											value={row.thinkingLevel || ''}
											onchange={(e) =>
												handleThinkingLevelChange(
													row.modelId,
													(e.currentTarget.value as ThinkingLevel) || null
												)}
										>
											<option value="">Disabled</option>
											<option value="low">Low</option>
											<option value="medium">Medium</option>
											<option value="high">High</option>
										</select>
									</div>
								{/if}

								<div class="mt-4">
									<p
										class="mb-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase"
									>
										Allowed Scopes
									</p>
									<div class="grid grid-cols-2 gap-2">
										<label
											class="flex min-h-[48px] cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors {row
												.scopes.judge
												? 'border-primary bg-primary/5'
												: 'border-border hover:border-muted-foreground/30'}"
										>
											<span class="text-sm font-medium">Judge</span>
											<input
												type="checkbox"
												checked={row.scopes.judge}
												onchange={() => toggleScope(row.modelId, 'judge')}
												class="h-5 w-5 rounded border-input text-primary focus:ring-2 focus:ring-ring"
											/>
										</label>
										<label
											class="flex min-h-[48px] cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors {row
												.scopes.executor
												? 'border-primary bg-primary/5'
												: 'border-border hover:border-muted-foreground/30'}"
										>
											<span class="text-sm font-medium">Executor</span>
											<input
												type="checkbox"
												checked={row.scopes.executor}
												onchange={() => toggleScope(row.modelId, 'executor')}
												class="h-5 w-5 rounded border-input text-primary focus:ring-2 focus:ring-ring"
											/>
										</label>
										<label
											class="flex min-h-[48px] cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors {row
												.scopes.improve
												? 'border-primary bg-primary/5'
												: 'border-border hover:border-muted-foreground/30'}"
										>
											<span class="text-sm font-medium">Improve</span>
											<input
												type="checkbox"
												checked={row.scopes.improve}
												onchange={() => toggleScope(row.modelId, 'improve')}
												class="h-5 w-5 rounded border-input text-primary focus:ring-2 focus:ring-ring"
											/>
										</label>
										<label
											class="flex min-h-[48px] cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors {row
												.scopes.council
												? 'border-primary bg-primary/5'
												: 'border-border hover:border-muted-foreground/30'}"
										>
											<span class="text-sm font-medium">Council</span>
											<input
												type="checkbox"
												checked={row.scopes.council}
												onchange={() => toggleScope(row.modelId, 'council')}
												class="h-5 w-5 rounded border-input text-primary focus:ring-2 focus:ring-ring"
											/>
										</label>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</CardContent>
</Card>

<ModelPickerModal
	bind:open={isPickerOpen}
	title="Select models for AI policy"
	{groupedModels}
	selectedModelIds={allowedModels}
	config={{
		multiSelect: true,
		showVariants: false,
		showThinkingLevel: false,
		showTemperature: false,
		showMaxTokens: false,
		showPromptLink: false,
		enableWhitelist: false
	}}
	onSaveMultiple={handleModelSelectionSave}
	onClose={() => (isPickerOpen = false)}
/>
