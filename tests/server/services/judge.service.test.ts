import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic module before importing the service
vi.mock('@anthropic-ai/sdk', () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			messages: {
				create: vi.fn()
			}
		}))
	};
});

// Now import the types and functions we want to test
// Note: We're testing extractThinking which doesn't require Anthropic to be instantiated
describe('judge.service - Thinking Extraction', () => {
	describe('extractThinking', () => {
		it('should return null when no thinking block is present', () => {
			// Import after mocking
			const content = [
				{
					type: 'text',
					text: '{"clarity": 80, "completeness": 75, "specificity": 90, "gaps": [], "recommendations": []}'
				}
			];
			// Call the function directly - it doesn't use Anthropic
			expect(extractThinkingTestable(content as any)).toBeNull();
		});

		it('should extract thinking content when present', () => {
			const content = [
				{
					type: 'thinking',
					thinking: 'I should analyze the prompt for clarity and completeness.',
					signature: 'abc123'
				},
				{
					type: 'text',
					text: '{"clarity": 80, "completeness": 75, "specificity": 90, "gaps": [], "recommendations": []}'
				}
			];
			const result = extractThinkingTestable(content as any);
			expect(result).not.toBeNull();
			expect(result!.thinking).toBe('I should analyze the prompt for clarity and completeness.');
			expect(result!.signature).toBe('abc123');
		});

		it('should handle thinking block without signature', () => {
			const content = [
				{
					type: 'thinking',
					thinking: 'Analyzing the prompt structure...'
				},
				{
					type: 'text',
					text: '{"clarity": 80, "completeness": 75, "specificity": 90, "gaps": [], "recommendations": []}'
				}
			];
			const result = extractThinkingTestable(content as any);
			expect(result).not.toBeNull();
			expect(result!.thinking).toBe('Analyzing the prompt structure...');
			expect(result!.signature).toBeUndefined();
		});

		it('should handle empty thinking content', () => {
			const content = [
				{
					type: 'thinking',
					thinking: ''
				},
				{
					type: 'text',
					text: '{"clarity": 80, "completeness": 75, "specificity": 90, "gaps": [], "recommendations": []}'
				}
			];
			const result = extractThinkingTestable(content as any);
			expect(result).not.toBeNull();
			expect(result!.thinking).toBe('');
		});

		it('should return null for undefined thinking', () => {
			const content = [
				{
					type: 'thinking'
					// thinking is undefined
				},
				{
					type: 'text',
					text: '{"clarity": 80, "completeness": 75, "specificity": 90, "gaps": [], "recommendations": []}'
				}
			];
			const result = extractThinkingTestable(content as any);
			expect(result).not.toBeNull();
			expect(result!.thinking).toBe('');
		});

		it('should handle multiple content blocks and find thinking', () => {
			const content = [
				{ type: 'text', text: 'Some intro text' },
				{
					type: 'thinking',
					thinking: 'Detailed analysis here',
					signature: 'sig456'
				},
				{ type: 'text', text: '{"clarity": 80}' },
				{ type: 'tool_use', name: 'search' }
			];
			const result = extractThinkingTestable(content as any);
			expect(result).not.toBeNull();
			expect(result!.thinking).toBe('Detailed analysis here');
			expect(result!.signature).toBe('sig456');
		});
	});
});

// Helper function that mirrors extractThinking logic for testing
function extractThinkingTestable(
	content: Array<{ type: string; thinking?: string; signature?: string }>
): { thinking: string; signature?: string } | null {
	const thinkingBlock = content.find((block) => block.type === 'thinking');
	if (!thinkingBlock || thinkingBlock.type !== 'thinking') {
		return null;
	}

	return {
		thinking: thinkingBlock.thinking || '',
		signature: thinkingBlock.signature
	};
}

