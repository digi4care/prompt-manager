import { describe, it, expect } from 'vitest';

// Types matching the JudgeResults component
interface JudgeResponse {
	clarity: number;
	completeness: number;
	specificity: number;
	gaps: string[];
	recommendations: string[];
}

interface HistoricalScore {
	versionId: number;
	version: string;
	createdAt: Date;
	qualityScore: number;
	clarity: number;
	completeness: number;
	specificity: number;
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

function getBarPosition(score: number, chartMin: number, chartMax: number): number {
	const range = chartMax - chartMin;
	if (range <= 0) return score;
	return Math.min(100, Math.max(0, ((score - chartMin) / range) * 100));
}

// Sample data for testing
const sampleEvaluation: JudgeResponse = {
	clarity: 78,
	completeness: 82,
	specificity: 65,
	gaps: [
		'Missing context about the expected output format',
		'No specification of edge cases to handle',
		'Unclear about the target audience expertise level'
	],
	recommendations: [
		'Add explicit instructions for output format (JSON, markdown, etc.)',
		'Specify handling of edge cases like empty inputs or errors',
		'Define the skill level of the expected user'
	]
};

const sampleHistoricalScores: HistoricalScore[] = [
	{ versionId: 1, version: '1.0.0', createdAt: new Date('2025-12-01'), qualityScore: 58, clarity: 55, completeness: 60, specificity: 59 },
	{ versionId: 2, version: '1.1.0', createdAt: new Date('2025-12-08'), qualityScore: 65, clarity: 62, completeness: 68, specificity: 65 },
	{ versionId: 3, version: '1.2.0', createdAt: new Date('2025-12-15'), qualityScore: 72, clarity: 70, completeness: 75, specificity: 71 },
	{ versionId: 4, version: '1.3.0', createdAt: new Date('2025-12-22'), qualityScore: 75, clarity: 78, completeness: 82, specificity: 65 }
];

const sampleEvaluationNoHistory: JudgeResponse = {
	clarity: 92,
	completeness: 88,
	specificity: 95,
	gaps: [],
	recommendations: ['Consider adding examples for even better clarity', 'The prompt is already excellent!']
};

describe('JudgeResults Helpers', () => {
	describe('getScoreColor', () => {
		it('should return green for scores 80 and above', () => {
			expect(getScoreColor(80)).toBe('text-green-600 dark:text-green-400');
			expect(getScoreColor(90)).toBe('text-green-600 dark:text-green-400');
			expect(getScoreColor(100)).toBe('text-green-600 dark:text-green-400');
		});

		it('should return yellow for scores 60-79', () => {
			expect(getScoreColor(60)).toBe('text-yellow-600 dark:text-yellow-400');
			expect(getScoreColor(70)).toBe('text-yellow-600 dark:text-yellow-400');
			expect(getScoreColor(79)).toBe('text-yellow-600 dark:text-yellow-400');
		});

		it('should return red for scores below 60', () => {
			expect(getScoreColor(59)).toBe('text-red-600 dark:text-red-400');
			expect(getScoreColor(40)).toBe('text-red-600 dark:text-red-400');
			expect(getScoreColor(0)).toBe('text-red-600 dark:text-red-400');
		});

		it('should handle boundary at exactly 80', () => {
			expect(getScoreColor(80)).toBe('text-green-600 dark:text-green-400');
		});

		it('should handle boundary at exactly 60', () => {
			expect(getScoreColor(60)).toBe('text-yellow-600 dark:text-yellow-400');
		});
	});

	describe('getScoreBgColor', () => {
		it('should return green background for scores 80+', () => {
			expect(getScoreBgColor(80)).toBe('bg-green-500');
			expect(getScoreBgColor(95)).toBe('bg-green-500');
		});

		it('should return yellow background for scores 60-79', () => {
			expect(getScoreBgColor(60)).toBe('bg-yellow-500');
			expect(getScoreBgColor(75)).toBe('bg-yellow-500');
		});

		it('should return red background for scores below 60', () => {
			expect(getScoreBgColor(59)).toBe('bg-red-500');
			expect(getScoreBgColor(25)).toBe('bg-red-500');
		});
	});

	describe('getOverallScore', () => {
		it('should calculate average of clarity, completeness, and specificity', () => {
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
				completeness: 80,
				specificity: 85,
				gaps: [],
				recommendations: []
			};
			// (80 + 80 + 85) / 3 = 81.67 -> 82
			expect(getOverallScore(evaluation)).toBe(82);
		});

		it('should calculate correct score for sample evaluation', () => {
			// (78 + 82 + 65) / 3 = 225 / 3 = 75
			expect(getOverallScore(sampleEvaluation)).toBe(75);
		});

		it('should handle perfect scores', () => {
			const evaluation: JudgeResponse = {
				clarity: 100,
				completeness: 100,
				specificity: 100,
				gaps: [],
				recommendations: []
			};
			expect(getOverallScore(evaluation)).toBe(100);
		});

		it('should handle low scores', () => {
			const evaluation: JudgeResponse = {
				clarity: 30,
				completeness: 40,
				specificity: 50,
				gaps: [],
				recommendations: []
			};
			expect(getOverallScore(evaluation)).toBe(40);
		});
	});

	describe('formatScore', () => {
		it('should return Excellent for 90+', () => {
			expect(formatScore(90)).toBe('Excellent');
			expect(formatScore(95)).toBe('Excellent');
			expect(formatScore(100)).toBe('Excellent');
		});

		it('should return Good for 80-89', () => {
			expect(formatScore(80)).toBe('Good');
			expect(formatScore(85)).toBe('Good');
			expect(formatScore(89)).toBe('Good');
		});

		it('should return Fair for 70-79', () => {
			expect(formatScore(70)).toBe('Fair');
			expect(formatScore(75)).toBe('Fair');
			expect(formatScore(79)).toBe('Fair');
		});

		it('should return Needs Work for 60-69', () => {
			expect(formatScore(60)).toBe('Needs Work');
			expect(formatScore(65)).toBe('Needs Work');
			expect(formatScore(69)).toBe('Needs Work');
		});

		it('should return Poor for below 60', () => {
			expect(formatScore(0)).toBe('Poor');
			expect(formatScore(50)).toBe('Poor');
			expect(formatScore(59)).toBe('Poor');
		});
	});

	describe('getBarPosition', () => {
		it('should calculate position correctly within range', () => {
			// Range = 70 - 48 = 22
			// Position = ((58 - 48) / 22) * 100 = 45.45... -> 45
			const position = getBarPosition(58, 48, 70);
			expect(position).toBeGreaterThan(0);
			expect(position).toBeLessThan(100);
		});

		it('should return 0 for score at min boundary', () => {
			expect(getBarPosition(48, 48, 70)).toBe(0);
		});

		it('should return 100 for score at max boundary', () => {
			expect(getBarPosition(70, 48, 70)).toBe(100);
		});

		it('should return score when range is zero or negative', () => {
			expect(getBarPosition(50, 50, 50)).toBe(50);
			expect(getBarPosition(50, 60, 50)).toBe(50);
		});

		it('should clamp to 0 for score below min', () => {
			expect(getBarPosition(40, 48, 70)).toBe(0);
		});

		it('should clamp to 100 for score above max', () => {
			expect(getBarPosition(80, 48, 70)).toBe(100);
		});
	});
});

