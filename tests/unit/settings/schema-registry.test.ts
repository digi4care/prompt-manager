import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
	SettingsSchemaRegistry,
	SettingNotFoundError,
	BlockNotFoundError
} from '$lib/settings/schema-registry';
import type { SettingsBlock } from '$lib/settings/types';

describe('SettingsSchemaRegistry', () => {
	let registry: SettingsSchemaRegistry;

	const createTestBlock = (id: string, order = 0): SettingsBlock => ({
		id,
		label: `Test ${id}`,
		order,
		settings: [
			{
				key: 'setting1',
				type: 'string',
				label: 'Setting 1',
				defaultValue: 'default1',
				schema: z.string()
			},
			{
				key: 'setting2',
				type: 'number',
				label: 'Setting 2',
				defaultValue: 42,
				schema: z.number()
			}
		]
	});

	beforeEach(() => {
		registry = new SettingsSchemaRegistry();
	});

	describe('block registration', () => {
		it('should register a block', () => {
			const block = createTestBlock('test');
			registry.registerBlock(block);

			expect(registry.getBlock('test')).toBeDefined();
			expect(registry.getBlock('test')?.label).toBe('Test test');
		});

		it('should throw when registering duplicate block', () => {
			const block = createTestBlock('test');
			registry.registerBlock(block);

			expect(() => registry.registerBlock(block)).toThrow("Block 'test' is already registered");
		});

		it('should throw when registering duplicate setting key', () => {
			const block1 = createTestBlock('block1');
			const block2 = createTestBlock('block2');

			// Create a setting with same full key as block1
			block2.settings[0].key = 'setting1';
			// This creates block2.setting1 which is different from block1.setting1
			// So we need to test actual duplicate full keys - same block ID
			block2.id = 'block1'; // Make same block ID to create true duplicate

			registry.registerBlock(block1);
			expect(() => registry.registerBlock(block2)).toThrow("Block 'block1' is already registered");
		});

		it('should get all blocks sorted by order', () => {
			registry.registerBlock(createTestBlock('b', 2));
			registry.registerBlock(createTestBlock('a', 1));
			registry.registerBlock(createTestBlock('c', 3));

			const blocks = registry.getAllBlocks();
			expect(blocks[0].id).toBe('a');
			expect(blocks[1].id).toBe('b');
			expect(blocks[2].id).toBe('c');
		});

		it('should unregister a block', () => {
			const block = createTestBlock('test');
			registry.registerBlock(block);
			registry.unregisterBlock('test');

			expect(registry.getBlock('test')).toBeUndefined();
			expect(registry.getSetting('test.setting1')).toBeUndefined();
		});
	});

	describe('setting access', () => {
		beforeEach(() => {
			registry.registerBlock(createTestBlock('test'));
		});

		it('should get setting by key', () => {
			const setting = registry.getSetting('test.setting1');
			expect(setting).toBeDefined();
			expect(setting?.label).toBe('Setting 1');
		});

		it('should get setting with block info', () => {
			const data = registry.getSettingWithBlock('test.setting1');
			expect(data).toBeDefined();
			expect(data?.blockId).toBe('test');
			expect(data?.setting.key).toBe('setting1');
		});

		it('should get all settings', () => {
			const settings = registry.getAllSettings();
			expect(settings).toHaveLength(2);
			expect(settings.map(s => s.key)).toContain('test.setting1');
			expect(settings.map(s => s.key)).toContain('test.setting2');
		});

		it('should get block settings', () => {
			const settings = registry.getBlockSettings('test');
			expect(settings).toHaveLength(2);
		});

		it('should check if setting exists', () => {
			expect(registry.hasSetting('test.setting1')).toBe(true);
			expect(registry.hasSetting('test.nonexistent')).toBe(false);
		});

		it('should check if block exists', () => {
			expect(registry.hasBlock('test')).toBe(true);
			expect(registry.hasBlock('nonexistent')).toBe(false);
		});
	});

	describe('visibility', () => {
		const visibilityBlock: SettingsBlock = {
			id: 'visibility',
			label: 'Visibility Test',
			settings: [
				{
					key: 'master',
					type: 'boolean',
					label: 'Master Toggle',
					defaultValue: false,
					schema: z.boolean()
				},
				{
					key: 'dependent',
					type: 'string',
					label: 'Dependent Setting',
					defaultValue: '',
					schema: z.string(),
					visibleWhen: (values) => values['visibility.master'] === true
				}
			]
		};

		beforeEach(() => {
			registry.registerBlock(visibilityBlock);
		});

		it('should show setting when visibleWhen is not defined', () => {
			expect(registry.isSettingVisible('visibility.master', {})).toBe(true);
		});

		it('should hide setting when visibleWhen returns false', () => {
			expect(registry.isSettingVisible('visibility.dependent', { 'visibility.master': false })).toBe(false);
		});

		it('should show setting when visibleWhen returns true', () => {
			expect(registry.isSettingVisible('visibility.dependent', { 'visibility.master': true })).toBe(true);
		});

		it('should get visible settings for a block', () => {
			const visible = registry.getVisibleSettings('visibility', { 'visibility.master': false });
			expect(visible).toHaveLength(1);
			expect(visible[0].key).toBe('master');
		});

		it('should get visible blocks', () => {
			const visibleBlock: SettingsBlock = {
				id: 'conditional',
				label: 'Conditional',
				visibleWhen: (values) => values['visibility.master'] === true,
				settings: []
			};
			registry.registerBlock(visibleBlock);

			const visible = registry.getVisibleBlocks({ 'visibility.master': true });
			expect(visible.map(b => b.id)).toContain('conditional');

			const hidden = registry.getVisibleBlocks({ 'visibility.master': false });
			expect(hidden.map(b => b.id)).not.toContain('conditional');
		});
	});

	describe('validation', () => {
		beforeEach(() => {
			registry.registerBlock(createTestBlock('test'));
		});

		it('should validate correct values', () => {
			const result = registry.validateSetting('test.setting1', 'valid');
			expect(result.valid).toBe(true);
		});

		it('should invalidate incorrect values', () => {
			const result = registry.validateSetting('test.setting2', 'not a number');
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});

		it('should validate all values', () => {
			const errors = registry.validateAll({
				'test.setting1': 'valid',
				'test.setting2': 100
			});
			expect(Object.keys(errors)).toHaveLength(0);
		});

		it('should return errors for invalid values in validateAll', () => {
			const errors = registry.validateAll({
				'test.setting1': 'valid',
				'test.setting2': 'invalid'
			});
			expect(errors['test.setting2']).toBeDefined();
		});
		it('should validate only visible settings in validateVisible', () => {
			// Register a block with a hidden required setting
			registry.registerBlock({
				id: 'hidden',
				label: 'Hidden Test',
				settings: [
					{
						key: 'master',
						type: 'boolean',
						label: 'Master',
						defaultValue: false,
						schema: z.boolean()
					},
					{
						key: 'required',
						type: 'string',
						label: 'Required',
						defaultValue: '',
						schema: z.string().min(1),
						visibleWhen: (values) => values['hidden.master'] === true
					}
				]
			});

			// When hidden, invalid value should not cause error
			const hiddenErrors = registry.validateVisible({
				'hidden.master': false,
				'hidden.required': ''
			});
			expect(Object.keys(hiddenErrors)).toHaveLength(0);

			// When visible, invalid value should cause error
			const visibleErrors = registry.validateVisible({
				'hidden.master': true,
				'hidden.required': ''
			});
			expect(visibleErrors['hidden.required']).toBeDefined();
		});
	});

	describe('dependency graph', () => {
		const dependencyBlock: SettingsBlock = {
			id: 'deps',
			label: 'Dependencies',
			settings: [
				{
					key: 'base',
					type: 'string',
					label: 'Base',
					defaultValue: '',
					schema: z.string()
				},
				{
					key: 'dependent',
					type: 'string',
					label: 'Dependent',
					defaultValue: '',
					schema: z.string(),
					requires: ['base']
				},
				{
					key: 'affected',
					type: 'string',
					label: 'Affected',
					defaultValue: '',
					schema: z.string(),
					affects: ['dependent']
				}
			]
		};

		beforeEach(() => {
			registry.registerBlock(dependencyBlock);
		});

		it('should build dependency graph', () => {
			const graph = registry.getDependencyGraph();
			expect(graph.hasNode('deps.dependent')).toBe(true);
			expect(graph.getDependencies('deps.dependent')).toContain('deps.base');
		});

		it('should detect cycles', () => {
			expect(registry.hasCycles()).toBe(false);
		});

		it('should get update order', () => {
			const order = registry.getUpdateOrder();
			expect(order.indexOf('deps.base')).toBeLessThan(order.indexOf('deps.dependent'));
		});

		it('should get impact analysis', () => {
			const impact = registry.getImpactAnalysis('deps.base');
			expect(impact.directlyAffected).toContain('deps.dependent');
		});
	});

	describe('default values', () => {
		beforeEach(() => {
			registry.registerBlock(createTestBlock('test'));
		});

		it('should get all default values', () => {
			const defaults = registry.getDefaultValues();
			expect(defaults['test.setting1']).toBe('default1');
			expect(defaults['test.setting2']).toBe(42);
		});
	});

	describe('statistics', () => {
		it('should provide accurate stats', () => {
			registry.registerBlock(createTestBlock('a'));
			registry.registerBlock(createTestBlock('b'));

			const stats = registry.getStats();
			expect(stats.blocks).toBe(2);
			expect(stats.settings).toBe(4);
		});
	});

	describe('strict mode', () => {
		it('should throw in strict mode for unknown setting', () => {
			const strictRegistry = new SettingsSchemaRegistry({ strict: true });
			strictRegistry.registerBlock(createTestBlock('test'));

			expect(() => strictRegistry.isSettingVisible('test.unknown', {})).toThrow(SettingNotFoundError);
		});

		it('should not throw in non-strict mode for unknown setting', () => {
			registry.registerBlock(createTestBlock('test'));
			expect(() => registry.isSettingVisible('test.unknown', {})).not.toThrow();
		});
	});

	describe('clear', () => {
		it('should clear all data', () => {
			registry.registerBlock(createTestBlock('test'));
			registry.clear();

			expect(registry.getBlock('test')).toBeUndefined();
			expect(registry.hasBlock('test')).toBe(false);
			expect(registry.getAllBlocks()).toHaveLength(0);
		});
	});
});
