import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
	SettingsSchemaRegistry,
	SettingsResolver,
	ResolutionError,
	createResolver,
	connectionBlock,
	createResolutionContext,
	mergeContexts,
	runContext,
	promptContext,
	getValueAtLevel,
	getHighestPriorityLevel,
	buildCascadeLevels
} from '$lib/settings';

describe('SettingsResolver', () => {
	let registry: SettingsSchemaRegistry;
	let resolver: SettingsResolver;

	beforeEach(() => {
		registry = new SettingsSchemaRegistry();
		registry.registerBlock(connectionBlock);
		resolver = createResolver(registry);
	});

	describe('resolve', () => {
		it('should resolve default value when no overrides', async () => {
			const result = await resolver.resolve('connection.mode', {});
			expect(result.value).toBe('local');
			expect(result.source).toBe('default');
			expect(result.isInherited).toBe(true);
		});

		it('should resolve prompt override', async () => {
			const context = promptContext({ 'connection.mode': 'remote' });
			const result = await resolver.resolve('connection.mode', context);
			expect(result.value).toBe('remote');
			expect(result.source).toBe('prompt');
			expect(result.isInherited).toBe(true);
		});

		it('should resolve run override (highest priority)', async () => {
			const context = {
				runOverrides: { 'connection.mode': 'remote' },
				promptOverrides: { 'connection.mode': 'local' }
			};
			const result = await resolver.resolve('connection.mode', context);
			expect(result.value).toBe('remote');
			expect(result.source).toBe('run');
			expect(result.isInherited).toBe(false);
		});

		it('should fallback to default when override is invalid', async () => {
			const context = runContext({ 'connection.local.port': 'not-a-number' });
			const result = await resolver.resolve('connection.local.port', context);
			expect(result.value).toBe(3000); // Default value
			expect(result.source).toBe('default');
		});

		it('should throw for unknown setting', async () => {
			await expect(resolver.resolve('unknown.key', {})).rejects.toThrow(ResolutionError);
		});
	});

	describe('resolveAll', () => {
		it('should resolve multiple settings', async () => {
			const keys = ['connection.mode', 'connection.local.port'];
			const results = await resolver.resolveAll(keys, {});

			expect(results.size).toBe(2);
			expect(results.get('connection.mode')?.value).toBe('local');
			expect(results.get('connection.local.port')?.value).toBe(3000);
		});

		it('should apply overrides to all settings', async () => {
			const keys = ['connection.mode', 'connection.local.port'];
			const context = runContext({
				'connection.mode': 'remote',
				'connection.local.port': 8080
			});
			const results = await resolver.resolveAll(keys, context);

			expect(results.get('connection.mode')?.value).toBe('remote');
			expect(results.get('connection.local.port')?.value).toBe(8080);
		});
	});

	describe('getCascadePath', () => {
		it('should return all cascade levels', () => {
			const context = {
				runOverrides: { 'connection.mode': 'run-value' },
				promptOverrides: { 'connection.mode': 'prompt-value' }
			};
			const path = resolver.getCascadePath('connection.mode', context);

			expect(path).toHaveLength(3);
			expect(path[0]).toEqual({ source: 'run', value: 'run-value' });
			expect(path[1]).toEqual({ source: 'prompt', value: 'prompt-value' });
			expect(path[2]).toEqual({ source: 'default', value: 'local' });
		});

		it('should handle empty context', () => {
			const path = resolver.getCascadePath('connection.mode', {});
			expect(path).toHaveLength(1);
			expect(path[0].source).toBe('default');
		});
	});

	describe('peekSource', () => {
		it('should return run source', () => {
			const context = runContext({ 'connection.mode': 'remote' });
			expect(resolver.peekSource('connection.mode', context)).toBe('run');
		});

		it('should return prompt source', () => {
			const context = promptContext({ 'connection.mode': 'remote' });
			expect(resolver.peekSource('connection.mode', context)).toBe('prompt');
		});

		it('should return default source', () => {
			expect(resolver.peekSource('connection.mode', {})).toBe('default');
		});

		it('should return null for unknown setting', () => {
			expect(resolver.peekSource('unknown.key', {})).toBeNull();
		});
	});

	describe('isOverridden', () => {
		it('should return true when run override exists', () => {
			const context = runContext({ 'connection.mode': 'remote' });
			expect(resolver.isOverridden('connection.mode', context)).toBe(true);
		});

		it('should return true when prompt override exists', () => {
			const context = promptContext({ 'connection.mode': 'remote' });
			expect(resolver.isOverridden('connection.mode', context)).toBe(true);
		});

		it('should return false when no override', () => {
			expect(resolver.isOverridden('connection.mode', {})).toBe(false);
		});
	});

	describe('isInherited', () => {
		it('should return false when run override exists', () => {
			const context = runContext({ 'connection.mode': 'remote' });
			expect(resolver.isInherited('connection.mode', context)).toBe(false);
		});

		it('should return true when only prompt override', () => {
			const context = promptContext({ 'connection.mode': 'remote' });
			expect(resolver.isInherited('connection.mode', context)).toBe(true);
		});

		it('should return true when no override', () => {
			expect(resolver.isInherited('connection.mode', {})).toBe(true);
		});
	});

	describe('getEffectiveValue', () => {
		it('should return highest priority value', () => {
			const context = {
				runOverrides: { 'connection.mode': 'run-value' },
				promptOverrides: { 'connection.mode': 'prompt-value' }
			};
			expect(resolver.getEffectiveValue('connection.mode', context)).toBe('run-value');
		});

		it('should return undefined for unknown setting', () => {
			expect(resolver.getEffectiveValue('unknown.key', {})).toBeUndefined();
		});
	});

	describe('mergeValues', () => {
		it('should merge all levels with correct precedence', () => {
			const context = {
				runOverrides: { 'connection.mode': 'run-value' },
				promptOverrides: { 'connection.mode': 'prompt-value' }
			};
			const merged = resolver.mergeValues(context);
			expect(merged['connection.mode']).toBe('run-value');
		});

		it('should include all default values', () => {
			const merged = resolver.mergeValues({});
			expect(merged['connection.mode']).toBe('local');
			expect(merged['connection.local.port']).toBe(3000);
		});
	});

	describe('resolveBatch', () => {
		it('should resolve in dependency order', async () => {
			// Add a block with dependencies
			const testBlock = {
				id: 'test',
				label: 'Test',
				settings: [
					{
						key: 'base',
						type: 'string' as const,
						label: 'Base',
						defaultValue: 'base-value',
						schema: z.string()
					},
					{
						key: 'dependent',
						type: 'string' as const,
						label: 'Dependent',
						defaultValue: '',
						schema: z.string(),
						requires: ['base']
					}
				]
			};
			registry.registerBlock(testBlock);

			const results = await resolver.resolveBatch(['test.dependent'], {});
			expect(results.has('test.dependent')).toBe(true);
		});

		it('should include dependencies in results', async () => {
			const testBlock = {
				id: 'test',
				label: 'Test',
				settings: [
					{
						key: 'base',
						type: 'string' as const,
						label: 'Base',
						defaultValue: 'base-value',
						schema: z.string()
					},
					{
						key: 'dependent',
						type: 'string' as const,
						label: 'Dependent',
						defaultValue: '',
						schema: z.string(),
						requires: ['base']
					}
				]
			};
			registry.registerBlock(testBlock);

			const results = await resolver.resolveBatch(['test.dependent'], {});
			// Should only return requested key
			expect(results.size).toBe(1);
			expect(results.has('test.dependent')).toBe(true);
		});
	});
});

