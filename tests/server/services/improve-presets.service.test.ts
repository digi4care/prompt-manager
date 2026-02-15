// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createImprovePreset,
	getAllImprovePresets,
	getImprovePreset,
	getImprovePresetByName,
	getDefaultImprovePreset,
	updateImprovePreset,
	deleteImprovePreset,
	validatePresetData,
	getPresetWithDefaults,
	type OpenCodePolicy
} from '$lib/server/services/improve-presets.service';
import { db } from '$lib/server/db/client';
import { improvePresets } from '$lib/server/db/schema';

// Mock db client
vi.mock('$lib/server/db/client', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

const mockPolicy: OpenCodePolicy = {
	allowedModels: ['anthropic/claude-3-5-sonnet', 'openai/gpt-4'],
	improveDefaultModel: 'anthropic/claude-3-5-sonnet',
	judgeDefaultModel: 'openai/gpt-4',
	improveTemperature: 0.7,
	judgeTemperature: 0.0
};

describe('improve-presets.service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('validatePresetData', () => {
		it('should validate preset without overrides', () => {
			const result = validatePresetData({}, mockPolicy);
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should validate preset with allowed model', () => {
			const result = validatePresetData(
				{ model: 'anthropic/claude-3-5-sonnet', temperature: 0.5 },
				mockPolicy
			);
			expect(result.valid).toBe(true);
		});

		it('should reject model not in allowlist', () => {
			const result = validatePresetData({ model: 'not-allowed-model' }, mockPolicy);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('not in the allowed list'))).toBe(true);
		});

		it('should validate temperature in range', () => {
			const result = validatePresetData({ temperature: 0.8 }, mockPolicy);
			expect(result.valid).toBe(true);
		});

		it('should reject temperature out of range', () => {
			const result = validatePresetData({ temperature: 3.0 }, mockPolicy);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('between 0 and 2'))).toBe(true);
		});

		it('should validate allowedModels as JSON array', () => {
			const result = validatePresetData(
				{ allowedModels: JSON.stringify(['anthropic/claude-3-5-sonnet']) },
				mockPolicy
			);
			expect(result.valid).toBe(true);
		});

		it('should reject preset allowedModels with models not in global allowlist', () => {
			const result = validatePresetData(
				{ allowedModels: JSON.stringify(['not-in-global-allowlist']) },
				mockPolicy
			);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('not in global allowlist'))).toBe(true);
		});

		it('should reject invalid allowedModels JSON', () => {
			const result = validatePresetData({ allowedModels: 'not valid json' }, mockPolicy);
			expect(result.valid).toBe(false);
			expect(result.errors.some((e) => e.includes('must be valid JSON array'))).toBe(true);
		});

		it('should allow any model when global allowlist is empty', () => {
			const emptyPolicy: OpenCodePolicy = { ...mockPolicy, allowedModels: [] };
			const result = validatePresetData({ model: 'any-model' }, emptyPolicy);
			expect(result.valid).toBe(true);
		});
	});

	describe('createImprovePreset', () => {
		it('should create a new preset', async () => {
			const mockPreset = {
				id: 1,
				name: 'Test Preset',
				description: 'Test description',
				instruction: 'Test instruction',
				model: null,
				temperature: null,
				allowedModels: null,
				isDefault: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				updatedBy: 'admin'
			};

			vi.mocked(db.insert).mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([mockPreset])
				})
			} as any);

			const result = await createImprovePreset({
				name: 'Test Preset',
				description: 'Test description',
				instruction: 'Test instruction',
				model: null,
				temperature: null,
				allowedModels: null,
				isDefault: false
			});

			expect(result).toEqual(mockPreset);
		});
	});

	describe('getAllImprovePresets', () => {
		it('should return all presets', async () => {
			const mockPresets = [
				{ id: 1, name: 'Preset 1' },
				{ id: 2, name: 'Preset 2' }
			] as any;

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					orderBy: vi.fn().mockResolvedValue(mockPresets)
				})
			} as any);

			const result = await getAllImprovePresets();

			expect(result).toHaveLength(2);
			expect(result[0].name).toBe('Preset 1');
			expect(result[1].name).toBe('Preset 2');
		});
	});

	describe('getImprovePreset', () => {
		it('should return preset by ID', async () => {
			const mockPreset = {
				id: 1,
				name: 'Test Preset'
			} as any;

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockPreset])
					})
				})
			} as any);

			const result = await getImprovePreset(1);

			expect(result).toEqual(mockPreset);
		});

		it('should return null for non-existent preset', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getImprovePreset(999);

			expect(result).toBeNull();
		});
	});

	describe('getImprovePresetByName', () => {
		it('should return preset by name', async () => {
			const mockPreset = {
				id: 1,
				name: 'Test Preset'
			} as any;

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockPreset])
					})
				})
			} as any);

			const result = await getImprovePresetByName('Test Preset');

			expect(result).toEqual(mockPreset);
		});

		it('should return null for non-existent preset name', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getImprovePresetByName('Non-existent');

			expect(result).toBeNull();
		});
	});

	describe('getDefaultImprovePreset', () => {
		it('should return default preset', async () => {
			const mockPreset = {
				id: 1,
				name: 'Default Preset',
				isDefault: true
			} as any;

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockPreset])
					})
				})
			} as any);

			const result = await getDefaultImprovePreset();

			expect(result).toEqual(mockPreset);
		});
	});

	describe('updateImprovePreset', () => {
		it('should update preset', async () => {
			const mockUpdated = {
				id: 1,
				name: 'Updated Preset'
			} as any;

			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([mockUpdated])
					})
				})
			} as any);

			const result = await updateImprovePreset(1, { name: 'Updated Preset' });

			expect(result).toEqual(mockUpdated);
		});

		it('should unset other defaults when setting new default', async () => {
			vi.mocked(db.update).mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			await updateImprovePreset(1, { isDefault: true });

			expect(vi.mocked(db.update)).toHaveBeenCalledTimes(2); // Once to unset all, once to update preset
		});
	});

	describe('deleteImprovePreset', () => {
		it('should delete preset', async () => {
			vi.mocked(db.delete).mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: 1 }])
				})
			} as any);

			const result = await deleteImprovePreset(1);

			expect(result).toBe(true);
		});

		it('should return false for non-existent preset', async () => {
			vi.mocked(db.delete).mockReturnValue({
				where: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([])
				})
			} as any);

			const result = await deleteImprovePreset(999);

			expect(result).toBe(false);
		});
	});

	describe('getPresetWithDefaults', () => {
		it('should return preset with policy defaults when no overrides', async () => {
			const mockPreset = {
				id: 1,
				name: 'Test Preset',
				model: null,
				temperature: null,
				allowedModels: null
			} as any;

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockPreset])
					})
				})
			} as any);

			const result = await getPresetWithDefaults(1, mockPolicy);

			expect(result).not.toBeNull();
			expect(result!.effectiveModel).toBe('anthropic/claude-3-5-sonnet');
			expect(result!.effectiveTemperature).toBe(0.7);
		});

		it('should return preset with overrides when specified', async () => {
			const mockPreset = {
				id: 1,
				name: 'Test Preset',
				model: 'openai/gpt-4',
				temperature: 0.5,
				allowedModels: null
			} as any;

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockPreset])
					})
				})
			} as any);

			const result = await getPresetWithDefaults(1, mockPolicy);

			expect(result).not.toBeNull();
			expect(result!.effectiveModel).toBe('openai/gpt-4');
			expect(result!.effectiveTemperature).toBe(0.5);
		});

		it('should return preset found by name', async () => {
			const mockPreset = {
				id: 1,
				name: 'Test Preset',
				model: null,
				temperature: null,
				allowedModels: null
			} as any;

			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([mockPreset])
					})
				})
			} as any);

			const result = await getPresetWithDefaults('Test Preset', mockPolicy);

			expect(result).not.toBeNull();
			expect(result!.name).toBe('Test Preset');
		});

		it('should return null for non-existent preset', async () => {
			vi.mocked(db.select).mockReturnValue({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			} as any);

			const result = await getPresetWithDefaults(999, mockPolicy);

			expect(result).toBeNull();
		});
	});
});
