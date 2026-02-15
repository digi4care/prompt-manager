import { describe, it, expect } from 'vitest';

// Types matching the component
interface JudgeResponse {
	clarity: number;
	completeness: number;
	specificity: number;
	gaps: string[];
	recommendations: string[];
}

interface PromptVariant {
	id: number;
	version: string;
	content: string;
	changeType: string;
	changeNotes: string | null;
	createdAt: string;
	createdBy: string;
}

interface VariantWithEvaluation {
	variant: PromptVariant;
	evaluation: JudgeResponse;
}

interface ParentVersion {
	id: number;
	version: string;
	content: string;
	title?: string;
	description?: string;
	tags?: string[];
	platform?: string;
	purpose?: string;
}

// Helper functions extracted from the component for testing
function getScoreColor(score: number): string {
	if (score >= 80) return 'text-green-600 dark:text-green-400';
	if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
	return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(score: number): string {
	if (score >= 80) return 'bg-green-500';
	if (score >= 60) return 'bg-yellow-500';
	return 'bg-red-500';
}

function getOverallScore(evaluation: JudgeResponse): number {
	return Math.round((evaluation.clarity + evaluation.completeness + evaluation.specificity) / 3);
}

function formatScore(score: number): string {
	if (score >= 90) return 'Excellent';
	if (score >= 80) return 'Good';
	if (score >= 70) return 'Fair';
	if (score >= 60) return 'Needs Work';
	return 'Poor';
}

function findBestVariant(variants: VariantWithEvaluation[]): VariantWithEvaluation | null {
	return variants.reduce((best, current) => {
		const bestScore = best ? getOverallScore(best.evaluation) : 0;
		const currentScore = getOverallScore(current.evaluation);
		return currentScore > bestScore ? current : best;
	}, null as VariantWithEvaluation | null);
}

// Sample data for testing
const sampleEvaluation: JudgeResponse = {
	clarity: 75,
	completeness: 80,
	specificity: 70,
	gaps: ['Missing examples'],
	recommendations: ['Add examples']
};

const sampleVariants: VariantWithEvaluation[] = [
	{
		variant: {
			id: 101,
			version: '1.1.0',
			content: 'Improved content with better clarity',
			changeType: 'minor',
			changeNotes: 'Enhanced for clarity',
			createdAt: '2025-12-28T10:00:00Z',
			createdBy: 'AI'
		},
		evaluation: { ...sampleEvaluation, clarity: 85 }
	},
	{
		variant: {
			id: 102,
			version: '1.1.0',
			content: 'Another improved version',
			changeType: 'minor',
			changeNotes: 'Added examples',
			createdAt: '2025-12-28T10:01:00Z',
			createdBy: 'AI'
		},
		evaluation: { ...sampleEvaluation, completeness: 90 }
	}
];

const sampleParentVersion: ParentVersion = {
	id: 1,
	version: '1.0.0',
	title: 'Test Prompt',
	description: 'A test prompt',
	content: 'Original content',
	tags: ['test'],
	platform: 'OpenAI',
	purpose: 'development'
};

describe('VariantComparison Helpers', () => {
	describe('getScoreColor', () => {
		it('should return green for high scores (>=80)', () => {
			expect(getScoreColor(80)).toBe('text-green-600 dark:text-green-400');
			expect(getScoreColor(90)).toBe('text-green-600 dark:text-green-400');
			expect(getScoreColor(100)).toBe('text-green-600 dark:text-green-400');
		});

		it('should return yellow for medium scores (60-79)', () => {
			expect(getScoreColor(60)).toBe('text-yellow-600 dark:text-yellow-400');
			expect(getScoreColor(70)).toBe('text-yellow-600 dark:text-yellow-400');
			expect(getScoreColor(79)).toBe('text-yellow-600 dark:text-yellow-400');
		});

		it('should return red for low scores (<60)', () => {
			expect(getScoreColor(59)).toBe('text-red-600 dark:text-red-400');
			expect(getScoreColor(30)).toBe('text-red-600 dark:text-red-400');
			expect(getScoreColor(0)).toBe('text-red-600 dark:text-red-400');
		});
	});

	describe('getScoreBgColor', () => {
		it('should return green background for high scores', () => {
			expect(getScoreBgColor(80)).toBe('bg-green-500');
			expect(getScoreBgColor(95)).toBe('bg-green-500');
		});

		it('should return yellow background for medium scores', () => {
			expect(getScoreBgColor(60)).toBe('bg-yellow-500');
			expect(getScoreBgColor(75)).toBe('bg-yellow-500');
		});

		it('should return red background for low scores', () => {
			expect(getScoreBgColor(59)).toBe('bg-red-500');
			expect(getScoreBgColor(25)).toBe('bg-red-500');
		});
	});

	describe('getOverallScore', () => {
		it('should calculate average correctly', () => {
			const evaluation: JudgeResponse = {
				clarity: 80,
				completeness: 80,
				specificity: 80,
				gaps: [],
				recommendations: []
			};
			expect(getOverallScore(evaluation)).toBe(80);
		});

		it('should round to nearest integer', () => {
			const evaluation: JudgeResponse = {
				clarity: 80,
				completeness: 85,
				specificity: 90,
				gaps: [],
				recommendations: []
			};
			// (80 + 85 + 90) / 3 = 85
			expect(getOverallScore(evaluation)).toBe(85);
		});

		it('should handle decimal values correctly', () => {
			const evaluation: JudgeResponse = {
				clarity: 80,
				completeness: 80,
				specificity: 79,
				gaps: [],
				recommendations: []
			};
			// (80 + 80 + 79) / 3 = 79.666... -> 80
			expect(getOverallScore(evaluation)).toBe(80);
		});

		it('should handle zero scores', () => {
			const evaluation: JudgeResponse = {
				clarity: 0,
				completeness: 0,
				specificity: 0,
				gaps: [],
				recommendations: []
			};
			expect(getOverallScore(evaluation)).toBe(0);
		});
	});

	describe('formatScore', () => {
		it('should return Excellent for scores >= 90', () => {
			expect(formatScore(90)).toBe('Excellent');
			expect(formatScore(95)).toBe('Excellent');
			expect(formatScore(100)).toBe('Excellent');
		});

		it('should return Good for scores 80-89', () => {
			expect(formatScore(80)).toBe('Good');
			expect(formatScore(85)).toBe('Good');
			expect(formatScore(89)).toBe('Good');
		});

		it('should return Fair for scores 70-79', () => {
			expect(formatScore(70)).toBe('Fair');
			expect(formatScore(75)).toBe('Fair');
			expect(formatScore(79)).toBe('Fair');
		});

		it('should return Needs Work for scores 60-69', () => {
			expect(formatScore(60)).toBe('Needs Work');
			expect(formatScore(65)).toBe('Needs Work');
			expect(formatScore(69)).toBe('Needs Work');
		});

		it('should return Poor for scores < 60', () => {
			expect(formatScore(59)).toBe('Poor');
			expect(formatScore(30)).toBe('Poor');
			expect(formatScore(0)).toBe('Poor');
		});
	});

	describe('findBestVariant', () => {
		it('should return the variant with highest score', () => {
			// Variant 102 has completeness 90 vs variant 101 clarity 85
			// Sample evaluation has clarity 75, completeness 80, specificity 70
			// Variant 101: (85 + 80 + 70) / 3 = 78
			// Variant 102: (75 + 90 + 70) / 3 = 78
			// Both have same score, so first one (101) is returned
			const best = findBestVariant(sampleVariants);
			expect(best).not.toBeNull();
			expect(best?.variant.id).toBe(101); // Same score, first variant wins
		});

		it('should return variant with higher score', () => {
			const variants: VariantWithEvaluation[] = [
				{
					variant: { id: 1, version: '1.0.0', content: 'test', changeType: 'minor', changeNotes: null, createdAt: '', createdBy: '' },
					evaluation: { clarity: 70, completeness: 70, specificity: 70, gaps: [], recommendations: [] }
				},
				{
					variant: { id: 2, version: '1.0.0', content: 'test', changeType: 'minor', changeNotes: null, createdAt: '', createdBy: '' },
					evaluation: { clarity: 90, completeness: 90, specificity: 90, gaps: [], recommendations: [] }
				}
			];
			const best = findBestVariant(variants);
			expect(best?.variant.id).toBe(2); // Higher score
		});

		it('should return null for empty array', () => {
			const result = findBestVariant([]);
			expect(result).toBeNull();
		});

		it('should return first variant when all have same score', () => {
			const sameScoreVariants: VariantWithEvaluation[] = [
				{
					variant: { id: 1, version: '1.0.0', content: 'test', changeType: 'minor', changeNotes: null, createdAt: '', createdBy: '' },
					evaluation: { clarity: 80, completeness: 80, specificity: 80, gaps: [], recommendations: [] }
				},
				{
					variant: { id: 2, version: '1.0.0', content: 'test', changeType: 'minor', changeNotes: null, createdAt: '', createdBy: '' },
					evaluation: { clarity: 80, completeness: 80, specificity: 80, gaps: [], recommendations: [] }
				}
			];
			const best = findBestVariant(sameScoreVariants);
			expect(best?.variant.id).toBe(1);
		});
	});
});

describe('VariantComparison Types', () => {
	describe('JudgeResponse', () => {
		it('should accept valid judge response data', () => {
			const response: JudgeResponse = {
				clarity: 85,
				completeness: 90,
				specificity: 75,
				gaps: ['Gap 1', 'Gap 2'],
				recommendations: ['Rec 1']
			};
			expect(response.clarity).toBe(85);
			expect(response.gaps).toHaveLength(2);
		});

		it('should accept empty gaps and recommendations', () => {
			const response: JudgeResponse = {
				clarity: 75,
				completeness: 75,
				specificity: 75,
				gaps: [],
				recommendations: []
			};
			expect(response.gaps).toHaveLength(0);
			expect(response.recommendations).toHaveLength(0);
		});
	});

	describe('PromptVariant', () => {
		it('should accept valid variant data', () => {
			const variant: PromptVariant = {
				id: 101,
				version: '1.3.0',
				content: 'Test content',
				changeType: 'minor',
				changeNotes: 'Improved clarity',
				createdAt: '2025-12-28T10:00:00Z',
				createdBy: 'AI'
			};
			expect(variant.id).toBe(101);
			expect(variant.version).toBe('1.3.0');
		});

		it('should accept null changeNotes', () => {
			const variant: PromptVariant = {
				id: 101,
				version: '1.0.0',
				content: 'Test',
				changeType: 'major',
				changeNotes: null,
				createdAt: '',
				createdBy: ''
			};
			expect(variant.changeNotes).toBeNull();
		});
	});

	describe('ParentVersion', () => {
		it('should accept valid parent version data', () => {
			const parent: ParentVersion = {
				id: 1,
				version: '1.0.0',
				content: 'Original content'
			};
			expect(parent.id).toBe(1);
			expect(parent.content).toBe('Original content');
		});

		it('should accept optional fields', () => {
			const parent: ParentVersion = {
				id: 1,
				version: '1.0.0',
				content: 'Content',
				title: 'Test Title',
				description: 'Test Description',
				tags: ['tag1', 'tag2'],
				platform: 'OpenAI',
				purpose: 'development'
			};
			expect(parent.title).toBe('Test Title');
			expect(parent.tags).toHaveLength(2);
		});
	});

	describe('VariantWithEvaluation', () => {
		it('should combine variant and evaluation', () => {
			const combined: VariantWithEvaluation = {
				variant: {
					id: 101,
					version: '1.0.0',
					content: 'Test',
					changeType: 'minor',
					changeNotes: null,
					createdAt: '',
					createdBy: ''
				},
				evaluation: {
					clarity: 80,
					completeness: 80,
					specificity: 80,
					gaps: [],
					recommendations: []
				}
			};
			expect(combined.variant.id).toBe(101);
			expect(combined.evaluation.clarity).toBe(80);
		});
	});
});
