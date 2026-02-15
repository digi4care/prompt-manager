import {
	getAnalyticsMetrics,
	getQualityScores,
	getUsageData,
	getTopPrompts,
	getRecentImprovements
} from '$lib/server/services/analytics.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const [metrics, qualityScores, usageData, topPrompts, recentImprovements] = await Promise.all([
			getAnalyticsMetrics(),
			getQualityScores(),
			getUsageData(),
			getTopPrompts(),
			getRecentImprovements()
		]);

		return {
			metrics,
			qualityScores,
			usageData,
			topPrompts,
			recentImprovements
		};
	} catch (error) {
		console.error('Failed to load analytics:', error);
		return {
			metrics: {
				totalPrompts: 0,
				totalVersions: 0,
				avgQualityScore: 0,
				improvementsThisWeek: 0,
				activePrompts: 0,
				lastActivity: 'Never',
				qualityTrend: 'stable' as const,
				usageTrend: 'stable' as const
			},
			qualityScores: [],
			usageData: [],
			topPrompts: [],
			recentImprovements: []
		};
	}
};
