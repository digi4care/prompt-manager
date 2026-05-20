import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client';
import {
	judgeEvaluations,
	performanceMetrics,
	type JudgeEvaluation,
	type NewJudgeEvaluation,
	type PerformanceMetric,
	type NewPerformanceMetric
} from '../db/schema';

export const judgeRepo = {
	async insertEvaluation(data: NewJudgeEvaluation): Promise<JudgeEvaluation> {
		const rows = await db.insert(judgeEvaluations).values(data).returning();
		return rows[0];
	},

	async insertMetric(data: NewPerformanceMetric): Promise<PerformanceMetric> {
		const rows = await db.insert(performanceMetrics).values(data).returning();
		return rows[0];
	},

	async saveEvaluationWithMetrics(
		evaluation: NewJudgeEvaluation,
		metrics: NewPerformanceMetric
	): Promise<number> {
		return db.transaction(async (tx) => {
			const inserted = await tx.insert(judgeEvaluations).values(evaluation).returning();
			const evalRow = inserted[0];

			await tx.insert(performanceMetrics).values({ ...metrics, versionId: evalRow.versionId });

			return evalRow.id;
		});
	},

	async findByVersionId(versionId: number): Promise<JudgeEvaluation[]> {
		return db
			.select()
			.from(judgeEvaluations)
			.where(eq(judgeEvaluations.versionId, versionId))
			.orderBy(desc(judgeEvaluations.createdAt));
	}
};
