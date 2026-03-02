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
	import { Input } from '$lib/components/ui/input';
	import Collapsible from './collapsible.svelte';
	import ModelPickerModal from '$lib/components/shared/model-selection/model-picker-modal.svelte';
	import { toast } from 'svelte-sonner';
	import type { ImprovePreset } from '$lib/server/db/schema';
	import type { ProviderGroup } from '$lib/types/model.types';
	import type { CatalogResponse } from '$lib/server/services/opencode.service';
	import { getCachedModelCatalog, setCachedModelCatalog } from '$lib/client/model-catalog-cache';
	import { normalizeToProviderGroups } from '$lib/types/model.types';

	// Local interface - not shared
	interface ImprovePresetExample {
		name: string;
		description: string;
		instruction: string;
		temperature: number;
	}

	interface Props {
		class?: string;
		onSave?: () => void;
	}

	let { class: className = '', onSave }: Props = $props();

	let presets = $state<ImprovePreset[]>([]);
	let catalog = $state<CatalogResponse | null>(null);

	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state<string | null>(null);

	let editingPreset = $state<ImprovePreset | null>(null);
	let isCreating = $state(false);

	// Form state
	let formName = $state('');
	let formDescription = $state('');
	let formInstruction = $state('');
	let formModel = $state('');
	let formVariant = $state('');
	let formTemperature = $state<number>(0.5);
	let formAllowedModels = $state<string[]>([]);
	let formIsDefault = $state(false);
	let showAdvanced = $state(false);
	let groupedModels = $state<ProviderGroup[]>([]);
	let isModelOverrideModalOpen = $state(false);
	let isAllowedModelsModalOpen = $state(false);

	const presetExamples: ImprovePresetExample[] = [
		{
			name: 'NL Clarity Polish',
			description: 'Maak tekst helderder en strakker zonder betekenis te veranderen.',
			instruction:
				'Herschrijf de volgende tekst in helder, correct Nederlands. Verbeter grammatica, zinsbouw en leesbaarheid, maar verander de inhoud niet. Behoud alle feiten en nuances.\n\nTekst:\n{content}',
			temperature: 0.3
		},
		{
			name: 'Professional Tone',
			description: 'Maak de toon professioneler en consistenter.',
			instruction:
				'Herschrijf de tekst in een professionele, zakelijke toon. Vermijd vage formuleringen, wees concreet en bondig. Behoud de originele boodschap.\n\nTekst:\n{content}',
			temperature: 0.4
		},
		{
			name: 'Concise Rewrite',
			description: 'Korter maken met behoud van kernboodschap.',
			instruction:
				'Maak de tekst 25-40% korter zonder essentiële informatie te verliezen. Verwijder herhaling, houd de structuur logisch en lever een compacte eindversie.\n\nTekst:\n{content}',
			temperature: 0.2
		},
		{
			name: 'Structure and Formatting',
			description: 'Verbeter structuur met duidelijke koppen en bullets.',
			instruction:
				'Herstructureer de tekst voor betere scanbaarheid. Gebruik duidelijke sectiekoppen, korte alineas en bullets waar passend. Behoud inhoud en intentie.\n\nTekst:\n{content}',
			temperature: 0.3
		},
		{
			name: 'Actionable Output',
			description: 'Zet tekst om in concrete acties en volgende stappen.',
			instruction:
				'Herschrijf de tekst naar een actiegerichte versie. Eindig met een korte lijst van concrete volgende stappen (max 5) met duidelijke werkwoorden.\n\nTekst:\n{content}',
			temperature: 0.5
		},
		{
			name: 'Technical Precision',
			description: 'Voor technische content met focus op juistheid en consistentie.',
			instruction:
				'Verbeter de tekst met focus op technische precisie en consistente terminologie. Corrigeer ambigu taalgebruik, maak aannames expliciet en behoud exacte technische betekenis.\n\nTekst:\n{content}',
			temperature: 0.2
		}
	];

	onMount(async () => {
		await Promise.all([loadPresets(), loadCatalog()]);
	});

	function parseApiError(payload: string): string {
		const normalized = payload.trimStart().toLowerCase();
		if (normalized.startsWith('<!doctype') || normalized.startsWith('<html')) {
			return 'Login required. Open /login and refresh this page.';
		}

		try {
			const parsed = JSON.parse(payload) as {
				message?: string;
				errors?: string[] | string;
				error?: string;
			};

			if (Array.isArray(parsed.errors)) {
				return parsed.errors.join(', ');
			}
			if (typeof parsed.errors === 'string') {
				return parsed.errors;
			}

			return parsed.message || parsed.error || payload;
		} catch {
			return payload;
		}
	}

	async function loadPresets() {
		try {
			const response = await fetch('/api/admin/improve-presets');
			if (!response.ok) {
				throw new Error('Failed to load presets');
			}
			presets = await response.json();
		} catch (err) {
			console.error('Failed to load presets:', err);
			error = err instanceof Error ? err.message : 'Failed to load presets';
		} finally {
			isLoading = false;
		}
	}

	async function loadCatalog() {
		try {
			// Try cache first
			const cached = getCachedModelCatalog();
			if (cached) {
				catalog = cached;
				groupedModels = normalizeToProviderGroups(cached.providers as Record<string, unknown>[]);
				return;
			}

			const response = await fetch('/api/admin/model-catalog');
			if (!response.ok) {
				throw new Error('Failed to load model catalog');
			}
			catalog = await response.json();
			setCachedModelCatalog(catalog);
			groupedModels = normalizeToProviderGroups(catalog.providers as Record<string, unknown>[]);
		} catch (err) {
			console.error('Failed to load catalog:', err);
			error = err instanceof Error ? err.message : String(err);
		}
	}

	// Derived: flatten all models for lookup
	let allModels = $derived.by(() => {
		const models: Array<{
			id: string;
			name: string;
			providerName: string;
			providerId: string;
			variants?: { id: string; label?: string }[];
		}> = [];

		for (const provider of groupedModels) {
			for (const model of provider.models) {
				models.push({
					id: model.id,
					name: model.name,
					providerName: provider.providerName,
					providerId: provider.providerId,
					variants: model.variants
				});
			}
		}

		return models;
	});

	function getModelById(id: string) {
		return allModels.find((m) => m.id === id);
	}

	function getSelectedModelName(): string {
		if (!formModel) return '';
		const model = getModelById(formModel);
		return model?.name ?? '';
	}

	function getSelectedProviderName(): string {
		if (!formModel) return '';
		const model = getModelById(formModel);
		return model?.providerName ?? '';
	}

	function getSelectedModelVariants() {
		if (!formModel) return [];
		const model = getModelById(formModel);
		return model?.variants ?? [];
	}

	function startCreate() {
		isCreating = true;
		editingPreset = null;
		resetForm();
	}

	function startEdit(preset: ImprovePreset) {
		editingPreset = preset;
		isCreating = true;
		formName = preset.name;
		formDescription = preset.description ?? '';
		formInstruction = preset.instruction ?? '';
		formModel = preset.modelId ?? '';
		formVariant = preset.modelVariant ?? '';
		formTemperature = preset.temperature ?? 0.5;
		formAllowedModels = preset.allowedModels ? JSON.parse(preset.allowedModels) : [];
		formIsDefault = preset.isDefault ?? false;
		showAdvanced = true;
	}

	function cancelEdit() {
		editingPreset = null;
		isCreating = false;
		resetForm();
	}

	function resetForm() {
		formName = '';
		formDescription = '';
		formInstruction = '';
		formModel = '';
		formVariant = '';
		formTemperature = 0.5;
		formAllowedModels = [];
		formIsDefault = false;
		showAdvanced = false;
	}

	async function savePreset() {
		if (!formName.trim()) {
			toast.error('Preset name is required');
			return;
		}
		if (!formInstruction.trim()) {
			toast.error('Instruction is required');
			return;
		}

		isSaving = true;
		try {
			const payload: Record<string, unknown> = {
				name: formName,
				description: formDescription || null,
				instruction: formInstruction,
				temperature: formTemperature,
				isDefault: formIsDefault
			};

			if (formModel) {
				payload.modelId = formModel;
				payload.modelVariant = formVariant || null;
			}

			if (formAllowedModels.length > 0) {
				payload.allowedModels = JSON.stringify(formAllowedModels);
			}

			let response: Response;
			if (editingPreset) {
				response = await fetch(`/api/admin/improve-presets/${editingPreset.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			} else {
				response = await fetch('/api/admin/improve-presets', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
			}

			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(parseApiError(errorData));
			}

			toast.success(editingPreset ? 'Preset updated' : 'Preset created');
			await loadPresets();
			cancelEdit();
			onSave?.();
		} catch (err) {
			console.error('Failed to save preset:', err);
			toast.error(err instanceof Error ? err.message : 'Failed to save preset');
		} finally {
			isSaving = false;
		}
	}

	async function deletePreset(id: number) {
		if (!confirm('Delete this preset?')) return;

		try {
			const response = await fetch(`/api/admin/improve-presets/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete preset');
			}

			toast.success('Preset deleted');
			await loadPresets();
		} catch (err) {
			console.error('Failed to delete preset:', err);
			toast.error('Failed to delete preset');
		}
	}

	function applyExample(example: ImprovePresetExample) {
		formName = example.name;
		formDescription = example.description;
		formInstruction = example.instruction;
		formTemperature = example.temperature;
	}
</script>

<div class={className}>
	<Card>
		<CardHeader>
			<CardTitle>Improve Presets</CardTitle>
			<CardDescription>Configure improve presets for content enhancement workflows</CardDescription>
		</CardHeader>
		<CardContent>
			{#if isLoading}
				<div class="flex items-center gap-2 text-muted-foreground">
					<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
					<span>Loading...</span>
				</div>
			{:else if error}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			{:else}
				<div class="space-y-6">
					<!-- Preset list -->
					{#if !isCreating}
						<div class="mb-4">
							<Button onclick={startCreate} variant="outline">Create Preset</Button>
						</div>

						{#if presets.length === 0}
							<div
								class="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 py-8"
							>
								<span class="mb-2 text-2xl">👥</span>
								<p class="mb-4 text-sm text-muted-foreground">No presets configured yet</p>
								<Button variant="outline" onclick={startCreate}>Create Preset</Button>
							</div>
						{:else}
							<div class="space-y-3">
								{#each presets as preset}
									<div
										class="preset-card flex items-center justify-between rounded-lg border bg-card p-4"
									>
										<div>
											<div class="font-medium">{preset.name}</div>
											{#if preset.description}
												<div class="text-sm text-muted-foreground">
													{preset.description}
												</div>
											{/if}
											<div class="mt-1 flex gap-2 text-xs text-muted-foreground">
												{#if preset.modelId}
													<span class="rounded bg-muted px-1.5">{preset.modelId}</span>
												{/if}
												<span>Temp: {preset.temperature}</span>
												{#if preset.isDefault}
													<span class="text-primary">Default</span>
												{/if}
											</div>
										</div>
										<div class="flex gap-2">
											<Button variant="outline" size="sm" onclick={() => startEdit(preset)}>
												Edit
											</Button>
											<Button
												variant="ghost"
												size="sm"
												class="text-destructive"
												onclick={() => deletePreset(preset.id)}
											>
												Delete
											</Button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<!-- Edit/Create Form -->
						<div class="space-y-4">
							<div>
								<label class="mb-2 block text-sm font-medium">Name</label>
								<Input
									id="preset-name"
									value={formName}
									placeholder="e.g., Content Polish"
									oninput={(e) => (formName = e.currentTarget.value)}
								/>
							</div>

							<div>
								<label class="mb-2 block text-sm font-medium">Description (optional)</label>
								<Input
									id="preset-description"
									value={formDescription}
									placeholder="Optional description"
									oninput={(e) => (formDescription = e.currentTarget.value)}
								/>
							</div>

							<div>
								<label class="mb-2 block text-sm font-medium">Instruction Template</label>
								<textarea
									id="preset-instruction"
									rows="6"
									value={formInstruction}
									placeholder="Instruction template (use {content} placeholder)"
									class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									oninput={(e) => (formInstruction = e.currentTarget.value)}
								></textarea>
								<p class="mt-1 text-xs text-muted-foreground">
									Use <code class="rounded bg-muted px-1">{'{'}content{'}'}</code> as placeholder for
									the content to improve.
								</p>
							</div>

							<!-- Advanced Settings -->
							<Collapsible title="Advanced Settings" open={showAdvanced}>
								<div class="space-y-4">
									<!-- Model Override -->
									<div>
										<label class="mb-2 block text-sm font-medium">Model Override</label>
										<button
											type="button"
											class="flex min-h-[40px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
											onclick={() => (isModelOverrideModalOpen = true)}
										>
											{#if formModel}
												<span class="font-medium">{getSelectedModelName()}</span>
												<span class="text-xs text-muted-foreground"
													>{getSelectedProviderName()}</span
												>
											{:else}
												<span class="text-muted-foreground">Select model...</span>
											{/if}
											<span class="text-xs text-muted-foreground">Change</span>
										</button>
									</div>

									<!-- Variant -->
									{#if getSelectedModelVariants().length > 0}
										<div>
											<label
												for="variant"
												class="mb-1 block text-xs font-medium text-muted-foreground">Variant</label
											>
											<select
												id="variant"
												class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
												value={formVariant}
												onchange={(e) => (formVariant = e.currentTarget.value)}
											>
												<option value="">Default</option>
												{#each getSelectedModelVariants() as variant}
													<option value={variant.id} selected={formVariant === variant.id}
														>{variant.label || variant.id}</option
													>
												{/each}
											</select>
										</div>
									{/if}

									<!-- Temperature -->
									<div>
										<label class="mb-1 block text-xs font-medium text-muted-foreground"
											>Temperature ({formTemperature})</label
										>
										<input
											type="range"
											id="temperature"
											min="0"
											max="1"
											step="0.1"
											class="w-full"
											value={formTemperature}
											oninput={(e) => (formTemperature = parseFloat(e.currentTarget.value))}
										/>
									</div>

									<!-- Default -->
									<div class="flex items-center gap-2">
										<input
											type="checkbox"
											id="is-default"
											class="h-4 w-4"
											checked={formIsDefault}
											onchange={(e) => (formIsDefault = e.currentTarget.checked)}
										/>
										<label for="is-default" class="text-sm font-medium">Default preset</label>
									</div>
								</div>
							</Collapsible>

							<!-- Allowed Models (Allowlist) -->
							<Collapsible title="Allowed Models (Allowlist)" open={showAdvanced}>
								<div class="space-y-3">
									<div class="rounded-md border bg-muted/30 p-3">
										<span class="text-sm font-medium">
											{formAllowedModels.length} model(s) allowed
										</span>
										<button
											type="button"
											class="ml-2 text-xs text-primary"
											onclick={() => (isAllowedModelsModalOpen = true)}
										>
											Manage
										</button>
									</div>

									{#if formAllowedModels.length > 0}
										<ul class="space-y-2">
											{#each formAllowedModels as modelId}
												<li class="flex items-center justify-between rounded-md bg-muted px-3 py-2">
													<span class="font-mono text-xs">{modelId}</span>
													<button
														type="button"
														class="text-xs text-destructive"
														onclick={() => {
															formAllowedModels = formAllowedModels.filter((m) => m !== modelId);
														}}
													>
														Remove
													</button>
												</li>
											{/each}
										</ul>
									{/if}
								</div>
							</Collapsible>

							<!-- Example Presets -->
							<Collapsible title="Example Presets" open={false}>
								<div class="grid gap-2 sm:grid-cols-2">
									{#each presetExamples as example}
										<button
											type="button"
											class="rounded-md border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
											onclick={() => applyExample(example)}
										>
											<div class="text-sm font-medium">{example.name}</div>
											<div class="text-xs text-muted-foreground">
												{example.description}
											</div>
										</button>
									{/each}
								</div>
							</Collapsible>

							<!-- Action Buttons -->
							<div class="flex justify-end gap-2 pt-4">
								<Button variant="outline" onclick={cancelEdit}>Cancel</Button>
								<Button onclick={savePreset} disabled={isSaving}>
									{isSaving ? 'Saving...' : 'Save Preset'}
								</Button>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Model Override Modal -->
<ModelPickerModal
	open={isModelOverrideModalOpen}
	title="Select Override Model"
	{groupedModels}
	selectedModelId={formModel}
	onSave={(modelId: string) => {
		formModel = modelId;
		formVariant = '';
		isModelOverrideModalOpen = false;
	}}
	onClose={() => (isModelOverrideModalOpen = false)}
/>

<!-- Allowed Models Modal -->
<ModelPickerModal
	open={isAllowedModelsModalOpen}
	title="Select Allowed Models"
	{groupedModels}
	selectedModelIds={formAllowedModels}
	config={{ multiSelect: true, showVariants: false, showThinkingLevel: false }}
	onSaveMultiple={(modelIds: string[]) => {
		formAllowedModels = modelIds;
		isAllowedModelsModalOpen = false;
	}}
	onClose={() => (isAllowedModelsModalOpen = false)}
/>

<style>
	.preset-card {
		transition: all 0.2s ease-out;
	}
	.preset-card:hover {
		border-color: hsl(var(--primary) / 0.5);
	}
</style>
