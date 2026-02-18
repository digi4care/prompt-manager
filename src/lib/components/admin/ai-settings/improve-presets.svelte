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
	import ModelPickerModal from '$lib/components/admin/function-settings/model-picker-modal.svelte';
	import { toast } from 'svelte-sonner';
	import type { ImprovePreset } from '$lib/server/db/schema';
	import type { CatalogResponse, ModelInfo } from '$lib/server/services/opencode.service';
	import { getCachedModelCatalog, setCachedModelCatalog } from '$lib/client/model-catalog-cache';

	interface Props {
		class?: string;
		onSave?: () => void;
	}

	interface ImprovePresetExample {
		name: string;
		description: string;
		instruction: string;
		temperature: number;
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

	function normalizeProviderGroups(payload: CatalogResponse): ProviderGroup[] {
		if (!Array.isArray(payload.providers)) {
			return [];
		}

		return payload.providers
			.map((provider) => {
				const source = provider.models;
				const models = Array.isArray(source)
					? source
					: (Object.values(source || {}) as ModelInfo[]);

				const normalizedModels = models
					.filter((model) => model?.id && (!model.status || model.status === 'active'))
					.map((model) => ({
						id: model.id,
						name: model.name || model.id
					}))
					.sort((a, b) => a.name.localeCompare(b.name));

				return {
					providerName: provider.name,
					providerId: provider.id,
					models: normalizedModels
				};
			})
			.filter((provider) => provider.models.length > 0)
			.sort((a, b) => a.providerName.localeCompare(b.providerName));
	}

	let allModels = $derived.by(() => {
		const models: Array<{ id: string; name: string; providerName: string; providerId: string }> =
			[];
		for (const provider of groupedModels) {
			for (const model of provider.models) {
				models.push({
					id: model.id,
					name: model.name,
					providerName: provider.providerName,
					providerId: provider.providerId
				});
			}
		}
		return models;
	});

	function resolveModelById(modelId: string): {
		id: string;
		name: string;
		providerName: string;
		providerId: string;
	} | null {
		if (!modelId) {
			return null;
		}

		for (const model of allModels) {
			if (model.id === modelId) {
				return model;
			}
		}

		return null;
	}

	let selectedOverrideModel = $derived(resolveModelById(formModel));

	let selectedAllowedModels = $derived.by(() => {
		const selectedSet = new Set(formAllowedModels);
		return allModels.filter((model) => selectedSet.has(model.id));
	});

	async function loadPresets() {
		try {
			const response = await fetch('/api/admin/improve-presets');
			const payload = await response.text();

			if (parseApiError(payload).startsWith('Login required')) {
				throw new Error('Login required. Open /login and refresh this page.');
			}

			if (!response.ok) {
				throw new Error(parseApiError(payload));
			}

			const result = JSON.parse(payload) as { data?: ImprovePreset[] };
			presets = result.data || [];
			error = null;
		} catch (err) {
			console.error('Failed to load presets:', err);
			error = err instanceof Error ? err.message : 'Failed to load presets';
			toast.error('Failed to load improve presets');
		} finally {
			isLoading = false;
		}
	}

	async function loadCatalog() {
		try {
			const cachedCatalog = getCachedModelCatalog();
			if (cachedCatalog) {
				catalog = cachedCatalog as CatalogResponse;
				groupedModels = normalizeProviderGroups(catalog);
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

			const result = JSON.parse(payload) as CatalogResponse;
			catalog = result;
			groupedModels = normalizeProviderGroups(result);
			setCachedModelCatalog(result);
		} catch (err) {
			console.error('Failed to load catalog:', err);
		}
	}

	function startCreate() {
		isCreating = true;
		editingPreset = null;
		resetForm();
	}

	function startCreateFromExample(example: ImprovePresetExample) {
		startCreate();
		formName = example.name;
		formDescription = example.description;
		formInstruction = example.instruction;
		formTemperature = example.temperature;
		showAdvanced = true;
	}

	function startEdit(preset: ImprovePreset) {
		isCreating = false;
		editingPreset = preset;
		formName = preset.name;
		formDescription = preset.description || '';
		formInstruction = preset.instruction;
		formModel = preset.model || '';
		formTemperature =
			preset.temperature !== null && preset.temperature !== undefined ? preset.temperature : 0.5;
		formAllowedModels = preset.allowedModels ? JSON.parse(preset.allowedModels) : [];
		formIsDefault = preset.isDefault;
		showAdvanced = !!(formModel || formAllowedModels.length > 0);
	}

	function resetForm() {
		formName = '';
		formDescription = '';
		formInstruction = '';
		formModel = '';
		formTemperature = 0.5;
		formAllowedModels = [];
		formIsDefault = false;
		showAdvanced = false;
	}

	function cancelEdit() {
		isCreating = false;
		editingPreset = null;
		resetForm();
	}

	async function handleSave() {
		if (!formName || !formInstruction) {
			toast.error('Name and instruction are required');
			return;
		}

		isSaving = true;

		try {
			const body = {
				name: formName,
				description: formDescription,
				instruction: formInstruction,
				model: formModel || null,
				temperature: formTemperature !== 0.5 ? formTemperature : null,
				allowedModels: formAllowedModels.length > 0 ? JSON.stringify(formAllowedModels) : null,
				isDefault: formIsDefault
			};

			if (isCreating) {
				const response = await fetch('/api/admin/improve-presets', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});

				if (!response.ok) {
					const errorPayload = await response.text();
					throw new Error(parseApiError(errorPayload) || 'Failed to create preset');
				}

				toast.success('Preset created successfully');
			} else if (editingPreset) {
				const response = await fetch(`/api/admin/improve-presets/${editingPreset.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});

				if (!response.ok) {
					const errorPayload = await response.text();
					throw new Error(parseApiError(errorPayload) || 'Failed to update preset');
				}

				toast.success('Preset updated successfully');
			}

			cancelEdit();
			await loadPresets();

			if (onSave) {
				onSave();
			}
		} catch (err) {
			console.error('Failed to save preset:', err);
			toast.error('Failed to save preset', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			isSaving = false;
		}
	}

	async function handleDelete(preset: ImprovePreset) {
		if (!confirm(`Delete preset "${preset.name}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/admin/improve-presets/${preset.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorPayload = await response.text();
				throw new Error(parseApiError(errorPayload) || 'Failed to delete preset');
			}

			toast.success('Preset deleted successfully');
			await loadPresets();
		} catch (err) {
			console.error('Failed to delete preset:', err);
			toast.error('Failed to delete preset');
		}
	}

	function handleModelOverrideSave(modelId: string): void {
		formModel = modelId;
	}

	function clearModelOverride(): void {
		formModel = '';
	}

	function handleAllowedModelsSave(modelIds: string[]): void {
		formAllowedModels = Array.from(
			new Set(modelIds.filter((id) => typeof id === 'string' && id.trim().length > 0))
		);
	}
</script>

<Card class={className}>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="text-lg">Improve Presets</CardTitle>
				<CardDescription>Manage instruction presets for Improve workflow</CardDescription>
			</div>
			<Button
				variant="default"
				size="sm"
				onclick={startCreate}
				disabled={isCreating || editingPreset !== null}
			>
				New Preset
			</Button>
		</div>
	</CardHeader>
	<CardContent class="space-y-4">
		{#if !isLoading && !error && !isCreating && !editingPreset}
			<div class="rounded-lg border bg-muted/20 p-3">
				<div class="mb-3">
					<div class="text-sm font-medium">Preset examples</div>
					<div class="text-xs text-muted-foreground">
						Start snel met een template en pas daarna details aan.
					</div>
				</div>
				<div class="grid gap-2 md:grid-cols-2">
					{#each presetExamples as example}
						<div class="rounded-md border bg-card p-3">
							<div class="text-sm font-medium">{example.name}</div>
							<p class="mt-1 text-xs text-muted-foreground">{example.description}</p>
							<div class="mt-2 flex items-center justify-between">
								<span
									class="rounded-md border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
									>Temp {example.temperature}</span
								>
								<Button variant="outline" size="sm" onclick={() => startCreateFromExample(example)}>
									Use template
								</Button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if isLoading}
			<div class="flex items-center gap-2 text-muted-foreground">
				<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
				<span>Loading presets...</span>
			</div>
		{:else if error}
			<div class="text-sm text-destructive">
				<p>Failed to load presets: {error}</p>
			</div>
		{:else if isCreating || editingPreset}
			<!-- Form -->
			<div class="space-y-4 rounded-lg border bg-muted/20 p-4">
				<div class="text-lg font-medium">
					{isCreating ? 'Create New Preset' : 'Edit Preset'}
				</div>

				<div class="space-y-2">
					<label for="preset-name" class="text-sm font-medium">Name *</label>
					<Input id="preset-name" bind:value={formName} placeholder="e.g., Content Polish" />
				</div>

				<div class="space-y-2">
					<label for="preset-description" class="text-sm font-medium">Description</label>
					<Input
						id="preset-description"
						bind:value={formDescription}
						placeholder="Optional description"
					/>
				</div>

				<div class="space-y-2">
					<label for="preset-instruction" class="text-sm font-medium">Instruction *</label>
					<textarea
						id="preset-instruction"
						class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						bind:value={formInstruction}
						placeholder="Instruction template (use &#123;content&#125; token for prompt content)"
					></textarea>
				</div>

				<Collapsible title="Advanced Settings" defaultOpen={showAdvanced}>
					<div class="space-y-4">
						<div class="space-y-2">
							<p class="text-sm font-medium">Model Override</p>
							<div class="rounded-md border bg-background px-3 py-2">
								<dl class="space-y-1">
									<dt class="text-[11px] tracking-wide text-muted-foreground uppercase">
										Selected model
									</dt>
									<dd class="text-sm">
										{#if selectedOverrideModel}
											{selectedOverrideModel.providerName} / {selectedOverrideModel.name}
										{:else}
											<span class="text-muted-foreground">Use policy default</span>
										{/if}
									</dd>
									{#if selectedOverrideModel}
										<dd class="font-mono text-[11px] text-muted-foreground">
											{selectedOverrideModel.id}
										</dd>
									{/if}
								</dl>
							</div>
							<div class="flex flex-wrap gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={() => (isModelOverrideModalOpen = true)}
								>
									{formModel ? 'Change model' : 'Select model'}
								</Button>
								{#if formModel}
									<Button variant="ghost" size="sm" onclick={clearModelOverride}>
										Use policy default
									</Button>
								{/if}
							</div>
						</div>

						<div class="space-y-2">
							<label for="preset-temp" class="text-sm font-medium"> Temperature Override </label>
							<Input
								id="preset-temp"
								type="number"
								min="0"
								max="2"
								step="0.1"
								bind:value={formTemperature}
							/>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<label for="default-preset" class="text-sm font-medium">Default Preset</label>
								<input
									id="default-preset"
									type="checkbox"
									bind:checked={formIsDefault}
									class="h-4 w-4"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<p class="text-sm font-medium">Allowed Models</p>
							<div class="rounded-md border bg-background px-3 py-2">
								<div class="text-sm">
									{formAllowedModels.length > 0
										? `${formAllowedModels.length} models selected`
										: 'No model allowlist (all policy-allowed models)'}
								</div>
								{#if selectedAllowedModels.length > 0}
									<div class="mt-2 flex flex-wrap gap-1">
										{#each selectedAllowedModels.slice(0, 6) as model}
											<span class="rounded-md border bg-muted px-1.5 py-0.5 text-[10px]">
												{model.providerName} / {model.name}
											</span>
										{/each}
										{#if selectedAllowedModels.length > 6}
											<span
												class="rounded-md border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
											>
												+{selectedAllowedModels.length - 6} more
											</span>
										{/if}
									</div>
								{/if}
							</div>
							<Button variant="outline" size="sm" onclick={() => (isAllowedModelsModalOpen = true)}>
								Select allowed models
							</Button>
						</div>
					</div>
				</Collapsible>

				<div class="flex gap-2">
					<Button variant="outline" onclick={cancelEdit} disabled={isSaving}>Cancel</Button>
					<Button onclick={handleSave} disabled={isSaving}>
						{isSaving ? 'Saving...' : isCreating ? 'Create' : 'Save'}
					</Button>
				</div>
			</div>
		{:else if presets.length === 0}
			<div class="py-8 text-center text-muted-foreground">
				<p class="mb-4">No presets configured yet</p>
				<Button variant="outline" onclick={startCreate}>Create First Preset</Button>
			</div>
		{:else}
			<!-- Presets List -->
			<div class="space-y-2">
				{#each presets as preset (preset.id)}
					<div
						class="flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30"
					>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="font-medium">{preset.name}</span>
								{#if preset.isDefault}
									<span class="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
										>Default</span
									>
								{/if}
							</div>
							{#if preset.description}
								<p class="mt-1 text-sm text-muted-foreground">
									{preset.description}
								</p>
							{/if}
							<div class="mt-2 flex gap-4 text-xs text-muted-foreground">
								{#if preset.model}
									<span>Model: {preset.model}</span>
								{/if}
								{#if preset.temperature !== null && preset.temperature !== undefined}
									<span>Temp: {preset.temperature}</span>
								{/if}
								<span>Updated: {new Date(preset.updatedAt).toLocaleDateString()}</span>
							</div>
						</div>
						<div class="flex gap-2">
							<Button variant="ghost" size="sm" onclick={() => startEdit(preset)}>Edit</Button>
							<Button variant="ghost" size="sm" onclick={() => handleDelete(preset)}>Delete</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</CardContent>
</Card>

<ModelPickerModal
	bind:open={isModelOverrideModalOpen}
	title="Select model override"
	{groupedModels}
	selectedModelId={formModel}
	onSave={handleModelOverrideSave}
	onClose={() => (isModelOverrideModalOpen = false)}
/>

<ModelPickerModal
	bind:open={isAllowedModelsModalOpen}
	title="Select allowed models"
	{groupedModels}
	selectedModelIds={formAllowedModels}
	multiSelect={true}
	onSaveMultiple={handleAllowedModelsSave}
	onClose={() => (isAllowedModelsModalOpen = false)}
/>
