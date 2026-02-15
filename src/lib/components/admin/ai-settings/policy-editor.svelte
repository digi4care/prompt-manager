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
	import type { CatalogResponse, ModelInfo } from '$lib/server/services/opencode.service';

	interface Props {
		class?: string;
		onSave?: () => void;
	}

	let { class: className = '', onSave }: Props = $props();

	let catalog = $state<CatalogResponse | null>(null);
	let isLoadingCatalog = $state(true);

	let allowedModels = $state<string[]>([]);
	let improveDefaultModel = $state('');
	let improveTemperature = $state('0.5');
	let judgeDefaultModel = $state('');
	let judgeTemperature = $state('0.3');

	let isSaving = $state(false);
	let hasChanges = $derived(allowedModels.length > 0 || improveDefaultModel || judgeDefaultModel);

	onMount(async () => {
		await Promise.all([loadCatalog(), loadPolicy()]);
	});

	async function loadCatalog() {
		try {
			const response = await fetch('/api/opencode/providers');
			const result = await response.json();
			catalog = result;
		} catch (err) {
			console.error('Failed to load catalog:', err);
			toast.error('Failed to load model catalog');
		} finally {
			isLoadingCatalog = false;
		}
	}

	async function loadPolicy() {
		try {
			const response = await fetch('/api/admin/settings');
			const result = await response.json();
			const settings = result.data;

			// Load allowed models
			const allowedModelsJson = settings.models?.opencode_allowed_models || '[]';
			allowedModels = JSON.parse(allowedModelsJson);

			// Load workflow defaults
			improveDefaultModel = settings.models?.opencode_improve_default_model || '';
			judgeDefaultModel = settings.models?.opencode_judge_default_model || '';
			improveTemperature = settings.temperature?.opencode_improve_temperature || '0.5';
			judgeTemperature = settings.temperature?.opencode_judge_temperature || '0.3';
		} catch (err) {
			console.error('Failed to load policy:', err);
			toast.error('Failed to load policy settings');
		}
	}

	async function handleSave() {
		if (!hasChanges || isSaving) return;

		isSaving = true;

		try {
			const updates = [
				{
					key: 'opencode_allowed_models',
					value: JSON.stringify(allowedModels),
					updatedBy: 'admin'
				},
				{
					key: 'opencode_improve_default_model',
					value: improveDefaultModel,
					updatedBy: 'admin'
				},
				{
					key: 'opencode_judge_default_model',
					value: judgeDefaultModel,
					updatedBy: 'admin'
				},
				{
					key: 'opencode_improve_temperature',
					value: improveTemperature.toString(),
					updatedBy: 'admin'
				},
				{
					key: 'opencode_judge_temperature',
					value: judgeTemperature.toString(),
					updatedBy: 'admin'
				}
			];

			const updatePromises = updates.map((update) =>
				fetch(`/api/admin/settings/${update.key}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(update)
				})
			);

			const responses = await Promise.all(updatePromises);

			const failedResponses = responses.filter((r) => !r.ok);
			if (failedResponses.length > 0) {
				throw new Error(`Failed to update ${failedResponses.length} setting(s)`);
			}

			toast.success('Policy settings saved successfully');

			if (onSave) {
				onSave();
			}
		} catch (err) {
			console.error('Failed to save policy:', err);
			toast.error('Failed to save policy settings', {
				description: err instanceof Error ? err.message : 'Unknown error'
			});
		} finally {
			isSaving = false;
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

	function toggleModel(modelId: string) {
		if (allowedModels.includes(modelId)) {
			allowedModels = allowedModels.filter((m) => m !== modelId);
		} else {
			allowedModels = [...allowedModels, modelId];
		}
	}

	function isModelAllowed(modelId: string): boolean {
		return allowedModels.includes(modelId);
	}
</script>

<Card class={className}>
	<CardHeader>
		<div class="flex items-center justify-between">
			<div>
				<CardTitle class="text-lg">AI Policy</CardTitle>
				<CardDescription>Configure model allowlist and workflow defaults</CardDescription>
			</div>
			<Button
				variant="default"
				size="sm"
				onclick={handleSave}
				disabled={!hasChanges || isSaving || isLoadingCatalog}
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
			<!-- Allowed Models -->
			<div class="space-y-3">
				<div>
					<p class="text-sm font-medium">Allowed Models</p>
					<p class="text-xs text-muted-foreground">
						{allowedModels.length === 0
							? 'No models selected - all models from catalog are allowed'
							: `${allowedModels.length} model(s) selected`}
					</p>
				</div>

				<div class="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
					{#each getAllModels() as model}
						<label class="flex cursor-pointer items-start gap-2 rounded p-2 hover:bg-muted/50">
							<input
								type="checkbox"
								checked={isModelAllowed(model.id)}
								onchange={() => toggleModel(model.id)}
								class="mt-1"
							/>
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm font-medium">{model.name}</div>
								<div class="truncate font-mono text-xs text-muted-foreground">
									{model.id}
								</div>
							</div>
						</label>
					{/each}
				</div>
			</div>

			<!-- Workflow Defaults -->
			<div class="space-y-4">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<!-- Improve Workflow -->
					<div class="space-y-2">
						<label for="improve-model" class="text-sm font-medium"> Improve Default Model </label>
						<select
							id="improve-model"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							bind:value={improveDefaultModel}
						>
							<option value="">Select a model...</option>
							{#each getAllModels() as model}
								<option value={model.id}>{model.name}</option>
							{/each}
						</select>

						<label for="improve-temp" class="text-sm font-medium"> Improve Temperature </label>
						<Input
							id="improve-temp"
							type="number"
							min="0"
							max="1"
							step="0.1"
							bind:value={improveTemperature}
						/>
					</div>

					<!-- Judge Workflow -->
					<div class="space-y-2">
						<label for="judge-model" class="text-sm font-medium"> Judge Default Model </label>
						<select
							id="judge-model"
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							bind:value={judgeDefaultModel}
						>
							<option value="">Select a model...</option>
							{#each getAllModels() as model}
								<option value={model.id}>{model.name}</option>
							{/each}
						</select>

						<label for="judge-temp" class="text-sm font-medium"> Judge Temperature </label>
						<Input
							id="judge-temp"
							type="number"
							min="0"
							max="1"
							step="0.1"
							bind:value={judgeTemperature}
						/>
					</div>
				</div>
			</div>

			<!-- Advanced: Per-workflow allowed models -->
			<Collapsible title="Advanced: Per-Workflow Allowed Models">
				<div class="space-y-4 rounded bg-muted/30 p-4">
					<div class="text-sm text-muted-foreground">
						<p>
							Configure specific model allowlists for each workflow (Improve, Judge). When set,
							these override the global allowed models for that workflow.
						</p>
						<p class="mt-2 text-xs">
							<strong>Coming soon:</strong> This feature will be implemented in a future update.
						</p>
					</div>
				</div>
			</Collapsible>
		{/if}
	</CardContent>
</Card>
