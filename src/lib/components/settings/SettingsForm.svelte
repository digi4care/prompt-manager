<script lang="ts">
	import type { SettingsSchemaRegistry } from '$lib/settings';
	import type { SettingsStore } from '$lib/stores/settings.svelte';
	import SettingsBlock from './SettingsBlock.svelte';

	interface Props {
		registry: SettingsSchemaRegistry;
		store: SettingsStore;
		onSave?: (values: Record<string, unknown>) => Promise<void>;
		saveLabel?: string;
		resetLabel?: string;
		showSaveButton?: boolean;
		showResetButton?: boolean;
		collapsible?: boolean;
	}

	let {
		registry,
		store,
		onSave,
		saveLabel = 'Save',
		resetLabel = 'Reset',
		showSaveButton = true,
		showResetButton = true,
		collapsible = true
	}: Props = $props();

	// Track collapsed state per block
	let collapsedBlocks = $state<Set<string>>(new Set());

	// Get visible blocks
	let blocks = $derived(store.visibleBlocks);

	// Toggle block collapse
	function toggleBlock(blockId: string) {
		const newSet = new Set(collapsedBlocks);
		if (newSet.has(blockId)) {
			newSet.delete(blockId);
		} else {
			newSet.add(blockId);
		}
		collapsedBlocks = newSet;
	}

	// Handle save
	async function handleSave() {
		await store.save();
		if (!store.saveError && onSave) {
			onSave(store.values);
		}
	}

	// Handle reset
	function handleReset() {
		store.reset();
	}

	// Expand all blocks
	function expandAll() {
		collapsedBlocks = new Set();
	}

	// Collapse all blocks
	function collapseAll() {
		collapsedBlocks = new Set(blocks.map(b => b.id));
	}
</script>

<form class="settings-form" onsubmit={(e) => e.preventDefault()}>
	<!-- Form Header -->
	<div class="form-header">
		<div class="form-title">
			<h2>Settings</h2>
			{#if store.dirty}
				<span class="unsaved-indicator">Unsaved changes</span>
			{/if}
		</div>
		{#if collapsible && blocks.length > 1}
			<div class="form-actions">
				<button type="button" class="text-button" onclick={expandAll}>
					Expand all
				</button>
				<button type="button" class="text-button" onclick={collapseAll}>
					Collapse all
				</button>
			</div>
		{/if}
	</div>

	<!-- Save Error -->
	{#if store.saveError}
		<div class="save-error" role="alert">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<span>{store.saveError}</span>
		</div>
	{/if}

	<!-- Form Fields -->
	<div class="form-blocks">
		{#each blocks as block (block.id)}
			<SettingsBlock
				{block}
				{store}
				collapsed={collapsible && collapsedBlocks.has(block.id)}
				onToggle={() => toggleBlock(block.id)}
			/>
		{:else}
			<div class="empty-state">
				<p>No settings available</p>
			</div>
		{/each}
	</div>

	<!-- Form Footer -->
	<div class="form-footer">
		{#if showResetButton}
			<button
				type="button"
				class="button secondary"
				onclick={handleReset}
				disabled={!store.dirty || store.saving}
			>
				{resetLabel}
			</button>
		{/if}
		{#if showSaveButton}
			<button
				type="submit"
				class="button primary"
				onclick={handleSave}
				disabled={!store.dirty || store.hasErrors || store.saving}
				class:saving={store.saving}
			>
				{#if store.saving}
					<span class="spinner"></span>
				{/if}
				{saveLabel}
			</button>
		{/if}
	</div>
</form>

<style>
	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 48rem;
		margin: 0 auto;
		padding: 1.5rem;
	}

	.form-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.form-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.form-title h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #111827);
	}

	.unsaved-indicator {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--warning-color, #f59e0b);
		background: var(--warning-bg, #fffbeb);
		border: 1px solid var(--warning-border, #fcd34d);
		border-radius: 9999px;
	}

	.form-actions {
		display: flex;
		gap: 0.5rem;
	}

	.text-button {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		color: var(--text-secondary, #6b7280);
		background: transparent;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.text-button:hover {
		color: var(--text-primary, #374151);
		background: var(--hover-bg, #f3f4f6);
	}

	.save-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		color: var(--error-color, #ef4444);
		background: var(--error-bg, #fef2f2);
		border: 1px solid var(--error-border, #fecaca);
		border-radius: 0.375rem;
	}

	.save-error svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.form-blocks {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.form-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color, #e5e7eb);
	}

	.button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid transparent;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.button.primary {
		color: white;
		background: var(--primary-color, #3b82f6);
		border-color: var(--primary-color, #3b82f6);
	}

	.button.primary:hover:not(:disabled) {
		background: var(--primary-hover, #2563eb);
		border-color: var(--primary-hover, #2563eb);
	}

	.button.secondary {
		color: var(--text-primary, #374151);
		background: white;
		border-color: var(--border-color, #d1d5db);
	}

	.button.secondary:hover:not(:disabled) {
		background: var(--hover-bg, #f9fafb);
	}

	.spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
