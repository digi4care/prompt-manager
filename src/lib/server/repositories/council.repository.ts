import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db/client';
import { councilAgents, type CouncilAgent, type NewCouncilAgent, type ParentType } from '../db/schema';

export const councilRepo = {
	async findByParent(parentType: ParentType, parentId: number): Promise<CouncilAgent[]> {
		return db
			.select()
			.from(councilAgents)
			.where(and(eq(councilAgents.parentType, parentType), eq(councilAgents.parentId, parentId)))
			.orderBy(asc(councilAgents.agentOrder));
	},

	async findById(id: number): Promise<CouncilAgent | null> {
		const rows = await db
			.select()
			.from(councilAgents)
			.where(eq(councilAgents.id, id))
			.limit(1);
		return rows[0] ?? null;
	},

	async insert(data: NewCouncilAgent): Promise<CouncilAgent> {
		const rows = await db.insert(councilAgents).values(data).returning();
		return rows[0];
	},

	async update(id: number, data: Partial<NewCouncilAgent>): Promise<CouncilAgent> {
		const rows = await db
			.update(councilAgents)
			.set(data)
			.where(eq(councilAgents.id, id))
			.returning();
		return rows[0];
	},

	async deleteByParent(parentType: ParentType, parentId: number): Promise<void> {
		await db
			.delete(councilAgents)
			.where(and(eq(councilAgents.parentType, parentType), eq(councilAgents.parentId, parentId)));
	},

	async deleteById(id: number): Promise<void> {
		await db.delete(councilAgents).where(eq(councilAgents.id, id));
	}
};
