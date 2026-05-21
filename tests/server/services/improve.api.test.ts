// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the services
vi.mock('$lib/server/services/improvement.service', () => ({
	startImprovementLoop: vi.fn(),
	generateVariants: vi.fn(),
	generateVariantsWithModelSelection: vi.fn(),
	orchestrateImprovement: vi.fn(),
	completeImprovementLoop: vi.fn(),
	failImprovementLoop: vi.fn()
}));

vi.mock('$lib/server/auth.helper', () => ({
	authenticateRequest: vi.fn()
}));

vi.mock('$lib/server/utils/validate-request', () => ({
	validateRequest: vi.fn()
}));

describe('Improve API - Thinking Integration', () => {
	let mockOrchestrateImprovement: ReturnType<typeof vi.fn>;
	let mockValidateRequest: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();

		const improvementService = await import('$lib/server/services/improvement.service');
		const validateModule = await import('$lib/server/utils/validate-request');

		mockOrchestrateImprovement =
			improvementService.orchestrateImprovement as ReturnType<typeof vi.fn>;
		mockValidateRequest = validateModule.validateRequest as ReturnType<typeof vi.fn>;
	});

	describe('POST /api/prompts/[id]/improve', () => {
		it('should return thinking data from base evaluation', async () => {
			const mockResult = {
				loopId: 100,
				status: 'pending_selection',
				evaluation: {
					clarity: 80,
					completeness: 75,
					specificity: 85,
					gaps: ['Missing context', 'No examples'],
					recommendations: ['Add more detail', 'Include examples']
				},
				thinking: {
					thinking:
						'The prompt needs more context to be fully effective. While the core idea is clear, adding examples would significantly improve its usability.',
					signature: 'eval_sig_001'
				},
				variants: [
					{
						id: 2,
						promptId: 1,
						version: '1.0.1',
						content: 'Improved variant 1',
						metadata: null,
						parentVersionId: 1,
						changeType: 'minor',
						changeNotes: 'Improvement variant 1 from loop 100',
						createdAt: new Date(),
						createdBy: 'system'
					},
					{
						id: 3,
						promptId: 1,
						version: '1.0.2',
						content: 'Improved variant 2',
						metadata: null,
						parentVersionId: 1,
						changeType: 'minor',
						changeNotes: 'Improvement variant 2 from loop 100',
						createdAt: new Date(),
						createdBy: 'system'
					},
					{
						id: 4,
						promptId: 1,
						version: '1.0.3',
						content: 'Improved variant 3',
						metadata: null,
						parentVersionId: 1,
						changeType: 'minor',
						changeNotes: 'Improvement variant 3 from loop 100',
						createdAt: new Date(),
						createdBy: 'system'
					}
				],
				metadata: {
					model: { providerId: 'anthropic', modelId: 'claude-3-5-sonnet' },
					temperature: 0.5
				}
			};

			const requestBody = {
				variantCount: 3,
				autoSelect: false
			};

			mockValidateRequest.mockResolvedValue(requestBody);
			mockOrchestrateImprovement.mockResolvedValue(mockResult);

			const { POST } = await import('$lib/../routes/api/prompts/[id=int]/improve/+server');

			const request = new Request('http://localhost/api/prompts/1/improve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			const mockRequestEvent = {
				request,
				params: { id: '1' }
			} as unknown as RequestEvent;

			const response = await POST(mockRequestEvent);
			const data = await response.json();

			// Verify thinking data is included in response
			expect(data.data.thinking).toBeDefined();
			expect(data.data.thinking.thinking).toBe(
				'The prompt needs more context to be fully effective. While the core idea is clear, adding examples would significantly improve its usability.'
			);
			expect(data.data.thinking.signature).toBe('eval_sig_001');
			expect(data.data.status).toBe('pending_selection');
			expect(data.data.variants).toHaveLength(3);

			// Verify orchestrateImprovement was called correctly
			expect(mockOrchestrateImprovement).toHaveBeenCalledWith({
				promptId: 1,
				versionId: undefined,
				variantCount: 3,
				autoSelect: false,
				improveOptions: {}
			});
		});

		it('should handle null thinking in improvement flow', async () => {
			const mockResult = {
				loopId: 101,
				status: 'pending_selection',
				evaluation: {
					clarity: 90,
					completeness: 88,
					specificity: 92,
					gaps: [],
					recommendations: []
				},
				thinking: null,
				variants: [
					{
						id: 6,
						promptId: 2,
						version: '2.0.1',
						content: 'Variant A',
						metadata: null,
						parentVersionId: 5,
						changeType: 'minor',
						changeNotes: 'Improvement variant 1 from loop 101',
						createdAt: new Date(),
						createdBy: 'system'
					},
					{
						id: 7,
						promptId: 2,
						version: '2.0.2',
						content: 'Variant B',
						metadata: null,
						parentVersionId: 5,
						changeType: 'minor',
						changeNotes: 'Improvement variant 2 from loop 101',
						createdAt: new Date(),
						createdBy: 'system'
					}
				],
				metadata: {
					model: { providerId: 'anthropic', modelId: 'claude-3-5-sonnet' },
					temperature: 0.5
				}
			};

			const requestBody = {
				variantCount: 2
			};

			mockValidateRequest.mockResolvedValue(requestBody);
			mockOrchestrateImprovement.mockResolvedValue(mockResult);

			const { POST } = await import('$lib/../routes/api/prompts/[id=int]/improve/+server');

			const request = new Request('http://localhost/api/prompts/2/improve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			const mockRequestEvent = {
				request,
				params: { id: '2' }
			} as unknown as RequestEvent;

			const response = await POST(mockRequestEvent);
			const data = await response.json();

			expect(data.data.thinking).toBeNull();

			// Verify orchestrateImprovement was called correctly
			expect(mockOrchestrateImprovement).toHaveBeenCalledWith({
				promptId: 2,
				versionId: undefined,
				variantCount: 2,
				autoSelect: undefined,
				improveOptions: {
					instruction: undefined,
					preset: undefined,
					providerId: undefined,
					modelId: undefined,
					temperature: undefined,
					maxTokens: undefined
				}
			});
		});
	});
});
