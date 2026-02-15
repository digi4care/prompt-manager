// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the JWT auth module
vi.mock('$lib/server/auth/jwt', () => ({
	authenticateRequest: vi
		.fn()
		.mockReturnValue({ userId: '123', email: 'test@example.com', role: 'user' })
}));

// Mock the services
vi.mock('$lib/server/services/judge.service', () => ({
	evaluatePrompt: vi.fn(),
	saveEvaluation: vi.fn()
}));

vi.mock('$lib/server/services/versions.service', () => ({
	getVersion: vi.fn()
}));

describe('Judge API - Thinking Integration', () => {
	let mockEvaluatePrompt: ReturnType<typeof vi.fn>;
	let mockSaveEvaluation: ReturnType<typeof vi.fn>;
	let mockGetVersion: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		// Reset mocks before each test
		vi.clearAllMocks();

		// Get the mocked functions
		const judgeService = await import('$lib/server/services/judge.service');
		const versionsService = await import('$lib/server/services/versions.service');

		mockEvaluatePrompt = judgeService.evaluatePrompt as ReturnType<typeof vi.fn>;
		mockSaveEvaluation = judgeService.saveEvaluation as ReturnType<typeof vi.fn>;
		mockGetVersion = versionsService.getVersion as ReturnType<typeof vi.fn>;
	});

	describe('POST /api/judge/evaluate', () => {
		it('should return thinking data when present in AI response', async () => {
			const mockVersion = {
				id: 1,
				promptId: 1,
				version: '1.0.0',
				content: 'Test prompt content',
				metadata: null,
				parentVersionId: null,
				changeType: 'major' as const,
				changeNotes: 'Initial version',
				createdAt: new Date(),
				createdBy: 'user'
			};

			const mockEvaluationResult = {
				response: {
					clarity: 85,
					completeness: 80,
					specificity: 90,
					gaps: ['Missing examples'],
					recommendations: ['Add more context']
				},
				thinking: {
					thinking: 'The prompt is well-structured but could benefit from examples.',
					signature: 'sig123'
				},
				rawText: '{"clarity": 85, "completeness": 80, "specificity": 90}',
				providerId: 'minimax',
				modelId: 'MiniMax-M2.1',
				temperature: 0.0,
				maxTokens: undefined,
				allowedModels: undefined
			};

			mockGetVersion.mockResolvedValue(mockVersion);
			mockEvaluatePrompt.mockResolvedValue(mockEvaluationResult);
			mockSaveEvaluation.mockResolvedValue(123);

			const requestBody = {
				versionId: 1
			};

			// Dynamically import the API handler
			const { POST } = await import('$lib/../routes/api/judge/evaluate/+server');

			// Create mock request
			const request = new Request('http://localhost/api/judge/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			const mockRequestEvent = {
				request,
				params: {}
			} as unknown as RequestEvent;

			const response = await POST(mockRequestEvent);
			const data = await response.json();

			expect(data.data.thinking).toBeDefined();
			expect(data.data.thinking.thinking).toBe(
				'The prompt is well-structured but could benefit from examples.'
			);
			expect(data.data.thinking.signature).toBe('sig123');
			expect(mockSaveEvaluation).toHaveBeenCalledWith(
				1,
				mockEvaluationResult.response,
				mockEvaluationResult.rawText,
				mockEvaluationResult.thinking,
				{
					providerId: mockEvaluationResult.providerId,
					modelId: mockEvaluationResult.modelId,
					temperature: mockEvaluationResult.temperature,
					maxTokens: mockEvaluationResult.maxTokens
				}
			);
		});

		it('should handle null thinking when not present in AI response', async () => {
			const mockVersion = {
				id: 2,
				promptId: 1,
				version: '1.0.1',
				content: 'Updated prompt',
				metadata: null,
				parentVersionId: 1,
				changeType: 'minor' as const,
				changeNotes: 'Minor update',
				createdAt: new Date(),
				createdBy: 'user'
			};

			const mockEvaluationResult = {
				response: {
					clarity: 90,
					completeness: 85,
					specificity: 88,
					gaps: [],
					recommendations: []
				},
				thinking: null,
				rawText: '{"clarity": 90, "completeness": 85, "specificity": 88}',
				providerId: 'minimax',
				modelId: 'MiniMax-M2.1',
				temperature: 0.0,
				maxTokens: undefined,
				allowedModels: undefined
			};

			mockGetVersion.mockResolvedValue(mockVersion);
			mockEvaluatePrompt.mockResolvedValue(mockEvaluationResult);
			mockSaveEvaluation.mockResolvedValue(124);

			const requestBody = {
				versionId: 2
			};

			const { POST } = await import('$lib/../routes/api/judge/evaluate/+server');

			const request = new Request('http://localhost/api/judge/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			const mockRequestEvent = {
				request,
				params: {}
			} as unknown as RequestEvent;

			const response = await POST(mockRequestEvent);
			const data = await response.json();

			expect(data.data.thinking).toBeNull();
			expect(mockSaveEvaluation).toHaveBeenCalledWith(
				2,
				mockEvaluationResult.response,
				mockEvaluationResult.rawText,
				null,
				{
					providerId: mockEvaluationResult.providerId,
					modelId: mockEvaluationResult.modelId,
					temperature: mockEvaluationResult.temperature,
					maxTokens: mockEvaluationResult.maxTokens
				}
			);
		});

		it('should handle ad-hoc evaluation without saving thinking', async () => {
			const mockEvaluationResult = {
				response: {
					clarity: 75,
					completeness: 70,
					specificity: 80,
					gaps: ['Needs clarification'],
					recommendations: ['Be more specific']
				},
				thinking: {
					thinking: 'This is an ad-hoc evaluation.',
					signature: 'sig456'
				},
				rawText: '{"clarity": 75}',
				providerId: 'minimax',
				modelId: 'MiniMax-M2.1',
				temperature: 0.0,
				maxTokens: undefined,
				allowedModels: undefined
			};

			mockEvaluatePrompt.mockResolvedValue(mockEvaluationResult);

			const requestBody = {
				content: 'Ad-hoc prompt content for evaluation'
			};

			const { POST } = await import('$lib/../routes/api/judge/evaluate/+server');

			const request = new Request('http://localhost/api/judge/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestBody)
			});

			const mockRequestEvent = {
				request,
				params: {}
			} as unknown as RequestEvent;

			const response = await POST(mockRequestEvent);
			const data = await response.json();

			expect(data.data.thinking).toBeDefined();
			expect(data.data.thinking.thinking).toBe('This is an ad-hoc evaluation.');
			expect(data.data.evaluationId).toBeNull();
			expect(mockSaveEvaluation).not.toHaveBeenCalled();
		});
	});
});
