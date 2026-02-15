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
	import { toast } from 'svelte-sonner';
	import type { ImprovePreset } from '$lib/server/db/schema';
	import type { CatalogResponse, ModelInfo } from '$lib/server/services/opencode.service';

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
	let formTemperature = $state<number>(0.5);
	let formAllowedModels = $state<string[]>([]);
	let formIsDefault = $state(false);
	let showAdvanced = $state(false);

	onMount(async () => {
		await Promise.all([loadPresets(), loadCatalog()]);
	});

	async function loadPresets() {
		try {
			const response = await fetch('/api/admin/improve-presets');
			const result = await response.json();
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
			const response = await fetch('/api/opencode/providers');
			const result = await response.json();
			catalog = result;
		} catch (err) {
			console.error('Failed to load catalog:', err);
		}
	}

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

	function startCreate() {
		isCreating = true;
		editingPreset = null;
		resetForm();
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
					const errorData = await response.json();
					throw new Error(errorData.errors?.join(', ') || 'Failed to create preset');
				}

				toast.success('Preset created successfully');
			} else if (editingPreset) {
				const response = await fetch(`/api/admin/improve-presets/${editingPreset.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.errors?.join(', ') || 'Failed to update preset');
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
				throw new Error('Failed to delete preset');
			}

			toast.success('Preset deleted successfully');
			await loadPresets();
		} catch (err) {
			console.error('Failed to delete preset:', err);
			toast.error('Failed to delete preset');
		}
	}

	function toggleModelInForm(modelId: string) {
		if (formAllowedModels.includes(modelId)) {
			formAllowedModels = formAllowedModels.filter((m) => m !== modelId);
		} else {
			formAllowedModels = [...formAllowedModels, modelId];
		}
	}

	function isModelInForm(modelId: string): boolean {
		return formAllowedModels.includes(modelId);
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
		{#if isLoading}
			<div class="flex items-center gap-2 text-muted-foreground">
				<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
				<span>Loading presets...</span>
			</div>
		{:else if error}
			<div class="text-sm text-red-600 dark:text-red-400">
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
							<label for="preset-model" class="text-sm font-medium"> Model Override </label>
							<select
								id="preset-model"
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								bind:value={formModel}
							>
								<option value="">Use policy default</option>
								{#each getAllModels() as model}
									<option value={model.id}>{model.name}</option>
								{/each}
							</select>
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
							<div class="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
								{#each getAllModels() as model}
									<label
										class="flex cursor-pointer items-start gap-2 rounded p-2 hover:bg-muted/50"
									>
										<input
											type="checkbox"
											checked={isModelInForm(model.id)}
											onchange={() => toggleModelInForm(model.id)}
											class="mt-1"
										/>
										<div class="min-w-0 flex-1">
											<div class="truncate text-sm font-medium">
												{model.name}
											</div>
											<div class="truncate font-mono text-xs text-muted-foreground">
												{model.id}
											</div>
										</div>
									</label>
								{/each}
							</div>
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