describe('cascade utilities', () => {
	describe('createResolutionContext', () => {
		it('should create context with all levels', () => {
			const context = createResolutionContext(
				{ 'key.run': 'run-value' },
				{ 'key.prompt': 'prompt-value' },
				123
			);
			expect(context.runOverrides).toEqual({ 'key.run': 'run-value' });
			expect(context.promptOverrides).toEqual({ 'key.prompt': 'prompt-value' });
			expect(context.promptId).toBe(123);
		});
	});

	describe('mergeContexts', () => {
		it('should merge contexts with later taking precedence', () => {
			const a = runContext({ key: 'a' });
			const b = runContext({ key: 'b' });
			const merged = mergeContexts(a, b);
			expect(merged.runOverrides?.key).toBe('b');
		});
	});

	describe('getValueAtLevel', () => {
		const context = {
			runOverrides: { key: 'run-value' },
			promptOverrides: { key: 'prompt-value' }
		};

		it('should get run value', () => {
			expect(getValueAtLevel('key', 'run', context)).toBe('run-value');
		});

		it('should get prompt value', () => {
			expect(getValueAtLevel('key', 'prompt', context)).toBe('prompt-value');
		});

		it('should get default value', () => {
			expect(getValueAtLevel('key', 'default', context, { key: 'default-value' })).toBe('default-value');
		});
	});

	describe('getHighestPriorityLevel', () => {
		it('should return run when present', () => {
			const context = runContext({ key: 'value' });
			expect(getHighestPriorityLevel('key', context)).toBe('run');
		});

		it('should return prompt when no run', () => {
			const context = promptContext({ key: 'value' });
			expect(getHighestPriorityLevel('key', context)).toBe('prompt');
		});

		it('should return default when no overrides', () => {
			expect(getHighestPriorityLevel('key', {}, { key: 'value' })).toBe('default');
		});
	});

	describe('buildCascadeLevels', () => {
		it('should build all levels', () => {
			const context = {
				runOverrides: { key: 'run' },
				promptOverrides: { key: 'prompt' }
			};
			const levels = buildCascadeLevels('key', context, 'default');
			expect(levels).toHaveLength(3);
			expect(levels[0]).toEqual({ source: 'run', value: 'run' });
			expect(levels[1]).toEqual({ source: 'prompt', value: 'prompt' });
			expect(levels[2]).toEqual({ source: 'default', value: 'default' });
		});
	});

	describe('runContext', () => {
		it('should create context with run overrides', () => {
			const context = runContext({ key: 'value' });
			expect(context.runOverrides).toEqual({ key: 'value' });
			expect(context.promptOverrides).toBeUndefined();
		});
	});

	describe('promptContext', () => {
		it('should create context with prompt overrides', () => {
			const context = promptContext({ key: 'value' }, 123);
			expect(context.promptOverrides).toEqual({ key: 'value' });
			expect(context.promptId).toBe(123);
		});
	});
});
