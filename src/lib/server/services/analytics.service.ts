import { db } from '../db/client';
import { prompts, promptVersions, performanceMetrics, judgeEvaluations } from '../db/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

export interface AnalyticsMetrics {
	totalPrompts: number;
	totalVersions: number;
	avgQualityScore: number;
	improvementsThisWeek: number;
	activePrompts: number;
	lastActivity: string;
	qualityTrend: 'up' | 'down' | 'stable';
	usageTrend: 'up' | 'down' | 'stable';
}

export interface QualityScoreData {
	date: string;
	clarity: number;
	completeness: number;
	specificity: number;
	overall: number;
}

export interface UsageData {
	date: string;
	count: number;
}

export interface TopPrompt {
	id: number;
	title: string;
	versionCount: number;
	lastUpdated: string;
}

export interface RecentImprovement {
	promptId: number;
	versionId: number;
	promptTitle: string;
	score: number;
	date: string;
}

export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
	try {
		// Get all prompts with version counts
		const allPrompts = await db
			.select({
				id: prompts.id,
				title: prompts.title,
				createdAt: prompts.createdAt,
				version_count: sql<number>`count(${promptVersions.id})`
			})
			.from(prompts)
			.leftJoin(promptVersions, eq(prompts.id, promptVersions.promptId))
			.groupBy(prompts.id);

		// Get recent improvements (metrics from last 7 days)
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const recentImprovements = await db
			.select({
				created_at: performanceMetrics.createdAt
			})
			.from(performanceMetrics)
			.where(gte(performanceMetrics.createdAt, sevenDaysAgo));

		// Get all performance metrics for quality score trends
		const allMetrics = await db
			.select({
				clarity: performanceMetrics.clarity,
				completeness: performanceMetrics.completeness,
				specificity: performanceMetrics.specificity
			})
			.from(performanceMetrics);

		// Calculate metrics
		const totalPrompts = allPrompts.length;
		const totalVersions = allPrompts.reduce((sum, p) => sum + (p.version_count ?? 0), 0);
		const activePrompts = allPrompts.filter(
			(p) => new Date(p.createdAt ?? 0).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
		).length;

		// Calculate average quality score from all metrics
		let avgQualityScore = 0;
		if (allMetrics.length > 0) {
			const validMetrics = allMetrics.filter(
				(m) => m.clarity != null && m.completeness != null && m.specificity != null
			);
			if (validMetrics.length > 0) {
				const totalScore = validMetrics.reduce((sum, e) => {
					const avg = ((e.clarity ?? 0) + (e.completeness ?? 0) + (e.specificity ?? 0)) / 3;
					return sum + avg;
				}, 0);
				avgQualityScore = Math.round(totalScore / validMetrics.length);
			}
		}

		// Get last activity
		const lastPrompt = allPrompts.sort(
			(a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
		)[0];
		const lastActivity = lastPrompt?.createdAt
			? new Date(lastPrompt.createdAt).toISOString()
			: 'Never';

		return {
			totalPrompts,
			totalVersions,
			avgQualityScore,
			improvementsThisWeek: recentImprovements.length,
			activePrompts,
			lastActivity,
			qualityTrend: 'stable' as const,
			usageTrend: 'stable' as const
		};
	} catch (error) {
		console.error('Failed to get analytics metrics:', error);
		return {
			totalPrompts: 0,
			totalVersions: 0,
			avgQualityScore: 0,
			improvementsThisWeek: 0,
			activePrompts: 0,
			lastActivity: 'Never',
			qualityTrend: 'stable' as const,
			usageTrend: 'stable' as const
		};
	}
}

export async function getQualityScores(): Promise<QualityScoreData[]> {
	try {
		const allMetrics = await db
			.select({
				clarity: performanceMetrics.clarity,
				completeness: performanceMetrics.completeness,
				specificity: performanceMetrics.specificity,
				createdAt: performanceMetrics.createdAt
			})
			.from(performanceMetrics)
			.orderBy(desc(performanceMetrics.createdAt));

		return allMetrics.map((e) => {
			const dateVal = new Date(e.createdAt ?? Date.now());
			return {
				date: dateVal.toISOString(),
				clarity: e.clarity ?? 0,
				completeness: e.completeness ?? 0,
				specificity: e.specificity ?? 0,
				overall: Math.round(((e.clarity ?? 0) + (e.completeness ?? 0) + (e.specificity ?? 0)) / 3)
			};
		});
	} catch (error) {
		console.error('Failed to get quality scores:', error);
		return [];
	}
}

export async function getUsageData(): Promise<UsageData[]> {
	try {
		const allPrompts = await db
			.select({
				createdAt: prompts.createdAt,
				version_count: sql<number>`count(${promptVersions.id})`
			})
			.from(prompts)
			.leftJoin(promptVersions, eq(prompts.id, promptVersions.promptId))
			.groupBy(prompts.id)
			.limit(10);

		return allPrompts.map((p) => {
			const dateVal = new Date(p.createdAt ?? Date.now());
			return {
				date: dateVal.toISOString(),
				count: p.version_count ?? 0
			};
		});
	} catch (error) {
		console.error('Failed to get usage data:', error);
		return [];
	}
}

export async function getTopPrompts(): Promise<TopPrompt[]> {
	try {
		const allPrompts = await db
			.select({
				id: prompts.id,
				title: prompts.title,
				createdAt: prompts.createdAt,
				version_count: sql<number>`count(${promptVersions.id})`
			})
			.from(prompts)
			.leftJoin(promptVersions, eq(prompts.id, promptVersions.promptId))
			.groupBy(prompts.id);

		return [...allPrompts]
			.sort((a, b) => (b.version_count ?? 0) - (a.version_count ?? 0))
			.slice(0, 5)
			.map((p) => ({
				id: p.id,
				title: p.title ?? 'Unknown',
				versionCount: p.version_count ?? 0,
				lastUpdated: new Date(p.createdAt ?? Date.now()).toISOString()
			}));
	} catch (error) {
		console.error('Failed to get top prompts:', error);
		return [];
	}
}

export async function getRecentImprovements(): Promise<RecentImprovement[]> {
	try {
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		// Get recent performance metrics with version and prompt info
		const recentMetrics = await db
			.select({
				versionId: performanceMetrics.versionId,
				clarity: performanceMetrics.clarity,
				completeness: performanceMetrics.completeness,
				specificity: performanceMetrics.specificity,
				createdAt: performanceMetrics.createdAt,
				version: promptVersions.version,
				promptId: promptVersions.promptId,
				promptTitle: prompts.title
			})
			.from(performanceMetrics)
			.innerJoin(promptVersions, eq(performanceMetrics.versionId, promptVersions.id))
			.innerJoin(prompts, eq(promptVersions.promptId, prompts.id))
			.where(gte(performanceMetrics.createdAt, sevenDaysAgo))
			.orderBy(desc(performanceMetrics.createdAt))
			.limit(5);

		return recentMetrics.map((m) => {
			const avgScore = Math.round(
				((m.clarity ?? 0) + (m.completeness ?? 0) + (m.specificity ?? 0)) / 3
			);

			return {
				promptId: m.promptId ?? 0,
				versionId: m.versionId ?? 0,
				promptTitle: m.promptTitle ?? 'Unknown',
				score: avgScore,
				date: new Date(m.createdAt ?? Date.now()).toISOString()
			};
		});
	} catch (error) {
		console.error('Failed to get recent improvements:', error);
		return [];
	}
}
