import { describe, it, expect } from 'vitest';
import {
	parseImproveAgentResponse,
	parseJudgeAgentResponse,
	OpencodeContractError
} from '$lib/server/opencode/contracts';

describe('OpenCode agent contracts', () => {
	describe('parseImproveAgentResponse', () => {
		it('accepts a valid improve response', () => {
			const parsed = parseImproveAgentResponse({
				improvements: [
					{ version: '2.0', changes: 'clarified output', prompt: 'A' },
					{ version: '3.0', changes: 'added constraints', prompt: 'B' },
					{ version: '4.0', changes: 'added examples', prompt: 'C' }
				]
			});
			expect(parsed.improvements).toHaveLength(3);
			expect(parsed.improvements[0].prompt).toBe('A');
		});

		it('rejects missing improvements', () => {
			expect(() => parseImproveAgentResponse({})).toThrow(OpencodeContractError);
		});

		it('rejects non-string prompt', () => {
			expect(() => parseImproveAgentResponse({ improvements: [{ prompt: 123 }] })).toThrow(
				/prompt must be a string/i
			);
		});
	});

	describe('parseJudgeAgentResponse', () => {
		it('accepts a valid judge response', () => {
			const parsed = parseJudgeAgentResponse({
				score: 8,
				criteria: { clarity: 9, specificity: 8, structure: 7, constraints: 8 },
				gaps: ['missing output format'],
				recommendations: ['add an output section'],
				summary: 'good overall'
			});
			expect(parsed.score).toBe(8);
			expect(parsed.criteria.clarity).toBe(9);
		});

		it('rejects missing criteria', () => {
			expect(() =>
				parseJudgeAgentResponse({ score: 1, gaps: [], recommendations: [], criteria: {} })
			).toThrow(/criteria\.clarity/i);
		});
	});
});
