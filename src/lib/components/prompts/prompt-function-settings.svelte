<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
	import { Badge } from '$lib/components/ui/badge';
	import { RotateCcw, Settings2, ChevronDown, ChevronUp } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import * as m from '$lib/paraglide/messages.js';

	type FunctionType = 'executor' | 'judge' | 'improve' | 'council';

	interface FunctionSettings {
		modelOverride?: string | null;
		modelVariantOverride?: string | null;
		temperature?: number | null;
		maxTokens?: number | null;
	}

	interface Props {
		promptId: number;
	}

	let { promptId }: Props = $props();

	// State
	let settings = $state<Record<FunctionType, FunctionSettings>>({
		executor: {},
		judge: {},
		improve: {},
		council: {}
	});
	let loading = $state(true);
	let saving = $state<Record<FunctionType, boolean>>({
		executor: false,
		judge: false,
		improve: false,
		council: false
	});
	let expandedSections = $state<Record<FunctionType, boolean>>({
		executor: true,
		judge: false,
		improve: false,
		council: false
	});

	// Local form state (for debounced saving)
	let localSettings = $state<Record<FunctionType, FunctionSettings>>({ ...settings });

	const functionLabels: Record<FunctionType, { label: string; description: string }> = {
		executor: { label: 'Executor', description: 'Main prompt execution' },
		judge: { label: 'Judge', description: 'Evaluation and scoring' },
		improve: { label: 'Improve', description: 'Prompt improvement suggestions' },
		council: { label: 'Council', description: 'Multi-agent review' }
	};

	async function fetchSettings() {
		try {
			const response = await fetch(`/api/prompts/${promptId}/settings`);
			if (response.ok) {
				const data = await response.json();
				// Convert array to record
				const record: Record<FunctionType, FunctionSettings> = {
					executor: {},
					judge: {},
					improve: {},
					council: {}
				};
				for (const item of data.data || []) {
					const ft = item.functionType as FunctionType;
					record[ft] = {
						modelOverride: item.modelOverride,
						modelVariantOverride: item.modelVariantOverride,
						temperature: item.temperature,
						maxTokens: item.maxTokens
					};
				}
				settings = record;
				localSettings = JSON.parse(JSON.stringify(record));
			}
		} catch (error) {
			console.error('Failed to fetch settings:', error);
		} finally {
			loading = false;
		}
	}

	async function saveSettings(functionType: FunctionType) {
		saving[functionType] = true;
		try {
			const response = await fetch(`/api/prompts/${promptId}/settings`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					functionType,
					settings: {
						modelOverride: localSettings[functionType].modelOverride || null,
						modelVariantOverride: localSettings[functionType].modelVariantOverride || null,
						temperature: localSettings[functionType].temperature ?? null,
						maxTokens: localSettings[functionType].maxTokens ?? null
					}
				})
			});

			if (response.ok) {
				settings[functionType] = { ...localSettings[functionType] };
			}
		} catch (error) {
			console.error('Failed to save settings:', error);
		} finally {
			saving[functionType] = false;
		}
	}

	function resetSettings(functionType: FunctionType) {
		localSettings[functionType] = {
			modelOverride: null,
			modelVariantOverride: null,
			temperature: null,
			maxTokens: null
		};
		saveSettings(functionType);
	}

	function toggleSection(functionType: FunctionType) {
		expandedSections[functionType] = !expandedSections[functionType];
	}

	function hasOverrides(ft: FunctionType): boolean {
		const s = settings[ft];
		return !!(s.modelOverride || s.modelVariantOverride || s.temperature || s.maxTokens);
	}

	function isDirty(ft: FunctionType): boolean {
		const local = localSettings[ft];
		const saved = settings[ft];
		return (
			local.modelOverride !== saved.modelOverride ||
			local.modelVariantOverride !== saved.modelVariantOverride ||
			local.temperature !== saved.temperature ||
			local.maxTokens !== saved.maxTokens
		);
	}

	onMount(fetchSettings);
</script>

