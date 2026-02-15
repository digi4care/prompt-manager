import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	getAllSettings,
	getSetting,
	updateSetting,
	updateMultipleSettings,
	resetToDefaults,
	resetSetting,
	validateSettingValue,
	getOpenCodePolicy,
	isModelAllowed,
	type OpenCodePolicy
} from '$lib/server/services/admin-settings.service';
import { db } from '$lib/server/db/client';
import { adminSettings } from '$lib/server/db/schema';

// Mock db client
vi.mock('$lib/server/db/client', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

describe('admin-settings.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validateSettingValue', () => {
		it('should validate temperature within range', () => {
			expect(validateSettingValue('judge_temperature', '0.5')).toEqual({ valid: true });
			expect(validateSettingValue('judge_temperature', '0.0')).toEqual({ valid: true });
			expect(validateSettingValue('judge_temperature', '1.0')).toEqual({ valid: true });
		});

		it('should reject temperature out of range', () => {
			const result1 = validateSettingValue('judge_temperature', '1.5');
			expect(result1.valid).toBe(false);
			expect(result1.error).toContain('between 0 and 1');

			const result2 = validateSettingValue('improvement_temperature', '-0.1');
			expect(result2.valid).toBe(false);
		});

		it('should reject invalid temperature format', () => {
			const result = validateSettingValue('judge_temperature', 'not-a-number');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('between 0 and 1');
		});

		it('should validate max_thinking_length', () => {
			expect(validateSettingValue('max_thinking_length', '5000')).toEqual({ valid: true });
			expect(validateSettingValue('max_thinking_length', '0')).toEqual({ valid: true });
		});

		it('should reject negative max_thinking_length', () => {
			const result = validateSettingValue('max_thinking_length', '-100');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('positive number');
		});

		it('should validate boolean settings', () => {
			expect(validateSettingValue('store_thinking', 'true')).toEqual({ valid: true });
			expect(validateSettingValue('store_thinking', 'false')).toEqual({ valid: true });
			expect(validateSettingValue('show_thinking', 'true')).toEqual({ valid: true });
		});

		it('should reject invalid boolean values', () => {
			const result = validateSettingValue('store_thinking', 'yes');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('true" or "false');
		});

		it('should validate model names', () => {
			expect(validateSettingValue('judge_model', 'MiniMax-M2.1')).toEqual({ valid: true });
			expect(validateSettingValue('improvement_model', 'claude-opus-4')).toEqual({ valid: true });
		});

		it('should reject empty model names', () => {
			const result = validateSettingValue('judge_model', '');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('cannot be empty');
		});

		it('should accept any valid string for provider_priority', () => {
			expect(validateSettingValue('provider_priority', 'anthropic,openrouter')).toEqual({
				valid: true
			});
		});

		it('should validate opencode_allowed_models as JSON array', () => {
			const validResult = validateSettingValue(
				'opencode_allowed_models',
				JSON.stringify(['anthropic/claude-3-5-sonnet', 'openai/gpt-4'])
			);
			expect(validResult.valid).toBe(true);
		});

		it('should reject opencode_allowed_models as non-array', () => {
			const result = validateSettingValue(
				'opencode_allowed_models',
				JSON.stringify({ not: 'an array' })
			);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('must be a JSON array');
		});

		it('should reject opencode_allowed_models with empty strings', () => {
			const result = validateSettingValue(
				'opencode_allowed_models',
				JSON.stringify(['', 'anthropic/claude'])
			);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('non-empty strings');
		});

		it('should reject invalid JSON for opencode_allowed_models', () => {
			const result = validateSettingValue('opencode_allowed_models', 'not valid json');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('valid JSON array');
		});
	});

	describe('getAllSettings', () => {
		it('should return settings grouped by category', async () => {
			// Mock database response
			const mockSettings = [
				{
					id: 1,
					category: 'models',
					key: 'judge_model',
					value: 'MiniMax-M2.1',
					updatedAt: new Date(),
					updatedBy: 'admin'
				},
				{
					id: 2,
					category: 'temperature',
					key: 'judge_temperature',
					value: '0.0',
					updatedAt: new Date(),
					updatedBy: 'admin'
				},
				{
					id: 3,
					category: 'reasoning',
					key: 'store_thinking',
					value: 'true',
					updatedAt: new Date(),
					updatedBy: 'admin'
				}
			];

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockResolvedValue(mockSettings)
			} as any);

			const result = await getAllSettings();

			expect(result).toHaveProperty('models');
			expect(result).toHaveProperty('temperature');
			expect(result).toHaveProperty('reasoning');
			expect(result.models).toHaveProperty('judge_model');
			expect(result.temperature).toHaveProperty('judge_temperature');
			expect(result.reasoning).toHaveProperty('store_thinking');
		});
	});

	describe('getSetting', () => {
		it('should return setting value when exists', async () => {
			const mockSetting = [
				{
					id: 1,
					category: 'models',
					key: 'judge_model',
					value: 'MiniMax-M2.1',
					updatedAt: new Date(),
					updatedBy: 'admin'
				}
			];

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue(mockSetting)
					})
				})
			} as any);

			const result = await getSetting('judge_model');
			expect(result).toBe('MiniMax-M2.1');
		});

		it('should return default value when setting does not exist', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getSetting('judge_model');
			expect(result).toBeTruthy(); // Should return default
		});
	});

	describe('updateSetting', () => {
		it('should insert new setting when it does not exist', async () => {
			// Mock that setting does not exist
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const mockInserted = {
				id: 1,
				category: 'temperature',
				key: 'new_temperature',
				value: '0.5',
				updatedAt: new Date(),
				updatedBy: 'admin'
			};

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockInserted])
				})
			} as any);

			const result = await updateSetting({ key: 'new_temperature', value: '0.5' });
			expect(result).toEqual(mockInserted);
		});

		it('should update existing setting', async () => {
			// Mock that setting exists
			const existingSetting = {
				id: 1,
				category: 'temperature',
				key: 'judge_temperature',
				value: '0.0',
				updatedAt: new Date(),
				updatedBy: 'system'
			};

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([existingSetting])
					})
				})
			} as any);

			const mockUpdated = {
				...existingSetting,
				value: '0.3',
				updatedBy: 'admin'
			};

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockUpdated])
					})
				})
			} as any);

			const result = await updateSetting({ key: 'judge_temperature', value: '0.3' });
			expect(result.value).toBe('0.3');
		});
	});

	describe('getOpenCodePolicy', () => {
		it('should return policy with OpenCode keys when available', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi
							.fn()
							.mockResolvedValueOnce([
								{
									id: 1,
									category: 'models',
									key: 'opencode_allowed_models',
									value: '["anthropic/claude-3-5-sonnet"]',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
							.mockResolvedValueOnce([
								{
									id: 2,
									category: 'models',
									key: 'opencode_improve_default_model',
									value: 'anthropic/claude-3-5-sonnet',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
							.mockResolvedValueOnce([
								{
									id: 3,
									category: 'models',
									key: 'opencode_judge_default_model',
									value: 'anthropic/claude-3-5-sonnet',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
							.mockResolvedValueOnce([
								{
									id: 4,
									category: 'temperature',
									key: 'opencode_improve_temperature',
									value: '0.7',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
							.mockResolvedValueOnce([
								{
									id: 5,
									category: 'temperature',
									key: 'opencode_judge_temperature',
									value: '0.0',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
					})
				})
			} as any);

			const policy = await getOpenCodePolicy();

			expect(policy.allowedModels).toEqual(['anthropic/claude-3-5-sonnet']);
			expect(policy.improveDefaultModel).toBe('anthropic/claude-3-5-sonnet');
			expect(policy.judgeDefaultModel).toBe('anthropic/claude-3-5-sonnet');
			expect(policy.improveTemperature).toBe(0.7);
			expect(policy.judgeTemperature).toBe(0.0);
		});

		it('should fallback to legacy keys when OpenCode keys not set', async () => {
			// Mock OpenCode keys returning empty/default values
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi
							.fn()
							.mockResolvedValueOnce([]) // opencode_allowed_models not set
							.mockResolvedValueOnce([]) // opencode_improve_default_model not set
							.mockResolvedValueOnce([]) // opencode_judge_default_model not set
							.mockResolvedValueOnce([]) // opencode_improve_temperature not set
							.mockResolvedValueOnce([]) // opencode_judge_temperature not set
							// Fallback to legacy keys
							.mockResolvedValueOnce([
								{
									id: 10,
									category: 'models',
									key: 'improvement_model',
									value: 'MiniMax-M2.1',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
							.mockResolvedValueOnce([
								{
									id: 11,
									category: 'models',
									key: 'judge_model',
									value: 'MiniMax-M2.1',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
							.mockResolvedValueOnce([
								{
									id: 12,
									category: 'temperature',
									key: 'improvement_temperature',
									value: '0.7',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
							.mockResolvedValueOnce([
								{
									id: 13,
									category: 'temperature',
									key: 'judge_temperature',
									value: '0.0',
									updatedAt: new Date(),
									updatedBy: 'admin'
								}
							])
					})
				})
			} as any);

			const policy = await getOpenCodePolicy();

			expect(policy.allowedModels).toEqual([]); // Empty means all allowed
			expect(policy.improveDefaultModel).toBe('MiniMax-M2.1');
			expect(policy.judgeDefaultModel).toBe('MiniMax-M2.1');
			expect(policy.improveTemperature).toBe(0.7);
			expect(policy.judgeTemperature).toBe(0.0);
		});
	});

	describe('isModelAllowed', () => {
		it('should allow any model when allowlist is empty', () => {
			const policy: OpenCodePolicy = {
				allowedModels: [],
				improveDefaultModel: 'model1',
				judgeDefaultModel: 'model2',
				improveTemperature: 0.7,
				judgeTemperature: 0.0
			};

			expect(isModelAllowed('any-model', policy)).toBe(true);
			expect(isModelAllowed('anthropic/claude', policy)).toBe(true);
		});

		it('should allow model in allowlist', () => {
			const policy: OpenCodePolicy = {
				allowedModels: ['anthropic/claude-3-5-sonnet', 'openai/gpt-4'],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet',
				judgeDefaultModel: 'openai/gpt-4',
				improveTemperature: 0.7,
				judgeTemperature: 0.0
			};

			expect(isModelAllowed('anthropic/claude-3-5-sonnet', policy)).toBe(true);
			expect(isModelAllowed('openai/gpt-4', policy)).toBe(true);
		});

		it('should reject model not in allowlist', () => {
			const policy: OpenCodePolicy = {
				allowedModels: ['anthropic/claude-3-5-sonnet'],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet',
				judgeDefaultModel: 'anthropic/claude-3-5-sonnet',
				improveTemperature: 0.7,
				judgeTemperature: 0.0
			};

			expect(isModelAllowed('openai/gpt-4', policy)).toBe(false);
			expect(isModelAllowed('not-allowed-model', policy)).toBe(false);
		});
	});
});
