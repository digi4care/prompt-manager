
<script lang="ts">
	import type { SettingsBlock as BlockType } from '$lib/settings';
	import type { SettingsStore } from '$lib/stores/settings.svelte';
	import SettingsField from './SettingsField.svelte';

	interface Props {
		block: BlockType;
		store: SettingsStore;
		collapsed?: boolean;
		onToggle?: () => void;
	}

	let { block, store, collapsed = false, onToggle }: Props = $props();

	// Get visible settings for this block
	let visibleSettings = $derived(store.getVisibleSettings(block.id));

	// Check if block has any errors
	let hasErrors = $derived(
		visibleSettings.some((setting) => store.hasFieldError(`${block.id}.${setting.key}`))
	);

	// Check if block has any changes
	let hasChanges = $derived(
		visibleSettings.some((setting) => store.isFieldChanged(`${block.id}.${setting.key}`))
	);

	// Group settings by category
	let groupedSettings = $derived(() => {
		const groups: Record<string, typeof visibleSettings> = {};
		const defaultKey = 'default';

		for (const setting of visibleSettings) {
			const category = setting.category ?? defaultKey;
			if (!groups[category]) {
				groups[category] = [];
			}
			groups[category].push(setting);
		}

		// Sort settings within each group by order
		for (const category of Object.keys(groups)) {
			groups[category].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
		}

		return groups;
	});

	// Get unique categories in order of first appearance
	let categories = $derived(() => {
		const seen = new Set<string>();
		const result: string[] = [];
		const defaultKey = 'default';

		for (const setting of visibleSettings) {
			const category = setting.category ?? defaultKey;
			if (!seen.has(category)) {
				seen.add(category);
				result.push(category);
			}
		}

		return result;
	});
</script>

<div class="settings-block" data-block-id={block.id}>
	<button
		type="button"
		class="block-header"
		onclick={onToggle}
		aria-expanded={!collapsed}
	>
		<div class="block-title">
			<span class="block-icon">
				{#if block.icon}
					{@const Icon = block.icon}
					<Icon />
				{:else}
					<svg
						class="icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
				{/if}
			</span>
			<div class="block-info">
				<h3 class="block-label">{block.label}</h3>
				{#if block.description}
					<p class="block-description">{block.description}</p>
				{/if}
			</div>
		</div>
		<div class="block-indicators">
			{#if hasErrors}
				<span class="indicator error" title="Has validation errors">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</span>
			{/if}
			{#if hasChanges}
				<span class="indicator changed" title="Has unsaved changes">
					<svg viewBox="0 0 24 24" fill="currentColor">
						<circle cx="12" cy="12" r="6" />
					</svg>
				</span>
			{/if}
			<span class="collapse-indicator" aria-hidden="true">
				{#if collapsed}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6" />
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="6 9 12 15 18 9" />
					</svg>
				{/if}
			</span>
		</div>
	</button>

	{#if !collapsed}
		<div class="block-content">
			{#each categories() as category}
				{@const settings = groupedSettings()[category]}
				{#if settings?.length > 0}
					{#if category !== 'default'}
						<div class="category-header">
							<h4 class="category-label">{category}</h4>
						</div>
					{/if}
					<div class="settings-group">
						{#each settings as setting (setting.key)}
							<SettingsField
								{block}
								{setting}
								{store}
							/>
						{/each}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.settings-block {
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.5rem;
		background: var(--bg-color, white);
		overflow: hidden;
	}

	.block-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 1rem;
		background: var(--header-bg, #f9fafb);
		border: none;
		cursor: pointer;
		text-align: left;
		transition: background-color 0.15s;
	}

	.block-header:hover {
		background: var(--header-hover-bg, #f3f4f6);
	}

	.block-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
	}

	.block-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		color: var(--icon-color, #6b7280);
	}

	.block-icon :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
	}

	.block-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.block-label {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.block-description {
		margin: 0;
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.block-indicators {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
	}

	.indicator svg {
		width: 1rem;
		height: 1rem;
	}

	.indicator.error {
		color: var(--error-color, #ef4444);
	}

	.indicator.changed {
		color: var(--warning-color, #f59e0b);
	}

	.collapse-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		color: var(--text-secondary, #6b7280);
	}

	.collapse-indicator svg {
		width: 1rem;
		height: 1rem;
	}

	.block-content {
		padding: 1rem;
		border-top: 1px solid var(--border-color, #e5e7eb);
	}

	.category-header {
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.category-label {
		margin: 0;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary, #6b7280);
	}

	.settings-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.settings-group + .category-header {
		margin-top: 1.5rem;
	}
</style>
