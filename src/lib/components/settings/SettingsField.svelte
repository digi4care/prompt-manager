
<script lang="ts">
	import type { SettingDefinition, SettingsBlock } from '$lib/settings';
	import type { SettingsStore } from '$lib/stores/settings.svelte';

	interface Props {
		block: SettingsBlock;
		setting: SettingDefinition;
		store: SettingsStore;
	}

	let { block, setting, store }: Props = $props();

	// Full key for this setting
	let fullKey = $derived(`${block.id}.${setting.key}`);

	// Current value from store
	let value = $derived(store.getFieldValue(fullKey));

	// Error state
	let error = $derived(store.getFieldError(fullKey));

	// Whether this field has been touched
	let isTouched = $derived(store.touched.has(fullKey));

	// Whether this field has changed from initial
	let isChanged = $derived(store.isFieldChanged(fullKey));

	// Whether this field has an error
	let hasError = $derived(store.hasFieldError(fullKey));

	// Handle value changes
	function handleChange(newValue: unknown) {
		store.setValue(fullKey, newValue);
	}

	// Handle text input changes
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		store.setValue(fullKey, target.value);
	}

	// Handle number input changes
	function handleNumberInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const numValue = target.value === '' ? '' : Number(target.value);
		store.setValue(fullKey, numValue);
	}

	// Handle checkbox changes
	function handleCheckbox(event: Event) {
		const target = event.target as HTMLInputElement;
		store.setValue(fullKey, target.checked);
	}

	// Handle select changes
	function handleSelect(event: Event) {
		const target = event.target as HTMLSelectElement;
		store.setValue(fullKey, target.value);
	}

	// Handle touch (blur)
	function handleBlur() {
		store.touch(fullKey);
	}

	// Reset to default
	function handleReset() {
		store.resetField(fullKey);
	}
</script>

<div
	class="settings-field"
	class:has-error={hasError}
	class:is-changed={isChanged}
	class:is-touched={isTouched}
	data-field-key={fullKey}
	data-field-type={setting.type}
