<script lang="ts">
	// @ts-nocheck
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';
	import { dateFormatStore } from '$lib/stores/date-format.svelte';
	import { formatDateString } from '$lib/utils/date';

	export interface SettingsByCategory {
		models: Record<string, string>;
		temperature: Record<string, string>;
		reasoning: Record<string, string>;
		providers: Record<string, string>;
		display: Record<string, string>;
	}

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();

	// Tab definitions
	interface Tab {
		id: string;
		label: string;
		icon: string;
	}

	const tabs: Tab[] = [
		{ id: 'display', label: 'Display', icon: '🎨' },
		{ id: 'content', label: 'Content Types', icon: '📁' },
		{ id: 'models', label: 'AI Models', icon: '🤖' },
		{ id: 'temp-reason', label: 'Temp & Reason', icon: '🌡️' },
		{ id: 'providers', label: 'Providers', icon: '🔌' }
	];

	// State
	let settings = $state<SettingsByCategory>({
		models: {},
		temperature: {},
		reasoning: {},
		providers: {},
		display: {}
	});
	let isLoading = $state(true);
	let isSaving = $state(false);
	let error = $state<string | null>(null);
	let activeTab = $state('display');

	// Content Types state (managed via admin settings)
	let purposes = $state<string[]>([]);
	let llmProviders = $state<string[]>([]);
	let newPurpose = $state('');
	let newLlmProvider = $state('');

	// Form state for edited values
	let editedSettings = $state<Record<string, string>>({});
	let hasChanges = $derived(Object.keys(editedSettings).length > 0);

	// Load settings on mount
	$effect(() => {
		loadSettings();
	});

	async function loadSettings(): Promise<void> {
		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/admin/settings');

			if (!response.ok) {
				throw new Error(`Failed to load settings: ${response.statusText}`);
			}

			const data = await response.json();
			settings = data.data;

			// Load purposes and LLM providers from settings
			purposes = parseList(
				settings.display?.purposes || 'development,writing,analysis,creative,general'
			);
			llmProviders = parseList(
				settings.display?.llm_providers || 'anthropic,openai,openrouter,minimax,deepseek,gemini'
			);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load settings';
			toast.error('Failed to load settings', {
				description: error
			});
		} finally {
			isLoading = false;
		}
	}

	function parseList(value: string): string[] {
		return value
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}

	function stringifyList(items: string[]): string {
		return items.join(',');
	}

	function handleChange(key: string, value: string): void {
		// Find original value
		let originalValue = '';
		for (const category of Object.values(settings)) {
			if (category[key]) {
				originalValue = category[key];
				break;
			}
		}

		// If value changed, add to editedSettings
		if (value !== originalValue) {
			editedSettings[key] = value;
		} else {
			// If value reverted to original, remove from editedSettings
			delete editedSettings[key];
		}
	}

	async function handleSave(): Promise<void> {
		if (!hasChanges || isSaving) return;

		isSaving = true;
		error = null;

		try {
			// Include purposes and LLM providers in edited settings
			const allUpdates = { ...editedSettings };
			if (editedPurposes || editedLlmProviders) {
				if (editedPurposes) allUpdates['purposes'] = stringifyList(purposes);
				if (editedLlmProviders) allUpdates['llm_providers'] = stringifyList(llmProviders);
			}

			// Update each changed setting
			const updatePromises = Object.entries(allUpdates).map(([key, value]) =>
				fetch(`/api/admin/settings/${key}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ value, updatedBy: 'admin' })
				})
			);

			const responses = await Promise.all(updatePromises);

			// Check if all succeeded
			const failedResponses = responses.filter((r) => !r.ok);
			if (failedResponses.length > 0) {
				throw new Error(`Failed to update ${failedResponses.length} setting(s)`);
			}

			toast.success('Settings saved successfully');

			// Refresh date format store if date format changed
			if (Object.keys(editedSettings).includes('date_format')) {
				await dateFormatStore.refresh();
			}

			// Reload settings to get updated values
			await loadSettings();

			// Clear edited state
			editedSettings = {};
			editedPurposes = false;
			editedLlmProviders = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save settings';
			toast.error('Failed to save settings', {
				description: error
			});
		} finally {
			isSaving = false;
		}
	}

	async function handleReset(): Promise<void> {
		if (isSaving) return;

		const confirmed = confirm(
			'Reset all settings to defaults? This will discard all custom configurations.'
		);

		if (!confirmed) return;

		isSaving = true;
		error = null;

		try {
			const response = await fetch('/api/admin/settings/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				throw new Error(`Failed to reset settings: ${response.statusText}`);
			}

			toast.success('Settings reset to defaults');

			// Refresh date format store
			await dateFormatStore.refresh();

			// Reload settings
			await loadSettings();

			// Clear edited state
			editedSettings = {};
			editedPurposes = false;
			editedLlmProviders = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to reset settings';
			toast.error('Failed to reset settings', {
				description: error
			});
		} finally {
			isSaving = false;
		}
	}

	function getCurrentValue(category: keyof SettingsByCategory, key: string): string {
		return editedSettings[key] ?? settings[category][key] ?? '';
	}

	function getDisplayLabel(key: string): string {
		return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	// Content Types management
	let editedPurposes = $state(false);
	let editedLlmProviders = $state(false);

	function addPurpose() {
		const trimmed = newPurpose.trim().toLowerCase();
		if (trimmed && !purposes.includes(trimmed)) {
			purposes = [...purposes, trimmed];
			editedPurposes = true;
			newPurpose = '';
		}
	}

	function removePurpose(purpose: string) {
		purposes = purposes.filter((p) => p !== purpose);
		editedPurposes = true;
	}

	function addLlmProvider() {
		const trimmed = newLlmProvider.trim().toLowerCase();
		if (trimmed && !llmProviders.includes(trimmed)) {
			llmProviders = [...llmProviders, trimmed];
			editedLlmProviders = true;
			newLlmProvider = '';
		}
	}

	function removeLlmProvider(provider: string) {
		llmProviders = llmProviders.filter((p) => p !== provider);
		editedLlmProviders = true;
	}

	const contentHasChanges = $derived(editedPurposes || editedLlmProviders);
	const totalHasChanges = $derived(hasChanges || contentHasChanges);
</script>

<div class={cn('settings-panel', className)}>
	{#if isLoading}
		<div class="flex items-center justify-center p-8">
			<div
				class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-gray-100"
			></div>
		</div>
	{:else}
		<div class="flex flex-col gap-6 md:flex-row">
			<!-- Vertical Tabs -->
			<nav class="shrink-0 md:w-48">
				<ul class="space-y-1">
					{#each tabs as tab}
						<li>
							<button
								type="button"
								class={cn(
									'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors',
									activeTab === tab.id
										? 'bg-primary font-medium text-primary-foreground'
										: 'hover:bg-muted'
								)}
								onclick={() => (activeTab = tab.id)}
							>
								<span class="text-lg">{tab.icon}</span>
								<span>{tab.label}</span>
							</button>
						</li>
					{/each}
				</ul>
			</nav>

			<!-- Content Area -->
			<main class="flex-1 space-y-6">
				<!-- Display Tab -->
				{#if activeTab === 'display'}
					<div class="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Display Settings</CardTitle>
								<CardDescription>Configure how dates and times are displayed</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
									<label for="date_format" class="text-sm font-medium">Date Format</label>
									<select
										id="date_format"
										class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
										value={getCurrentValue('display', 'date_format')}
										onchange={(e) => handleChange('date_format', e.currentTarget.value)}
									>
										<option value="F j, Y">January 1, 2025</option>
										<option value="M j, Y">Jan 1, 2025</option>
										<option value="Y-m-d">2025-01-01</option>
										<option value="m/d/Y">01/01/2025 (US)</option>
										<option value="d/m/Y">01/01/2025 (EU)</option>
										<option value="j. F Y">1. January 2025</option>
									</select>
								</div>
								<div class="text-sm text-muted-foreground">
									Preview: {formatDateString(
										new Date(),
										getCurrentValue('display', 'date_format') || 'M j, Y'
									)}
								</div>
							</CardContent>
						</Card>
					</div>
				{/if}

				<!-- Content Types Tab -->
				{#if activeTab === 'content'}
					<div class="space-y-6">
						<!-- Purposes -->
						<Card>
							<CardHeader>
								<CardTitle>Purposes</CardTitle>
								<CardDescription
									>Define the purpose categories for your prompts (e.g., development, writing,
									analysis)</CardDescription
								>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="flex flex-wrap gap-2">
									{#each purposes as purpose}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-300"
										>
											{purpose}
											<button
												type="button"
												class="ml-1 hover:text-blue-600 dark:hover:text-blue-200"
												onclick={() => removePurpose(purpose)}
											>
												&times;
											</button>
										</span>
									{/each}
								</div>
								<div class="flex gap-2">
									<Input
										bind:value={newPurpose}
										placeholder="Add new purpose..."
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addPurpose();
											}
										}}
									/>
									<Button type="button" variant="secondary" onclick={addPurpose}>Add</Button>
								</div>
							</CardContent>
						</Card>

						<!-- LLM Providers -->
						<Card>
							<CardHeader>
								<CardTitle>LLM Providers</CardTitle>
								<CardDescription
									>Define which LLM providers can be used with prompts (e.g., anthropic, openai,
									minimax)</CardDescription
								>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="flex flex-wrap gap-2">
									{#each llmProviders as provider}
										<span
											class="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900 dark:text-green-300"
										>
											{provider}
											<button
												type="button"
												class="ml-1 hover:text-green-600 dark:hover:text-green-200"
												onclick={() => removeLlmProvider(provider)}
											>
												&times;
											</button>
										</span>
									{/each}
								</div>
								<div class="flex gap-2">
									<Input
										bind:value={newLlmProvider}
										placeholder="Add new provider..."
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addLlmProvider();
											}
										}}
									/>
									<Button type="button" variant="secondary" onclick={addLlmProvider}>Add</Button>
								</div>
							</CardContent>
						</Card>

						<!-- Info Card -->
						<Card class="border-dashed">
							<CardContent class="pt-6">
								<div class="flex gap-3">
									<span class="text-2xl">💡</span>
									<div class="text-sm text-muted-foreground">
										<p class="mb-1 font-medium text-foreground">How this works</p>
										These values are used when creating or editing prompts.<strong>Purposes</strong>
										categorize what the prompt is for. <strong>LLM Providers</strong> define which AI
										services can be used with the prompt (multi-select in the prompt form).
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				{/if}

				<!-- AI Models Tab -->
				{#if activeTab === 'models'}
					<div class="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Model Configuration</CardTitle>
								<CardDescription>
									Configure AI models for different routing categories (Claude Code Mux)
								</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								{#each Object.entries(settings.models) as [key, value]}
									<div class="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
										<label for={key} class="text-sm font-medium">
											{getDisplayLabel(key)}
										</label>
										<Input
											id={key}
											type="text"
											value={getCurrentValue('models', key)}
											oninput={(e) => handleChange(key, e.currentTarget.value)}
											placeholder="e.g., MiniMax-M2.1"
										/>
									</div>
								{/each}
							</CardContent>
						</Card>
					</div>
				{/if}

				<!-- Temperature & Reasoning Tab -->
				{#if activeTab === 'temp-reason'}
					<div class="space-y-6">
						<!-- Temperature -->
						<Card>
							<CardHeader>
								<CardTitle>Temperature Settings</CardTitle>
								<CardDescription>
									Control creativity vs consistency (0.0 = deterministic, 1.0 = creative)
								</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								{#each Object.entries(settings.temperature) as [key, value]}
									<div class="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
										<label for={key} class="text-sm font-medium">
											{getDisplayLabel(key)}
										</label>
										<Input
											id={key}
											type="number"
											min="0"
											max="1"
											step="0.1"
											value={getCurrentValue('temperature', key)}
											oninput={(e) => handleChange(key, e.currentTarget.value)}
										/>
									</div>
								{/each}
							</CardContent>
						</Card>

						<!-- Reasoning -->
						<Card>
							<CardHeader>
								<CardTitle>Reasoning Settings</CardTitle>
								<CardDescription>Configure AI thinking/reasoning output behavior</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								{#each Object.entries(settings.reasoning) as [key, value]}
									<div class="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
										<label for={key} class="text-sm font-medium">
											{getDisplayLabel(key)}
										</label>
										{#if key.includes('store') || key.includes('show')}
											<select
												id={key}
												class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
												value={getCurrentValue('reasoning', key)}
												onchange={(e) => handleChange(key, e.currentTarget.value)}
											>
												<option value="true">Enabled</option>
												<option value="false">Disabled</option>
											</select>
										{:else}
											<Input
												id={key}
												type="number"
												value={getCurrentValue('reasoning', key)}
												oninput={(e) => handleChange(key, e.currentTarget.value)}
											/>
										{/if}
									</div>
								{/each}
							</CardContent>
						</Card>
					</div>
				{/if}

				<!-- Providers Tab -->
				{#if activeTab === 'providers'}
					<div class="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Provider Configuration</CardTitle>
								<CardDescription>Configure AI provider priority and settings</CardDescription>
							</CardHeader>
							<CardContent class="space-y-4">
								{#each Object.entries(settings.providers) as [key, value]}
									<div class="grid grid-cols-1 items-center gap-4 md:grid-cols-2">
										<label for={key} class="text-sm font-medium">
											{getDisplayLabel(key)}
										</label>
										<Input
											id={key}
											type="text"
											value={getCurrentValue('providers', key)}
											oninput={(e) => handleChange(key, e.currentTarget.value)}
											placeholder="e.g., anthropic,openrouter,minimax"
										/>
									</div>
								{/each}
							</CardContent>
						</Card>
					</div>
				{/if}

				<!-- Action Buttons -->
				<div class="flex items-center justify-between gap-4 border-t pt-4">
					<Button variant="destructive" onclick={handleReset} disabled={isSaving}>
						Reset to Defaults
					</Button>

					<Button onclick={handleSave} disabled={!totalHasChanges || isSaving}>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>

				{#if totalHasChanges}
					<p class="text-sm text-muted-foreground">
						You have unsaved changes. Click "Save Changes" to apply them.
					</p>
				{/if}
			</main>
		</div>
	{/if}
</div>