<div class="rounded-lg border bg-card p-4">
	<div class="mb-4 flex items-center gap-2">
		<Settings2 class="h-4 w-4 text-muted-foreground" />
		<h2 class="font-semibold">{m['common.edit']()} Overrides</h2>
	</div>
	<p class="mb-4 text-xs text-muted-foreground">
		Override default settings for this prompt. Leave empty to use global defaults.
	</p>

	{#if loading}
		<div class="py-4 text-center text-sm text-muted-foreground">{m['common.loading']()}</div>
	{:else}
		<div class="space-y-2">
			{#each ['executor', 'judge', 'improve', 'council'] as FunctionType[] as ft}
				<div class="rounded-md border">
					<!-- Section Header -->
					<button
						type="button"
						onclick={() => toggleSection(ft)}
						class="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/50"
					>
						<div class="flex items-center gap-2">
							<span class="font-medium">{functionLabels[ft].label}</span>
							<span class="text-xs text-muted-foreground">{functionLabels[ft].description}</span>
							{#if hasOverrides(ft)}
								<Badge variant="secondary" class="text-xs">Override</Badge>
							{/if}
							{#if isDirty(ft)}
								<Badge variant="outline" class="text-xs text-amber-600">Unsaved</Badge>
							{/if}
						</div>
						{#if expandedSections[ft]}
							<ChevronUp class="h-4 w-4 text-muted-foreground" />
						{:else}
							<ChevronDown class="h-4 w-4 text-muted-foreground" />
						{/if}
					</button>

					<!-- Section Content -->
					{#if expandedSections[ft]}
						<div class="border-t p-3">
							<div class="grid gap-4">
								<!-- Model Override -->
								<div>
									<label class="mb-1.5 block text-xs font-medium">Model Override</label>
									<Input
										type="text"
										placeholder="e.g., gpt-4o, claude-3-opus"
										value={localSettings[ft].modelOverride || ''}
										onchange={(e: Event) => {
											const target = e.currentTarget as HTMLInputElement;
											localSettings[ft].modelOverride = target.value || null;
										}}
									/>
								</div>

								<!-- Model Variant Override -->
								<div>
									<label class="mb-1.5 block text-xs font-medium">Model Variant</label>
									<Input
										type="text"
										placeholder="e.g., latest, stable"
										value={localSettings[ft].modelVariantOverride || ''}
										onchange={(e: Event) => {
											const target = e.currentTarget as HTMLInputElement;
											localSettings[ft].modelVariantOverride = target.value || null;
										}}
									/>
								</div>

								<!-- Temperature -->
								<div>
									<label class="mb-1.5 block text-xs font-medium">
										Temperature: {localSettings[ft].temperature?.toFixed(2) ?? 'Default'}
									</label>
									<Slider
										value={[localSettings[ft].temperature ?? 0.7]}
										min={0}
										max={2}
										step={0.1}
										type="multiple"
										onValueChange={(v: number[]) => {
											localSettings[ft].temperature = v[0];
										}}
									/>
								</div>

								<!-- Max Tokens -->
								<div>
									<label class="mb-1.5 block text-xs font-medium">Max Tokens</label>
									<Input
										type="number"
										placeholder="e.g., 4096"
										value={localSettings[ft].maxTokens ?? ''}
										onchange={(e: Event) => {
											const target = e.currentTarget as HTMLInputElement;
											const val = parseInt(target.value);
											localSettings[ft].maxTokens = isNaN(val) ? null : val;
										}}
									/>
								</div>

								<!-- Actions -->
								<div class="flex justify-end gap-2">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => resetSettings(ft)}
										disabled={!hasOverrides(ft)}
									>
										<RotateCcw class="mr-1 h-3 w-3" />
										{m['common.reset']()}
									</Button>
									<Button
										size="sm"
										onclick={() => saveSettings(ft)}
										disabled={saving[ft] || !isDirty(ft)}
									>
										{saving[ft] ? 'Saving...' : m['common.save']()}
									</Button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
