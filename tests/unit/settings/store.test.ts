import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	SettingsSchemaRegistry,
	connectionBlock,
	providersBlock
} from '$lib/settings';
import { createSettingsStore } from '$lib/stores/settings.svelte';

describe('createSettingsStore', () => {
	let registry: SettingsSchemaRegistry;

	beforeEach(() => {
		registry = new SettingsSchemaRegistry();
		registry.registerBlock(connectionBlock);
	});

	describe('state', () => {
		it('should initialize with default values', () => {
			const store = createSettingsStore({ registry });
			expect(store.values['connection.mode']).toBe('local');
			expect(store.values['connection.local.port']).toBe(3000);
		});

		it('should initialize with provided values', () => {
			const store = createSettingsStore({
				registry,
				initialValues: { 'connection.mode': 'remote' }
			});
			expect(store.values['connection.mode']).toBe('remote');
		});

		it('should track dirty state', () => {
			const store = createSettingsStore({ registry });
			expect(store.dirty).toBe(false);

			store.setValue('connection.mode', 'remote');
			expect(store.dirty).toBe(true);
		});

		it('should track touched fields', () => {
			const store = createSettingsStore({ registry });
			expect(store.touched.has('connection.mode')).toBe(false);

			store.setValue('connection.mode', 'remote');
			expect(store.touched.has('connection.mode')).toBe(true);
		});
	});

	describe('setValue', () => {
		it('should update value', () => {
			const store = createSettingsStore({ registry });
			store.setValue('connection.mode', 'remote');
			expect(store.values['connection.mode']).toBe('remote');
		});

		it('should validate on change', () => {
			const store = createSettingsStore({ registry });
			store.setValue('connection.local.port', 'invalid');
			expect(store.hasFieldError('connection.local.port')).toBe(true);
		});

		it('should mark field as touched', () => {
			const store = createSettingsStore({ registry });
			store.setValue('connection.mode', 'remote');
			expect(store.touched.has('connection.mode')).toBe(true);
		});
	});

	describe('setValues', () => {
		it('should update multiple values', () => {
			const store = createSettingsStore({ registry });
			store.setValues({
				'connection.mode': 'remote',
				'connection.local.port': 8080
			});
			expect(store.values['connection.mode']).toBe('remote');
			expect(store.values['connection.local.port']).toBe(8080);
		});

		it('should validate all values', () => {
			const store = createSettingsStore({ registry });
			store.setValues({
				'connection.local.port': 'invalid'
			});
			expect(store.hasFieldError('connection.local.port')).toBe(true);
		});
	});

	describe('validation', () => {
		it('should validate single field', () => {
			const store = createSettingsStore({ registry });
			const valid = store.validateSetting('connection.local.port');
			expect(valid).toBe(true);
		});

		it('should return false for invalid field', () => {
			const store = createSettingsStore({ registry });
			store.setValues({ 'connection.local.port': 'invalid' });
			const valid = store.validateSetting('connection.local.port');
			expect(valid).toBe(false);
			expect(store.getFieldError('connection.local.port')).toBeDefined();
		});

		it('should validate all fields', () => {
			const store = createSettingsStore({ registry });
			store.touchAll();
			const valid = store.validateAll();
			expect(valid).toBe(true);
		});

		it('should validate only touched fields', () => {
			const store = createSettingsStore({ registry });
			// Initially no fields touched, validation passes
			const valid = store.validateTouched();
			expect(valid).toBe(true);

			// Set invalid value and touch it
			store.setValues({ 'connection.local.port': 'invalid' });
			// Now field is touched with invalid value
			const validAfterSet = store.validateTouched();
			expect(validAfterSet).toBe(false);
		});
	});

	describe('reset', () => {
		it('should reset to initial values', () => {
			const store = createSettingsStore({ registry });
			store.setValue('connection.mode', 'remote');
			expect(store.values['connection.mode']).toBe('remote');

			store.reset();
			expect(store.values['connection.mode']).toBe('local');
		});

		it('should clear errors', () => {
			const store = createSettingsStore({ registry });
			store.setValues({ 'connection.local.port': 'invalid' });
			expect(store.hasErrors).toBe(true);

			store.reset();
			expect(store.hasErrors).toBe(false);
		});

		it('should clear touched', () => {
			const store = createSettingsStore({ registry });
			store.setValue('connection.mode', 'remote');
			expect(store.touched.has('connection.mode')).toBe(true);

			store.reset();
			expect(store.touched.has('connection.mode')).toBe(false);
		});

		it('should reset dirty state', () => {
			const store = createSettingsStore({ registry });
			store.setValue('connection.mode', 'remote');
			expect(store.dirty).toBe(true);

			store.reset();
			expect(store.dirty).toBe(false);
		});
	});

	describe('resetField', () => {
		it('should reset single field to default', () => {
			const store = createSettingsStore({ registry });
			store.setValue('connection.mode', 'remote');

			store.resetField('connection.mode');
			expect(store.values['connection.mode']).toBe('local');
		});
	});

	describe('save', () => {
		it('should call onSave handler', async () => {
			const onSave = vi.fn().mockResolvedValue(undefined);
			const store = createSettingsStore({ registry, onSave });

			store.setValue('connection.mode', 'remote');
			const result = await store.save();

			expect(result).toBe(true);
			expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
				'connection.mode': 'remote'
			}));
		});

		it('should not save when there are errors', async () => {
			const onSave = vi.fn();
			const store = createSettingsStore({ registry, onSave });

			store.setValues({ 'connection.local.port': 'invalid' });
			const result = await store.save();

			expect(result).toBe(false);
			expect(onSave).not.toHaveBeenCalled();
		});

		it('should handle save error', async () => {
			const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
			const store = createSettingsStore({ registry, onSave });

			store.setValue('connection.mode', 'remote');
			const result = await store.save();

			expect(result).toBe(false);
			expect(store.saveError).toBe('Save failed');
		});

		it('should auto-save when enabled', async () => {
			const onSave = vi.fn().mockResolvedValue(undefined);
			const store = createSettingsStore({ registry, onSave, autoSave: true });

			store.setValue('connection.mode', 'remote');

			// Wait for async save
			await new Promise(resolve => setTimeout(resolve, 10));

			expect(onSave).toHaveBeenCalled();
		});
	});

	describe('visibility', () => {
		it('should get visible blocks', () => {
			const store = createSettingsStore({ registry });
			const blocks = store.visibleBlocks;
			expect(blocks.length).toBeGreaterThan(0);
		});

		it('should check block visibility', () => {
			const store = createSettingsStore({ registry });
			expect(store.isBlockVisible('connection')).toBe(true);
		});

		it('should check setting visibility', () => {
			const store = createSettingsStore({ registry });
			// connection.local.hostname is only visible when mode is 'local'
			expect(store.isFieldVisible('connection.local.hostname')).toBe(true);
		});

		it('should get visible settings for block', () => {
			const store = createSettingsStore({ registry });
			const settings = store.getVisibleSettings('connection');
			expect(settings.length).toBeGreaterThan(0);
		});
	});

	describe('changed settings', () => {
		it('should track changed fields', () => {
			const store = createSettingsStore({ registry });
			expect(store.changedSettings).toHaveLength(0);

			store.setValue('connection.mode', 'remote');
			expect(store.changedSettings).toContain('connection.mode');
		});

		it('should check if field is changed', () => {
			const store = createSettingsStore({ registry });
			expect(store.isFieldChanged('connection.mode')).toBe(false);

			store.setValue('connection.mode', 'remote');
			expect(store.isFieldChanged('connection.mode')).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should check if field has error', () => {
			const store = createSettingsStore({ registry });
			store.setValues({ 'connection.local.port': 'invalid' });
			expect(store.hasFieldError('connection.local.port')).toBe(true);
		});

		it('should get field error message', () => {
			const store = createSettingsStore({ registry });
			store.setValues({ 'connection.local.port': 'invalid' });
			const error = store.getFieldError('connection.local.port');
			expect(error).toBeDefined();
		});

		it('should get all errors', () => {
			const store = createSettingsStore({ registry });
			store.setValues({ 'connection.local.port': 'invalid' });
			const errors = store.getAllErrors();
			expect(errors.length).toBeGreaterThan(0);
		});
	});

	describe('touch', () => {
		it('should touch single field', () => {
			const store = createSettingsStore({ registry });
			store.touch('connection.mode');
			expect(store.touched.has('connection.mode')).toBe(true);
		});

		it('should touch all fields', () => {
			const store = createSettingsStore({ registry });
			store.touchAll();
			// Should have touched all settings
			const settingCount = registry.getAllSettings().length;
			expect(store.touched.size).toBe(settingCount);
		});
	});

	describe('resolveValue', () => {
		it('should resolve value through cascade', async () => {
			const store = createSettingsStore({
				registry,
				resolutionContext: {
					runOverrides: { 'connection.mode': 'remote' }
				}
			});

			const resolved = await store.resolveValue('connection.mode');
			expect(resolved.value).toBe('remote');
			expect(resolved.source).toBe('run');
		});
	});

	describe('impact analysis', () => {
		it('should get impact analysis', () => {
			registry.registerBlock(providersBlock);
			const store = createSettingsStore({ registry });

			const impact = store.getImpactAnalysis('connection.status');
			expect(impact.directlyAffected).toBeDefined();
			expect(impact.transitivelyAffected).toBeDefined();
		});
	});
});