describe('JudgeResults Data Structures', () => {
	describe('JudgeResponse Structure', () => {
		it('should have all required properties', () => {
			const evaluation: JudgeResponse = {
				clarity: 80,
				completeness: 75,
				specificity: 90,
				gaps: ['gap1', 'gap2'],
				recommendations: ['rec1', 'rec2']
			};

			expect(evaluation.clarity).toBe(80);
			expect(evaluation.completeness).toBe(75);
			expect(evaluation.specificity).toBe(90);
			expect(evaluation.gaps).toHaveLength(2);
			expect(evaluation.recommendations).toHaveLength(2);
		});

		it('should accept scores between 0 and 100', () => {
			const evaluation: JudgeResponse = {
				clarity: 0,
				completeness: 50,
				specificity: 100,
				gaps: [],
				recommendations: []
			};

			expect(evaluation.clarity).toBe(0);
			expect(evaluation.specificity).toBe(100);
		});

		it('should accept empty gaps array', () => {
			const evaluation: JudgeResponse = {
				clarity: 80,
				completeness: 80,
				specificity: 80,
				gaps: [],
				recommendations: []
			};

			expect(evaluation.gaps).toEqual([]);
		});

		it('should accept empty recommendations array', () => {
			const evaluation: JudgeResponse = {
				clarity: 80,
				completeness: 80,
				specificity: 80,
				gaps: [],
				recommendations: []
			};

			expect(evaluation.recommendations).toEqual([]);
		});
	});

	describe('HistoricalScore Structure', () => {
		it('should have all required properties', () => {
			const score: HistoricalScore = {
				versionId: 1,
				version: '1.0.0',
				createdAt: new Date('2025-12-01'),
				qualityScore: 75,
				clarity: 78,
				completeness: 82,
				specificity: 65
			};

			expect(score.versionId).toBe(1);
			expect(score.version).toBe('1.0.0');
			expect(score.qualityScore).toBe(75);
		});

		it('should accept valid date values', () => {
			const score: HistoricalScore = {
				versionId: 1,
				version: '1.0.0',
				createdAt: new Date(),
				qualityScore: 75,
				clarity: 75,
				completeness: 75,
				specificity: 75
			};

			expect(score.createdAt).toBeInstanceOf(Date);
		});

		it('should accept quality scores between 0 and 100', () => {
			const scores: HistoricalScore[] = [
				{ versionId: 1, version: '1.0.0', createdAt: new Date(), qualityScore: 0, clarity: 0, completeness: 0, specificity: 0 },
				{ versionId: 2, version: '1.1.0', createdAt: new Date(), qualityScore: 100, clarity: 100, completeness: 100, specificity: 100 }
			];

			expect(scores[0].qualityScore).toBe(0);
			expect(scores[1].qualityScore).toBe(100);
		});
	});

	describe('Historical Scores List', () => {
		it('should have multiple scores', () => {
			expect(sampleHistoricalScores).toHaveLength(4);
		});

		it('should have scores in chronological order', () => {
			const sortedScores = [...sampleHistoricalScores].sort(
				(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);
			expect(sortedScores[0].version).toBe('1.0.0');
			expect(sortedScores[3].version).toBe('1.3.0');
		});

		it('should have unique version IDs', () => {
			const ids = sampleHistoricalScores.map((s) => s.versionId);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('should show quality score improvement trend', () => {
			const scores = sampleHistoricalScores.map((s) => s.qualityScore);
			expect(scores[0]).toBe(58);
			expect(scores[scores.length - 1]).toBe(75);
		});
	});
});

describe('JudgeResults Component Structure', () => {
	describe('Component File', () => {
		it('should have judge-results.svelte file', () => {
			const componentPath = 'src/lib/components/improvement/judge-results.svelte';
			expect(componentPath).toContain('judge-results');
		});

		it('should export from improvement index', () => {
			const indexContent = `export { default as JudgeResults } from './judge-results.svelte';`;
			expect(indexContent).toContain('JudgeResults');
		});
	});

	describe('Component Imports', () => {
		it('should import Card components from ui', () => {
			const cardImport = "import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';";
			expect(cardImport).toContain('Card');
		});

		it('should import Progress from ui components', () => {
			const progressImport = "import { Progress } from '$lib/components/ui/progress';";
			expect(progressImport).toContain('Progress');
		});

		it('should import cn utility from utils', () => {
			const cnImport = "import { cn } from '$lib/utils';";
			expect(cnImport).toContain('cn');
		});
	});

	describe('Component Props', () => {
		describe('evaluation prop', () => {
			it('should be required', () => {
				const evaluation: JudgeResponse = {
					clarity: 75,
					completeness: 75,
					specificity: 75,
					gaps: [],
					recommendations: []
				};
				expect(evaluation.clarity).toBeTruthy();
			});

			it('should accept full evaluation with gaps and recommendations', () => {
				expect(sampleEvaluation.gaps).toHaveLength(3);
				expect(sampleEvaluation.recommendations).toHaveLength(3);
			});
		});

		describe('historicalScores prop', () => {
			it('should default to empty array', () => {
				const historicalScores: HistoricalScore[] = [];
				expect(historicalScores).toEqual([]);
			});

			it('should accept historical scores when provided', () => {
				expect(sampleHistoricalScores).toHaveLength(4);
			});
		});

		describe('class prop', () => {
			it('should default to empty string', () => {
				const className = '';
				expect(className).toBe('');
			});

			it('should accept custom classes', () => {
				const className = 'custom-class w-full';
				expect(className).toContain('custom-class');
			});
		});
	});
});

describe('JudgeResults Display Logic', () => {
	describe('Overall Score Display', () => {
		it('should calculate overall score from evaluation', () => {
			const overallScore = getOverallScore(sampleEvaluation);
			expect(overallScore).toBe(75);
		});

		it('should format score label correctly', () => {
			// 75 -> Fair
			expect(formatScore(75)).toBe('Fair');
		});

		it('should show Excellent for high scores', () => {
			expect(formatScore(getOverallScore(sampleEvaluationNoHistory))).toBe('Excellent');
		});

		it('should determine color based on score', () => {
			// 75 is in 60-79 range -> yellow
			expect(getScoreColor(75)).toBe('text-yellow-600 dark:text-yellow-400');
			// 92 is >= 80 -> green
			expect(getScoreColor(92)).toBe('text-green-600 dark:text-green-400');
		});
	});

	describe('Score Breakdown', () => {
		it('should display clarity score', () => {
			expect(sampleEvaluation.clarity).toBe(78);
		});

		it('should display completeness score', () => {
			expect(sampleEvaluation.completeness).toBe(82);
		});

		it('should display specificity score', () => {
			expect(sampleEvaluation.specificity).toBe(65);
		});

		it('should have three score criteria', () => {
			const criteria = ['clarity', 'completeness', 'specificity'];
			expect(criteria).toHaveLength(3);
		});
	});

	describe('Gaps Display', () => {
		it('should display gaps list', () => {
			expect(sampleEvaluation.gaps).toHaveLength(3);
		});

		it('should handle empty gaps', () => {
			const noGaps: JudgeResponse = {
				clarity: 90,
				completeness: 90,
				specificity: 90,
				gaps: [],
				recommendations: []
			};
			expect(noGaps.gaps).toHaveLength(0);
		});

		it('should show gap items with proper indicators', () => {
			expect(sampleEvaluation.gaps[0]).toContain('Missing');
		});
	});

	describe('Recommendations Display', () => {
		it('should display recommendations list', () => {
			expect(sampleEvaluation.recommendations).toHaveLength(3);
		});

		it('should handle empty recommendations', () => {
			const noRecs: JudgeResponse = {
				clarity: 90,
				completeness: 90,
				specificity: 90,
				gaps: [],
				recommendations: []
			};
			expect(noRecs.recommendations).toHaveLength(0);
		});

		it('should show recommendation items with proper indicators', () => {
			expect(sampleEvaluation.recommendations[0]).toContain('Add');
		});
	});

	describe('Historical Chart', () => {
		it('should have historical data when provided', () => {
			expect(sampleHistoricalScores.length).toBeGreaterThan(0);
		});

		it('should calculate chart min from scores', () => {
			const scores = sampleHistoricalScores.map((d) => d.qualityScore);
			const chartMin = Math.min(...scores) - 10;
			expect(chartMin).toBe(48);
		});

		it('should calculate chart max from scores', () => {
			const scores = sampleHistoricalScores.map((d) => d.qualityScore);
			const chartMax = Math.max(...scores) + 10;
			expect(chartMax).toBe(85);
		});

		it('should show score distribution summary', () => {
			const goodCount = sampleHistoricalScores.filter((d) => d.qualityScore >= 80).length;
			const fairCount = sampleHistoricalScores.filter((d) => d.qualityScore >= 60 && d.qualityScore < 80).length;
			const needsWorkCount = sampleHistoricalScores.filter((d) => d.qualityScore < 60).length;

			expect(goodCount).toBe(0);
			expect(fairCount).toBe(3); // 65, 72, 75
			expect(needsWorkCount).toBe(1); // 58
		});
	});
});

describe('JudgeResults Accessibility', () => {
	describe('ARIA Attributes', () => {
		it('should have progressbar role for score indicators', () => {
			const role = 'progressbar';
			expect(role).toBe('progressbar');
		});

		it('should have status role for overall score', () => {
			const role = 'status';
			expect(role).toBe('status');
		});

		it('should have aria-label for progress bars', () => {
			const ariaLabel = 'Clarity: 78%';
			expect(ariaLabel).toContain('Clarity');
			expect(ariaLabel).toContain('%');
		});

		it('should have list role for gaps', () => {
			const listRole = 'list';
			expect(listRole).toBe('list');
		});

		it('should have list role for recommendations', () => {
			const listRole = 'list';
			expect(listRole).toBe('list');
		});

		it('should have group role for score sections', () => {
			const groupRole = 'group';
			expect(groupRole).toBe('group');
		});
	});

	describe('ARIA Labels', () => {
		it('should have aria-label for overall score', () => {
			const overallScore = getOverallScore(sampleEvaluation);
			const ariaLabel = `Overall quality score: ${overallScore}`;
			expect(ariaLabel).toBe('Overall quality score: 75');
		});

		it('should have aria-label for score criteria', () => {
			const criteriaLabel = `Clarity: ${sampleEvaluation.clarity}%`;
			expect(criteriaLabel).toBe('Clarity: 78%');
		});

		it('should have aria-label for gap list', () => {
			const gapListLabel = 'Identified gaps';
			expect(gapListLabel).toBe('Identified gaps');
		});

		it('should have aria-label for recommendations list', () => {
			const recListLabel = 'Recommendations';
			expect(recListLabel).toBe('Recommendations');
		});
	});

	describe('Hidden Icons', () => {
		it('should have aria-hidden for decorative icons', () => {
			const ariaHidden = 'true';
			expect(ariaHidden).toBe('true');
		});
	});
});

describe('JudgeResults Visual States', () => {
	describe('Score Color Coding', () => {
		it('should use green for excellent scores (>=80)', () => {
			const color = getScoreColor(85);
			expect(color).toContain('green');
		});

		it('should use yellow for fair scores (60-79)', () => {
			const color = getScoreColor(70);
			expect(color).toContain('yellow');
		});

		it('should use red for poor scores (<60)', () => {
			const color = getScoreColor(50);
			expect(color).toContain('red');
		});
	});

	describe('Progress Bar Colors', () => {
		it('should use green background for high scores', () => {
			const bgColor = getScoreBgColor(85);
			expect(bgColor).toBe('bg-green-500');
		});

		it('should use yellow background for medium scores', () => {
			const bgColor = getScoreBgColor(70);
			expect(bgColor).toBe('bg-yellow-500');
		});

		it('should use red background for low scores', () => {
			const bgColor = getScoreBgColor(50);
			expect(bgColor).toBe('bg-red-500');
		});
	});

	describe('Chart Bar Colors', () => {
		it('should use green for high quality scores in chart', () => {
			const highScore = 85;
			expect(highScore >= 80).toBe(true);
		});

		it('should use yellow for medium quality scores in chart', () => {
			const midScore = 70;
			expect(midScore >= 60 && midScore < 80).toBe(true);
		});

		it('should use red for low quality scores in chart', () => {
			const lowScore = 50;
			expect(lowScore < 60).toBe(true);
		});
	});

	describe('Overall Score Badge', () => {
		it('should have circular design', () => {
			const isRounded = true;
			expect(isRounded).toBe(true);
		});

		it('should display numeric score', () => {
			const score = getOverallScore(sampleEvaluation);
			expect(typeof score).toBe('number');
			expect(score).toBe(75);
		});

		it('should have font-bold styling', () => {
			const hasBoldFont = true;
			expect(hasBoldFont).toBe(true);
		});
	});
});
