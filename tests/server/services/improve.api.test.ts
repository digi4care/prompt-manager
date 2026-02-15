// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the services
vi.mock('$lib/server/services/prompts.service', () => ({
	getPrompt: vi.fn()
}));

vi.mock('$lib/server/services/versions.service', () => ({
	getVersion: vi.fn(),
	getLatestVersion: vi.fn(),
	createVersion: vi.fn()
}));

vi.mock('$lib/server/services/judge.service', () => ({
	evaluatePrompt: vi.fn(),
	saveEvaluation: vi.fn()
}));

vi.mock('$lib/server/services/improvement.service', () => ({
	startImprovementLoop: vi.fn(),
	generateVariants: vi.fn(),
	generateVariantsWithModelSelection: vi.fn(),
	completeImprovementLoop: vi.fn(),
	failImprovementLoop: vi.fn()
}));

describe('Improve API - Thinking Integration', () => {
	let mockGetPrompt: ReturnType<typeof vi.fn>;
	let mockGetVersion: ReturnType<typeof vi.fn>;
	let mockGetLatestVersion: ReturnType<typeof vi.fn>;
	let mockCreateVersion: ReturnType<typeof vi.fn>;
	let mockEvaluatePrompt: ReturnType<typeof vi.fn>;
	let mockSaveEvaluation: ReturnType<typeof vi.fn>;
	let mockStartImprovementLoop: ReturnType<typeof vi.fn>;
	let mockGenerateVariants: ReturnType<typeof vi.fn>;
	let mockGenerateVariantsWithModelSelection: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();

		const promptsService = await import('$lib/server/services/prompts.service');
		const versionsService = await import('$lib/server/services/versions.service');
		const judgeService = await import('$lib/server/services/judge.service');
		const improvementService = await import('$lib/server/services/improvement.service');

		mockGetPrompt = promptsService.getPrompt as ReturnType<typeof vi.fn>;
		mockGetVersion = versionsService.getVersion as ReturnType<typeof vi.fn>;
		mockGetLatestVersion = versionsService.getLatestVersion as ReturnType<typeof vi.fn>;
		mockCreateVersion = versionsService.createVersion as ReturnType<typeof vi.fn>;
		mockEvaluatePrompt = judgeService.evaluatePrompt as ReturnType<typeof vi.fn>;
		mockSaveEvaluation = judgeService.saveEvaluation as ReturnType<typeof vi.fn>;
		mockStartImprovementLoop = improvementService.startImprovementLoop as ReturnType<typeof vi.fn>;
		mockGenerateVariants = improvementService.generateVariants as ReturnType<typeof vi.fn>;
		mockGenerateVariantsWithModelSelection =
			improvementService.generateVariantsWithModelSelection as ReturnType<typeof vi.fn>;
	});

	describe('POST /api/prompts/[id]/improve', () => {
		it('should return thinking data from base evaluation', async () => {
			const mockPrompt = {
				id: 1,
				title: 'Test Prompt',
				description: 'Test description',
				purpose: null,
				tags: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				latestVersionId: 1,
				deletedAt: null
			};

			const mockVersion = {
				id: 1,
				promptId: 1,
				version: '1.0.0',
				content: 'Original prompt content',
				metadata: null,
				parentVersionId: null,
				changeType: 'major' as const,
				changeNotes: 'Initial version',
				createdAt: new Date(),
				createdBy: 'user'
			};

			const mockBaseEvaluation = {
				response: {
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
				rawText: '{"clarity": 80, "completeness": 75, "specificity": 85}'
			};

			const mockVariants = ['Improved variant 1', 'Improved variant 2', 'Improved variant 3'];

			const mockVariantVersions = [
				{ ...mockVersion, id: 2, content: mockVariants[0] },
				{ ...mockVersion, id: 3, content: mockVariants[1] },
				{ ...mockVersion, id: 4, content: mockVariants[2] }
			];

			mockGetPrompt.mockResolvedValue(mockPrompt);
			mockGetLatestVersion.mockResolvedValue(mockVersion);
			mockStartImprovementLoop.mockResolvedValue(100);
			mockEvaluatePrompt.mockResolvedValue(mockBaseEvaluation);
			mockSaveEvaluation.mockResolvedValue(200);
			mockGenerateVariantsWithModelSelection.mockResolvedValue({
				variants: mockVariants,
				metadata: {
					model: { providerId: 'anthropic', modelId: 'claude-3-5-sonnet' },
					temperature: 0.5
				}
			});
			mockCreateVersion.mockImplementation((_, content) => {
				const index = mockVariants.indexOf(content);
				return Promise.resolve(mockVariantVersions[index]);
			});

			const requestBody = {
				variantCount: 3,
				autoSelect: false
			};

			const { POST } = await import('$lib/../routes/api/prompts/[id]/improve/+server');

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

			// Verify thinking was saved to database
			expect(mockSaveEvaluation).toHaveBeenCalledWith(
				1,
				mockBaseEvaluation.response,
				mockBaseEvaluation.rawText,
				mockBaseEvaluation.thinking
			);
		});

		it('should handle null thinking in improvement flow', async () => {
			const mockPrompt = {
				id: 2,
				title: 'Another Prompt',
				description: 'Another test',
				purpose: null,
				tags: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				latestVersionId: 5,
				deletedAt: null
			};

			const mockVersion = {
				id: 5,
				promptId: 2,
				version: '2.0.0',
				content: 'Prompt without thinking',
				metadata: null,
				parentVersionId: null,
				changeType: 'major' as const,
				changeNotes: 'Version 2',
				createdAt: new Date(),
				createdBy: 'user'
			};

			const mockBaseEvaluation = {
				response: {
					clarity: 90,
					completeness: 88,
					specificity: 92,
					gaps: [],
					recommendations: []
				},
				thinking: null,
				rawText: '{"clarity": 90, "completeness": 88, "specificity": 92}'
			};

			const mockVariants = ['Variant A', 'Variant B'];

			const mockVariantVersions = [
				{ ...mockVersion, id: 6, content: mockVariants[0] },
				{ ...mockVersion, id: 7, content: mockVariants[1] }
			];

			mockGetPrompt.mockResolvedValue(mockPrompt);
			mockGetLatestVersion.mockResolvedValue(mockVersion);
			mockStartImprovementLoop.mockResolvedValue(101);
			mockEvaluatePrompt.mockResolvedValue(mockBaseEvaluation);
			mockSaveEvaluation.mockResolvedValue(201);
			mockGenerateVariantsWithModelSelection.mockResolvedValue({
				variants: mockVariants,
				metadata: {
					model: { providerId: 'anthropic', modelId: 'claude-3-5-sonnet' },
					temperature: 0.5
				}
			});
			mockCreateVersion.mockImplementation((_, content) => {
				const index = mockVariants.indexOf(content);
				return Promise.resolve(mockVariantVersions[index]);
			});

			const requestBody = {
				variantCount: 2
			};

			const { POST } = await import('$lib/../routes/api/prompts/[id]/improve/+server');

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
			expect(mockSaveEvaluation).toHaveBeenCalledWith(
				5,
				mockBaseEvaluation.response,
				mockBaseEvaluation.rawText,
				null
			);
		});
	});
});
