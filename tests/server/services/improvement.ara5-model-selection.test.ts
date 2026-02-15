/**
 * ara.5: Test per-run instruction + model selection in improve workflow
 *
 * This test suite covers:
 * - Model enforcement (reject unauthorized models)
 * - Preset selection and merging with policy defaults
 * - Per-run instruction override
 * - Backward compatibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenCode service
vi.mock('$lib/server/services/opencode.service', () => ({
	executeAgent: vi.fn(),
	executeAgentWithSession: vi.fn()
}));

// Mock DB client
vi.mock('$lib/server/db/client', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

// Mock services
vi.mock('$lib/server/services/admin-settings.service', () => ({
	getOpenCodePolicy: vi.fn(),
	isModelAllowed: vi.fn()
}));

vi.mock('$lib/server/services/improve-presets.service', () => ({
	getPresetWithDefaults: vi.fn()
}));

describe('ara.5: Improve workflow - Per-run instruction + model selection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Model enforcement', () => {
		it('rejects unauthorized models from direct modelId selection', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			// Mock policy with restricted allowlist
			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: ['anthropic/claude-3-5-sonnet-20241022'],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			// Mock model as NOT allowed
			(isModelAllowed as any).mockReturnValue(false);

			const baseVersion = { content: 'Test prompt' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			// Should reject unauthorized model
			await expect(
				generateVariantsWithModelSelection(baseVersion, judgeResponse, {
					modelId: 'openai/gpt-4'
				})
			).rejects.toThrow('is not in the allowed list');
		});

		it('allows models in policy allowlist', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			// Mock policy
			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: ['anthropic/claude-3-5-sonnet-20241022'],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			// Mock model as allowed
			(isModelAllowed as any).mockReturnValue(true);

			// Mock agent execution
			(executeAgentWithSession as any).mockResolvedValue({
				data: {
					improvements: [{ prompt: 'Improved 1' }, { prompt: 'Improved 2' }]
				}
			});

			const baseVersion = { content: 'Test prompt' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			const result = await generateVariantsWithModelSelection(baseVersion, judgeResponse, {
				modelId: 'anthropic/claude-3-5-sonnet-20241022'
			});

			expect(result.variants).toEqual(['Improved 1', 'Improved 2']);
			expect(result.metadata.model).toEqual({
				providerId: 'anthropic',
				modelId: 'claude-3-5-sonnet-20241022'
			});
			expect(executeAgentWithSession).toHaveBeenCalledWith(
				expect.objectContaining({
					model: { providerID: 'anthropic', modelID: 'claude-3-5-sonnet-20241022' }
				})
			);
		});

		it('uses policy default when no model specified', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			// Mock policy
			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: [], // Empty means all allowed
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			(isModelAllowed as any).mockReturnValue(true);
			(executeAgentWithSession as any).mockResolvedValue({
				data: { improvements: [{ prompt: 'Improved 1' }] }
			});

			const baseVersion = { content: 'Test' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			const result = await generateVariantsWithModelSelection(baseVersion, judgeResponse, {});

			expect(result.metadata.model).toEqual({
				providerId: 'anthropic',
				modelId: 'claude-3-5-sonnet-20241022'
			});
		});
	});

	describe('Preset selection and merging', () => {
		it('loads preset and applies its instruction', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { getPresetWithDefaults } =
				await import('$lib/server/services/improve-presets.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: [],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			(isModelAllowed as any).mockReturnValue(true);

			// Mock preset with instruction and model override
			(getPresetWithDefaults as any).mockResolvedValue({
				id: 1,
				name: 'Concise',
				instruction: 'Make prompts concise and direct',
				effectiveModel: 'anthropic/claude-3-5-sonnet-20241022',
				effectiveTemperature: 0.5
			});

			const agentCallLog: any[] = [];
			(executeAgentWithSession as any).mockImplementation(async (options: any) => {
				agentCallLog.push(options);
				return { data: { improvements: [{ prompt: 'Concise variant' }] } };
			});

			const baseVersion = { content: 'Test prompt' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			await generateVariantsWithModelSelection(baseVersion, judgeResponse, {
				preset: 'Concise'
			});

			// Verify preset instruction was included in agent input
			expect(agentCallLog[0].parts[0].text).toContain('Make prompts concise and direct');
			expect(agentCallLog[0].temperature).toBe(0.5);
		});

		it('merges preset with policy defaults', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { getPresetWithDefaults } =
				await import('$lib/server/services/improve-presets.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: [],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			(isModelAllowed as any).mockReturnValue(true);

			// Mock preset without model override (should use policy default)
			(getPresetWithDefaults as any).mockResolvedValue({
				id: 2,
				name: 'Detailed',
				instruction: 'Add comprehensive context',
				effectiveModel: 'anthropic/claude-3-5-sonnet-20241022', // Falls back to policy
				effectiveTemperature: 0.8 // Preset overrides temp
			});

			const agentCallLog: any[] = [];
			(executeAgentWithSession as any).mockImplementation(async (options: any) => {
				agentCallLog.push(options);
				return { data: { improvements: [{ prompt: 'Detailed variant' }] } };
			});

			const baseVersion = { content: 'Test prompt' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			const result = await generateVariantsWithModelSelection(baseVersion, judgeResponse, {
				preset: 'Detailed'
			});

			// Verify merge: model from policy, temp from preset
			expect(agentCallLog[0].temperature).toBe(0.8);
			expect(result.metadata.temperature).toBe(0.8);
			expect(result.metadata.preset).toEqual({ id: 2, name: 'Detailed' });
		});

		it('handles missing preset gracefully', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { getPresetWithDefaults } =
				await import('$lib/server/services/improve-presets.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: [],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			(isModelAllowed as any).mockReturnValue(true);

			// Mock preset not found
			(getPresetWithDefaults as any).mockResolvedValue(null);

			(executeAgentWithSession as any).mockResolvedValue({
				data: { improvements: [{ prompt: 'Default variant' }] }
			});

			const baseVersion = { content: 'Test' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			const result = await generateVariantsWithModelSelection(baseVersion, judgeResponse, {
				preset: 'NonExistent'
			});

			// Should use policy defaults when preset not found
			expect(result.metadata.model).toEqual({
				providerId: 'anthropic',
				modelId: 'claude-3-5-sonnet-20241022'
			});
			expect(result.metadata.temperature).toBe(0.7);
			expect(result.metadata.preset).toBeUndefined();
		});
	});

	describe('Per-run instruction override', () => {
		it('applies per-run instruction on top of preset', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { getPresetWithDefaults } =
				await import('$lib/server/services/improve-presets.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: [],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			(isModelAllowed as any).mockReturnValue(true);

			// Mock preset with instruction
			(getPresetWithDefaults as any).mockResolvedValue({
				id: 1,
				name: 'Technical',
				instruction: 'Focus on technical accuracy',
				effectiveModel: 'anthropic/claude-3-5-sonnet-20241022',
				effectiveTemperature: 0.7
			});

			const agentCallLog: any[] = [];
			(executeAgentWithSession as any).mockImplementation(async (options: any) => {
				agentCallLog.push(options);
				return { data: { improvements: [{ prompt: 'Variant' }] } };
			});

			const baseVersion = { content: 'Test' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			// Per-run instruction should override preset instruction
			const result = await generateVariantsWithModelSelection(baseVersion, judgeResponse, {
				preset: 'Technical',
				instruction: 'Be creative and innovative'
			});

			// Verify per-run instruction took precedence
			expect(agentCallLog[0].parts[0].text).toContain('Be creative and innovative');
			expect(agentCallLog[0].parts[0].text).not.toContain('Focus on technical accuracy');
			expect(result.metadata).toBeDefined();
		});

		it('applies per-run instruction without preset', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: [],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			(isModelAllowed as any).mockReturnValue(true);

			const agentCallLog: any[] = [];
			(executeAgentWithSession as any).mockImplementation(async (options: any) => {
				agentCallLog.push(options);
				return { data: { improvements: [{ prompt: 'Variant' }] } };
			});

			const baseVersion = { content: 'Test' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			const result = await generateVariantsWithModelSelection(baseVersion, judgeResponse, {
				instruction: 'Simplify this prompt'
			});

			// Verify instruction was included
			expect(agentCallLog[0].parts[0].text).toContain('Simplify this prompt');
			expect(result.metadata.instruction).toBe('Simplify this prompt');
			expect(result.metadata.preset).toBeUndefined();
		});
	});

	describe('Backward compatibility', () => {
		it('works with minimal parameters (backward compat)', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: [],
				improveDefaultModel: 'anthropic/claude-3-5-sonnet-20241022',
				improveTemperature: 0.7
			});

			(isModelAllowed as any).mockReturnValue(true);

			(executeAgentWithSession as any).mockResolvedValue({
				data: { improvements: [{ prompt: 'Variant' }] }
			});

			const baseVersion = { content: 'Test' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			// Call with no options (backward compatible)
			const result = await generateVariantsWithModelSelection(baseVersion, judgeResponse, {});

			expect(result.variants).toEqual(['Variant']);
			expect(result.metadata).toBeDefined();
			expect(result.metadata.model).toEqual({
				providerId: 'anthropic',
				modelId: 'claude-3-5-sonnet-20241022'
			});
		});

		it('returns metadata with model and temperature', async () => {
			const { getOpenCodePolicy, isModelAllowed } =
				await import('$lib/server/services/admin-settings.service');
			const { executeAgentWithSession } = await import('$lib/server/services/opencode.service');
			const { generateVariantsWithModelSelection } =
				await import('$lib/server/services/improvement.service');

			(getOpenCodePolicy as any).mockResolvedValue({
				allowedModels: [],
				improveDefaultModel: 'openai/gpt-4',
				improveTemperature: 0.8
			});

			(isModelAllowed as any).mockReturnValue(true);

			(executeAgentWithSession as any).mockResolvedValue({
				data: { improvements: [{ prompt: 'Variant' }] }
			});

			const baseVersion = { content: 'Test' } as any;
			const judgeResponse = {
				gaps: [],
				recommendations: [],
				clarity: 1,
				completeness: 1,
				specificity: 1
			} as any;

			const result = await generateVariantsWithModelSelection(baseVersion, judgeResponse, {
				temperature: 0.9
			});

			expect(result.metadata).toEqual({
				model: {
					providerId: 'openai',
					modelId: 'gpt-4'
				},
				temperature: 0.9
			});
		});
	});
});
