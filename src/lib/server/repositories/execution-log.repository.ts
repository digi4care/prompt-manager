import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { executionLogs, type ExecutionLog, type NewExecutionLog } from '../db/schema';

export const executionLogRepo = {
	async insert(data: NewExecutionLog): Promise<ExecutionLog> {
		const [result] = await db.insert(executionLogs).values(data).returning();
		return result;
	},

	async findByPromptId(promptId: number, opts?: { limit?: number }): Promise<ExecutionLog[]> {
		return db
			.select()
			.from(executionLogs)
			.where(eq(executionLogs.promptId, promptId))
			.orderBy(desc(executionLogs.createdAt))
			.limit(opts?.limit ?? 100);
	},

	async findById(id: number): Promise<ExecutionLog | null> {
		const [result] = await db
			.select()
			.from(executionLogs)
			.where(eq(executionLogs.id, id))
			.limit(1);
		return result ?? null;
	}
};