>
	<div class="field-header">
		<label class="field-label" for={fullKey}>
			{setting.label}
			{#if setting.advanced}
				<span class="badge advanced">Advanced</span>
			{/if}
		</label>
		{#if isChanged}
			<button
				type="button"
				class="reset-button"
				onclick={handleReset}
				title="Reset to default"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
				</svg>
			</button>
		{/if}
	</div>

	{#if setting.description}
		<p class="field-description">{setting.description}</p>
	{/if}

	<div class="field-input">
		{#if setting.type === 'string'}
			<input
				id={fullKey}
				type="text"
				value={value as string}
				oninput={handleInput}
				onblur={handleBlur}
				class="input"
				class:error={hasError}
			/>
		{:else if setting.type === 'number'}
			<input
				id={fullKey}
				type="number"
				value={value as number}
				oninput={handleNumberInput}
				onblur={handleBlur}
				class="input"
				class:error={hasError}
			/>
		{:else if setting.type === 'boolean'}
			<label class="checkbox-label">
				<input
					type="checkbox"
					checked={value as boolean}
					onchange={handleCheckbox}
					onblur={handleBlur}
				/>
				<span class="checkmark"></span>
				<span class="checkbox-text">Enabled</span>
			</label>
		{:else if setting.type === 'enum'}
			<select
				id={fullKey}
				value={value as string}
				onchange={handleSelect}
				onblur={handleBlur}
				class="select"
				class:error={hasError}
			>
				{#each setting.options ?? [] as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		{:else if setting.type === 'array'}
			<!-- Array input - simple text area with comma separation for now -->
			{@const arrayValue = Array.isArray(value) ? value.join(', ') : ''}
			<input
				id={fullKey}
				type="text"
				value={arrayValue}
				oninput={(e) => {
					const val = (e.target as HTMLInputElement).value;
					handleChange(val.split(',').map(s => s.trim()).filter(Boolean));
				}}
				onblur={handleBlur}
				class="input"
				class:error={hasError}
				placeholder="Enter values separated by commas"
			/>
		{:else if setting.type === 'object'}
			<!-- Object input - simple text area with JSON for now -->
			{@const objectValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : '{}'}
			<textarea
				id={fullKey}
				value={objectValue}
				oninput={(e) => {
					try {
						const val = (e.target as HTMLTextAreaElement).value;
						handleChange(JSON.parse(val));
					} catch {
						// Invalid JSON, don't update
					}
				}}
				onblur={handleBlur}
				class="textarea"
				class:error={hasError}
				rows="4"
			/>
		{/if}
	</div>

	{#if error}
		<div class="field-error" role="alert">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="8" x2="12" y2="12" />
				<line x1="12" y1="16" x2="12.01" y2="16" />
			</svg>
			<span>{error}</span>
		</div>
	{/if}
</div>

<style>
	.settings-field {
		padding: 0.75rem;
		border-radius: 0.375rem;
		background: var(--field-bg, transparent);
		transition: background-color 0.15s;
	}

	.settings-field.has-error {
		background: var(--error-bg, #fef2f2);
	}

	.settings-field.is-changed {
		border-left: 3px solid var(--warning-color, #f59e0b);
	}

	.field-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.375rem;
	}

	.field-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #374151);
		cursor: pointer;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		border-radius: 9999px;
		background: var(--badge-bg, #e5e7eb);
		color: var(--badge-color, #6b7280);
	}

	.badge.advanced {
		background: var(--badge-advanced-bg, #dbeafe);
		color: var(--badge-advanced-color, #1e40af);
	}

	.field-description {
		margin: 0 0 0.5rem 0;
		font-size: 0.75rem;
		color: var(--text-secondary, #6b7280);
	}

	.reset-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--text-secondary, #6b7280);
		cursor: pointer;
		border-radius: 0.25rem;
		transition: all 0.15s;
	}

	.reset-button:hover {
		background: var(--hover-bg, #f3f4f6);
		color: var(--text-primary, #374151);
	}

	.reset-button svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.field-input {
		position: relative;
	}

	.input,
	.select,
	.textarea {
		width: 100%;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		color: var(--text-primary, #111827);
		background: var(--input-bg, white);
		border: 1px solid var(--input-border, #d1d5db);
		border-radius: 0.375rem;
		transition: all 0.15s;
	}

	.input:focus,
	.select:focus,
	.textarea:focus {
		outline: none;
		border-color: var(--input-focus-border, #3b82f6);
		box-shadow: 0 0 0 3px var(--input-focus-ring, rgba(59, 130, 246, 0.1));
	}

	.input.error,
	.select.error,
	.textarea.error {
		border-color: var(--error-color, #ef4444);
		background: var(--input-error-bg, #fef2f2);
	}

	.select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		background-size: 1rem;
		padding-right: 2.5rem;
	}

	.textarea {
		resize: vertical;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 0.8125rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.checkmark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--checkbox-border, #d1d5db);
		border-radius: 0.25rem;
		background: var(--checkbox-bg, white);
		transition: all 0.15s;
	}

	.checkbox-label input[type="checkbox"]:checked + .checkmark {
		background: var(--checkbox-checked-bg, #3b82f6);
		border-color: var(--checkbox-checked-bg, #3b82f6);
	}

	.checkmark::after {
		content: '';
		width: 0.375rem;
		height: 0.75rem;
		border: solid white;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg) translateY(-1px);
		opacity: 0;
		transition: opacity 0.15s;
	}

	.checkbox-label input[type="checkbox"]:checked + .checkmark::after {
		opacity: 1;
	}

	.checkbox-text {
		font-size: 0.875rem;
		color: var(--text-primary, #374151);
	}

	.field-error {
		display: flex;
		align-items: flex-start;
		gap: 0.375rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--error-color, #ef4444);
	}

	.field-error svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		margin-top: 0.0625rem;
	}
</style>
