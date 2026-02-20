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
	import ModelPickerModal from '$lib/components/admin/function-settings/model-picker-modal.svelte';
	import ProviderLogo from '$lib/components/ui/provider-logo.svelte';

	type PolicyScope = 'judge' | 'executor' | 'improve' | 'council';

	interface ScopeToggles {
		judge: boolean;
		executor: boolean;
		improve: boolean;
		council: boolean;
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
		onSave?: () => void;
	}

	let { class: className = '', onSave }: Props = $props();

	let groupedModels = $state<ProviderGroup[]>([]);
	let isLoadingCatalog = $state(true);
	let isSaving = $state(false);
	let isPickerOpen = $state(false);

	let allowedModels = $state<string[]>([]);
	let policyMatrix = $state<Record<string, ScopeToggles>>({});
	let allowedModelVariants = $state<Record<string, string[]>>({});
	let initialAllowedModelsSnapshot = $state('[]');
	let initialPolicyMatrixSnapshot = $state('{}');
	let initialAllowedVariantsSnapshot = $state('{}');

	let hasChanges = $derived(
		JSON.stringify(normalizeModelIds(allowedModels)) !== initialAllowedModelsSnapshot ||
			serializePolicyMatrix(policyMatrix, allowedModels) !== initialPolicyMatrixSnapshot ||
			serializeAllowedModelVariants(allowedModelVariants, allowedModels) !==
				initialAllowedVariantsSnapshot
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
			allowedVariants: getAllowedVariantsForModel(modelId)
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
			return 'Login required. Open /login and refresh this page.';
		}

		try {
			const parsed = JSON.parse(payload) as { message?: string; error?: string };
			return parsed.message || parsed.error || payload;
		} catch {
			return payload;
		}
	}

	function normalizeVariantOptions(modelId: string, model: Record<string, unknown>): string[] {
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
				const options = candidate.filter(
					(value): value is string => typeof value === 'string' && value.trim().length > 0
				);
				if (options.length > 0) {
					return Array.from(new Set(options));
				}
			}
		}

		if (modelId.toLowerCase().includes('codex')) {
			return ['default', 'low', 'medium', 'high', 'xhigh'];
		}

		return [];
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

	function parseAllowedModelList(raw: string): string[] {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (!Array.isArray(parsed)) {
				return [];
			}
			return normalizeModelIds(
				parsed.filter(
					(value): value is string => typeof value === 'string' && value.trim().length > 0
				)
			);
		} catch {
			return [];
		}
	}

	function parsePolicyMatrix(raw: string): Record<string, ScopeToggles> {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				return {};
			}

			const result: Record<string, ScopeToggles> = {};
			for (const [modelId, scopes] of Object.entries(parsed as Record<string, unknown>)) {
				if (modelId.trim().length === 0) {
					continue;
				}
				result[modelId] = normalizeScopeToggles(scopes);
			}

			return result;
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

			const result: Record<string, string[]> = {};
			for (const [modelId, variants] of Object.entries(parsed as Record<string, unknown>)) {
				if (typeof modelId !== 'string' || modelId.trim().length === 0) {
					continue;
				}

				if (!Array.isArray(variants)) {
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
					result[modelId] = normalizedVariants;
				}
			}

			return result;
		} catch {
			return {};
		}
	}

	function serializePolicyMatrix(
		matrix: Record<string, ScopeToggles>,
		modelIds: string[] = Object.keys(matrix)
	): string {
		const normalizedIds = normalizeModelIds(modelIds);
		const normalized: Record<string, ScopeToggles> = {};

		for (const modelId of normalizedIds) {
			normalized[modelId] = normalizeScopeToggles(matrix[modelId]);
		}

		return JSON.stringify(normalized);
	}

	function serializeAllowedModelVariants(
		variantMap: Record<string, string[]>,
		modelIds: string[] = Object.keys(variantMap)
	): string {
		const normalizedModelIds = normalizeModelIds(modelIds);
		const normalized: Record<string, string[]> = {};

		for (const modelId of normalizedModelIds) {
			const variants = variantMap[modelId] || [];
			const normalizedVariants = Array.from(
				new Set(
					variants.filter(
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

	function resolveModelById(modelId: string): {
		id: string;
		name: string;
		providerName: string;
		providerId: string;
		variantOptions?: string[];
	} | null {
		if (!modelId) {
			return null;
		}

		// Check for provider/model format (e.g., "openrouter/glm-4")
		const slashIndex = modelId.indexOf('/');
		if (slashIndex > 0) {
			const providerId = modelId.slice(0, slashIndex);
			const actualModelId = modelId.slice(slashIndex + 1);
			const provider = groupedModels.find((p) => p.providerId === providerId);
			if (provider) {
				const model = provider.models.find((entry) => entry.id === actualModelId);
				if (model) {
					return {
						...model,
						id: modelId, // Keep full provider/model format
						providerName: provider.providerName,
						providerId: provider.providerId
					};
				}
			}
			return null;
		}

		// Legacy fallback: search by model ID only
		for (const provider of groupedModels) {
			const model = provider.models.find((entry) => entry.id === modelId);
			if (model) {
				return {
					...model,
					providerName: provider.providerName,
					providerId: provider.providerId
				};
			}
		}

		return null;
	}

	async function loadCatalog(): Promise<void> {
		try {
			const cachedCatalog = getCachedModelCatalog();
			if (cachedCatalog) {
				groupedModels = normalizeProviderGroups(cachedCatalog);
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
			groupedModels = normalizeProviderGroups(parsedCatalog);
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

			const allModelIds = normalizeModelIds([
				...allowedFromSettings,
				...Object.keys(matrixFromSettings),
				...Object.keys(variantsFromSettings)
			]);

			allowedModels = allModelIds;

			const normalizedMatrix: Record<string, ScopeToggles> = {};
			for (const modelId of allModelIds) {
				normalizedMatrix[modelId] = matrixFromSettings[modelId] || createDefaultScopeToggles();
			}
			policyMatrix = normalizedMatrix;
			allowedModelVariants = variantsFromSettings;

			initialAllowedModelsSnapshot = JSON.stringify(allModelIds);
			initialPolicyMatrixSnapshot = serializePolicyMatrix(normalizedMatrix, allModelIds);
			initialAllowedVariantsSnapshot = serializeAllowedModelVariants(
				variantsFromSettings,
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

		for (const modelId of normalizedIds) {
			nextMatrix[modelId] = policyMatrix[modelId] || createDefaultScopeToggles();
			const variantOptions = getModelVariantOptions(modelId);
			if (variantOptions.length === 0) {
				continue;
			}

			const existingVariants = allowedModelVariants[modelId] || variantOptions;
			const existingVariantSet = new Set(existingVariants);
			const normalizedVariants = variantOptions.filter((variant) =>
				existingVariantSet.has(variant)
			);
			nextVariants[modelId] =
				normalizedVariants.length > 0 ? normalizedVariants : [variantOptions[0]];
		}

		allowedModels = normalizedIds;
		policyMatrix = nextMatrix;
		allowedModelVariants = nextVariants;
	}

	function removeAllowedModel(modelId: string): void {
		allowedModels = allowedModels.filter((id) => id !== modelId);

		const { [modelId]: _discarded, ...remaining } = policyMatrix;
		policyMatrix = remaining;

		if (allowedModelVariants[modelId]) {
			const { [modelId]: _removedVariant, ...remainingVariants } = allowedModelVariants;
			allowedModelVariants = remainingVariants;
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

	async function handleSave(): Promise<void> {
		if (!hasChanges || isSaving) {
			return;
		}

		isSaving = true;

		try {
			const normalizedAllowedModels = normalizeModelIds(allowedModels);
			const normalizedPolicyMatrixRaw: Record<string, ScopeToggles> = {};
			const normalizedAllowedVariantsRaw: Record<string, string[]> = {};

			for (const modelId of normalizedAllowedModels) {
				normalizedPolicyMatrixRaw[modelId] = normalizeScopeToggles(policyMatrix[modelId]);
				const variantOptions = getModelVariantOptions(modelId);
				if (variantOptions.length === 0) {
					continue;
				}

				const selectedVariants = getAllowedVariantsForModel(modelId);
				normalizedAllowedVariantsRaw[modelId] =
					selectedVariants.length > 0 ? selectedVariants : [variantOptions[0]];
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
			initialAllowedModelsSnapshot = JSON.stringify(normalizedAllowedModels);
			initialPolicyMatrixSnapshot = serializePolicyMatrix(
				normalizedPolicyMatrixRaw,
				normalizedAllowedModels
			);
			initialAllowedVariantsSnapshot = serializeAllowedModelVariants(
				normalizedAllowedVariantsRaw,
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
						onclick={() => (isPickerOpen = true)}
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
				<div class="overflow-x-auto rounded-xl border border-border shadow-sm">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-border bg-muted/40 text-muted-foreground">
								<th class="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase"
									>Model</th
								>
								<th class="px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase"
									>Variants</th
								>
								<th class="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase"
									>Judge</th
								>
								<th class="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase"
									>Executor</th
								>
								<th class="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase"
									>Improve</th
								>
								<th class="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase"
									>Council Agent</th
								>
								<th class="px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase"
									>Remove</th
								>
							</tr>
						</thead>
						<tbody>
							{#each matrixRows as row, i (row.modelId)}
								<tr
									class="border-b border-border/50 transition-colors even:bg-muted/10 hover:bg-muted/50 data-[selected=true]:bg-muted/60"
								>
									<td class="px-3 py-2">
										<div class="space-y-0.5">
											{#if row.model}
												<div class="flex items-center gap-1.5 font-medium">
													<ProviderLogo providerId={row.modelId.split('/')[0]} size="sm" />
													<span>{row.model.name}</span>
												</div>
											{:else}
												<div class="flex items-center gap-1.5 font-medium">
													<ProviderLogo providerId={row.modelId.split('/')[0]} size="sm" />
													<span>{row.modelId.split('/').slice(1).join('/')}</span>
												</div>
											{/if}
											<div class="font-mono text-[11px] text-muted-foreground">{row.modelId}</div>
										</div>
									</td>
									<td class="px-3 py-2">
										{#if row.model?.variantOptions && row.model.variantOptions.length > 0}
											<div class="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
												{#each row.model.variantOptions as variant}
													<label
														class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5"
													>
														<input
															type="checkbox"
															checked={row.allowedVariants.includes(variant)}
															onchange={() => toggleVariant(row.modelId, variant)}
														/>
														<span>{variant}</span>
													</label>
												{/each}
											</div>
										{:else}
											<span class="text-xs text-muted-foreground">-</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-center">
										<input
											type="checkbox"
											checked={row.scopes.judge}
											onchange={() => toggleScope(row.modelId, 'judge')}
											class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
										/>
									</td>
									<td class="px-4 py-3 text-center">
										<input
											type="checkbox"
											checked={row.scopes.executor}
											onchange={() => toggleScope(row.modelId, 'executor')}
											class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
										/>
									</td>
									<td class="px-4 py-3 text-center">
										<input
											type="checkbox"
											checked={row.scopes.improve}
											onchange={() => toggleScope(row.modelId, 'improve')}
											class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
										/>
									</td>
									<td class="px-3 py-2 text-center">
										<input
											type="checkbox"
											checked={row.scopes.council}
											onchange={() => toggleScope(row.modelId, 'council')}
										/>
									</td>
									<td class="px-3 py-2 text-center">
										<Button
											variant="ghost"
											size="sm"
											onclick={() => removeAllowedModel(row.modelId)}
										>
											Remove
										</Button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
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
	multiSelect={true}
	onSaveMultiple={handleModelSelectionSave}
	onClose={() => (isPickerOpen = false)}
/>
