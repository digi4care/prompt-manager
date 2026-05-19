import { describe, it, expect } from 'vitest';
import {
	legacyToRegistry,
	registryToLegacy,
	extractBlockSettings,
	mergeBlockSettings,
	isSettingChanged,
	createMigrationReport,
	SettingsStorageCompat,
	type LegacySettings
} from '$lib/settings';

describe('backward compatibility', () => {
	const sampleLegacy: LegacySettings = {
		connection: {
			mode: 'local',
			hostname: '127.0.0.1',
			port: 3000,
			status: 'connected'
		},
		providers: {
			selected: ['openai', 'anthropic'],
			openai: { apiKey: 'sk-test123' },
			anthropic: { apiKey: 'sk-ant-test' },
			ollama: { url: 'http://localhost:11434' }
		},
		policy: {
			allowedModels: ['gpt-4', 'claude-3-opus'],
			requireApproval: true
		},
		defaults: {
			executor: { modelId: 'gpt-4', temperature: 0.7, maxTokens: 4096 },
			judge: { modelId: 'claude-3-opus', temperature: 0.3, maxTokens: 2048 }
		},
		council: {
			enabled: true,
			members: ['gpt-4', 'claude-3-opus'],
			consensusThreshold: 0.7
		}
	};

	describe('legacyToRegistry', () => {
		it('should transform connection settings', () => {
			const registry = legacyToRegistry(sampleLegacy);
			expect(registry['connection.mode']).toBe('local');
			expect(registry['connection.local.hostname']).toBe('127.0.0.1');
			expect(registry['connection.local.port']).toBe(3000);
			expect(registry['connection.status']).toBe('connected');
		});

		it('should transform provider settings', () => {
			const registry = legacyToRegistry(sampleLegacy);
			expect(registry['providers.selected']).toEqual(['openai', 'anthropic']);
			expect(registry['providers.openai.apiKey']).toBe('sk-test123');
			expect(registry['providers.anthropic.apiKey']).toBe('sk-ant-test');
		});

		it('should transform policy settings', () => {
			const registry = legacyToRegistry(sampleLegacy);
			expect(registry['policy.allowedModels']).toEqual(['gpt-4', 'claude-3-opus']);
			expect(registry['policy.requireApproval']).toBe(true);
		});

		it('should transform default settings', () => {
			const registry = legacyToRegistry(sampleLegacy);
			expect(registry['defaults.executor.modelId']).toBe('gpt-4');
			expect(registry['defaults.executor.temperature']).toBe(0.7);
			expect(registry['defaults.judge.modelId']).toBe('claude-3-opus');
		});

		it('should handle empty legacy settings', () => {
			const registry = legacyToRegistry({});
			expect(Object.keys(registry)).toHaveLength(0);
		});
	});

	describe('registryToLegacy', () => {
		it('should round-trip transform', () => {
			const registry = legacyToRegistry(sampleLegacy);
			const backToLegacy = registryToLegacy(registry);

			expect(backToLegacy.connection?.mode).toBe('local');
			expect(backToLegacy.connection?.hostname).toBe('127.0.0.1');
			expect(backToLegacy.providers?.selected).toEqual(['openai', 'anthropic']);
		});

		it('should handle partial registry', () => {
			const registry = {
				'connection.mode': 'remote',
				'connection.remote.host': 'https://api.example.com'
			};
			const legacy = registryToLegacy(registry);

			expect(legacy.connection?.mode).toBe('remote');
			expect(legacy.connection?.host).toBe('https://api.example.com');
		});
	});

	describe('extractBlockSettings', () => {
		const registry = legacyToRegistry(sampleLegacy);

		it('should extract connection block', () => {
			const block = extractBlockSettings(registry, 'connection');
			expect(block['mode']).toBe('local');
			expect(block['local.hostname']).toBe('127.0.0.1');
			expect(block['local.port']).toBe(3000);
		});

		it('should extract defaults block', () => {
			const block = extractBlockSettings(registry, 'defaults');
			expect(block['executor.modelId']).toBe('gpt-4');
			expect(block['judge.modelId']).toBe('claude-3-opus');
		});

		it('should return empty object for unknown block', () => {
			const block = extractBlockSettings(registry, 'unknown');
			expect(Object.keys(block)).toHaveLength(0);
		});
	});

	describe('mergeBlockSettings', () => {
		it('should merge block settings into registry', () => {
			const registry = { 'other.setting': 'value' };
			const blockSettings = {
				mode: 'remote',
				'local.hostname': '192.168.1.1'
			};

			const merged = mergeBlockSettings(registry, 'connection', blockSettings);
			expect(merged['other.setting']).toBe('value');
			expect(merged['connection.mode']).toBe('remote');
			expect(merged['connection.local.hostname']).toBe('192.168.1.1');
		});
	});

	describe('isSettingChanged', () => {
		it('should detect changed values', () => {
			expect(isSettingChanged('key', 'new', 'old')).toBe(true);
			expect(isSettingChanged('key', 42, 43)).toBe(true);
		});

		it('should detect unchanged values', () => {
			expect(isSettingChanged('key', 'same', 'same')).toBe(false);
			expect(isSettingChanged('key', 42, 42)).toBe(false);
		});

		it('should handle object comparison', () => {
			expect(isSettingChanged('key', { a: 1 }, { a: 1 })).toBe(false);
			expect(isSettingChanged('key', { a: 1 }, { a: 2 })).toBe(true);
		});
	});

	describe('createMigrationReport', () => {
		it('should report added keys', () => {
			const legacy: LegacySettings = {};
			const registry = { 'new.key': 'value' };

			const report = createMigrationReport(legacy, registry);
			expect(report.added).toContain('new.key');
		});

		it('should report removed keys', () => {
			const legacy: LegacySettings = { connection: { mode: 'local' } };
			const registry = {};

			const report = createMigrationReport(legacy, registry);
			expect(report.removed.length).toBeGreaterThan(0);
		});

		it('should report changed values', () => {
			const legacy: LegacySettings = { connection: { mode: 'local' } };
			const registry = { 'connection.mode': 'remote' };

			const report = createMigrationReport(legacy, registry);
			expect(report.changed.length).toBeGreaterThan(0);
			expect(report.changed[0].key).toBe('connection.mode');
			expect(report.changed[0].from).toBe('local');
			expect(report.changed[0].to).toBe('remote');
		});

		it('should report unchanged values', () => {
			const legacy: LegacySettings = { connection: { mode: 'local' } };
			const registry = { 'connection.mode': 'local' };

			const report = createMigrationReport(legacy, registry);
			expect(report.unchanged).toContain('connection.mode');
		});
	});

	describe('SettingsStorageCompat', () => {
		const getDefaults = () => ({
			'connection.mode': 'local',
			'connection.local.port': 3000,
			'policy.maxTokens': 4096
		});

		const compat = new SettingsStorageCompat(getDefaults);

		describe('load', () => {
			it('should return defaults when stored is null', () => {
				const result = compat.load(null);
				expect(result['connection.mode']).toBe('local');
				expect(result['connection.local.port']).toBe(3000);
			});

			it('should return defaults when stored is undefined', () => {
				const result = compat.load(undefined);
				expect(result['connection.mode']).toBe('local');
			});

			it('should load registry format directly', () => {
				const stored = { 'connection.mode': 'remote', 'new.key': 'value' };
				const result = compat.load(stored);
				expect(result['connection.mode']).toBe('remote');
				expect(result['new.key']).toBe('value');
			});

			it('should convert legacy format', () => {
				const stored = { connection: { mode: 'remote' } };
				const result = compat.load(stored);
				expect(result['connection.mode']).toBe('remote');
			});
		});

		describe('save', () => {
			it('should only save non-default values', () => {
				const registry = {
					'connection.mode': 'local', // Same as default
					'connection.local.port': 8080 // Different
				};
				const result = compat.save(registry);
				expect(result['connection.mode']).toBeUndefined();
				expect(result['connection.local.port']).toBe(8080);
			});

			it('should return empty object when all defaults', () => {
				const registry = {
					'connection.mode': 'local',
					'connection.local.port': 3000
				};
				const result = compat.save(registry);
				expect(Object.keys(result)).toHaveLength(0);
			});
		});

		describe('needsMigration', () => {
			it('should return false for null', () => {
				expect(compat.needsMigration(null)).toBe(false);
			});

			it('should return false for undefined', () => {
				expect(compat.needsMigration(undefined)).toBe(false);
			});

			it('should return false for registry format', () => {
				const stored = { 'connection.mode': 'local' };
				expect(compat.needsMigration(stored)).toBe(false);
			});

			it('should return true for legacy format', () => {
				const stored = { connection: { mode: 'local' } };
				expect(compat.needsMigration(stored)).toBe(true);
			});
		});
	});
});