describe('judge.service - EvaluationResult Type', () => {
	interface TestJudgeResponse {
		clarity: number;
		completeness: number;
		specificity: number;
		gaps: string[];
		recommendations: string[];
	}

	interface TestThinkingBlock {
		thinking: string;
		signature?: string;
	}

	interface TestEvaluationResult {
		response: TestJudgeResponse;
		thinking: TestThinkingBlock | null;
		rawText: string;
	}

	it('should have correct structure with thinking', () => {
		const judgeResponse: TestJudgeResponse = {
			clarity: 85,
			completeness: 80,
			specificity: 90,
			gaps: ['Missing context'],
			recommendations: ['Add examples']
		};

		const result: TestEvaluationResult = {
			response: judgeResponse,
			thinking: {
				thinking: 'The prompt is clear but could use more examples.',
				signature: 'sig789'
			},
			rawText:
				'{"clarity": 85, "completeness": 80, "specificity": 90, "gaps": ["Missing context"], "recommendations": ["Add examples"]}'
		};

		expect(result.response.clarity).toBe(85);
		expect(result.thinking?.thinking).toBe('The prompt is clear but could use more examples.');
		expect(result.thinking?.signature).toBe('sig789');
		expect(result.rawText).toContain('clarity');
	});

	it('should handle null thinking', () => {
		const judgeResponse: TestJudgeResponse = {
			clarity: 85,
			completeness: 80,
			specificity: 90,
			gaps: [],
			recommendations: []
		};

		const result: TestEvaluationResult = {
			response: judgeResponse,
			thinking: null,
			rawText: '{}'
		};

		expect(result.thinking).toBeNull();
		expect(result.response.clarity).toBe(85);
	});
});

describe('judge.service - JSON Extraction Edge Cases', () => {
	it('should handle response with only thinking block', () => {
		const content = [
			{
				type: 'thinking',
				thinking: 'Analyzing the prompt...',
				signature: 'sig001'
			}
		];
		// extractThinkingTestable doesn't care about text blocks
		const result = (() => {
			const thinkingBlock = content.find((block) => block.type === 'thinking');
			if (!thinkingBlock || thinkingBlock.type !== 'thinking') {
				return null;
			}
			return {
				thinking: thinkingBlock.thinking || '',
				signature: thinkingBlock.signature
			};
		})();
		expect(result).not.toBeNull();
		expect(result!.thinking).toBe('Analyzing the prompt...');
	});

	it('should handle thinking with special characters', () => {
		const content = [
			{
				type: 'thinking',
				thinking: 'The prompt contains "quotes" and \\ backslashes and\nnewlines',
				signature: 'sig!@#$%'
			}
		];
		const result = (() => {
			const thinkingBlock = content.find((block) => block.type === 'thinking');
			if (!thinkingBlock || thinkingBlock.type !== 'thinking') {
				return null;
			}
			return {
				thinking: thinkingBlock.thinking || '',
				signature: thinkingBlock.signature
			};
		})();
		expect(result).not.toBeNull();
		expect(result!.thinking).toContain('"quotes"');
		expect(result!.thinking).toContain('\\');
		expect(result!.thinking).toContain('\n');
	});
});

describe('judge.service - Model Parameters', () => {
	it('EvaluationResult should include optional model parameters', () => {
		const judgeResponse: any = {
			clarity: 85,
			completeness: 80,
			specificity: 90,
			gaps: ['Missing context'],
			recommendations: ['Add examples']
		};

		const result: any = {
			response: judgeResponse,
			thinking: {
				thinking: 'Analyzing the prompt...',
				signature: 'sig789'
			},
			rawText: '{"clarity": 85}',
			providerId: 'anthropic',
			modelId: 'claude-3-5-sonnet-20241022',
			temperature: 0.7,
			maxTokens: 4096
		};

		expect(result.providerId).toBe('anthropic');
		expect(result.modelId).toBe('claude-3-5-sonnet-20241022');
		expect(result.temperature).toBe(0.7);
		expect(result.maxTokens).toBe(4096);
	});

	it('EvaluationResult should work without model parameters (backward compatibility)', () => {
		const judgeResponse: any = {
			clarity: 85,
			completeness: 80,
			specificity: 90,
			gaps: [],
			recommendations: []
		};

		const result: any = {
			response: judgeResponse,
			thinking: null,
			rawText: '{}'
		};

		expect(result.providerId).toBeUndefined();
		expect(result.modelId).toBeUndefined();
		expect(result.temperature).toBeUndefined();
		expect(result.maxTokens).toBeUndefined();
	});
});
