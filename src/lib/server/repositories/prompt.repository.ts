import { eq, desc, asc, like, isNull, and, count, inArray, or } from 'drizzle-orm';
import { db } from '../db/client';
import { prompts } from '../db/schema';
import type { Prompt, NewPrompt } from '../db/schema';

export const promptRepo = {
	async findById(id: number): Promise<Prompt | null> {
		const result = await db
			.select()
			.from(prompts)
			.where(and(eq(prompts.id, id), isNull(prompts.deletedAt)))
			.limit(1);
		return result[0] ?? null;
	},

	async findAll(
		opts: {
			limit?: number;
			offset?: number;
			search?: string;
			sortField?: 'createdAt' | 'updatedAt' | 'title';
			sortDirection?: 'asc' | 'desc';
		} = {}
	): Promise<{ prompts: Prompt[]; totalCount: number }> {
		const { limit = 20, offset = 0, search, sortField = 'createdAt', sortDirection = 'desc' } = opts;

		let whereClause = isNull(prompts.deletedAt);
		if (search) {
			const pattern = `%${search}%`;
			whereClause =
				and(
					whereClause,
					or(like(prompts.title, pattern), like(prompts.description, pattern))
				) ?? whereClause;
		}

		const orderBy =
			sortDirection === 'asc'
				? asc(prompts[sortField])
				: desc(prompts[sortField]);

		const [promptsList, totalResult] = await Promise.all([
			db
				.select()
				.from(prompts)
				.where(whereClause)
				.orderBy(orderBy)
				.limit(limit)
				.offset(offset),
			db.select({ count: count() }).from(prompts).where(whereClause)
		]);

		return { prompts: promptsList, totalCount: totalResult[0].count };
	},

	async insert(data: NewPrompt): Promise<Prompt> {
		const result = await db.insert(prompts).values(data).returning();
		return result[0];
	},

	async update(id: number, data: Partial<NewPrompt>): Promise<Prompt> {
		const result = await db
			.update(prompts)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(prompts.id, id))
			.returning();
		return result[0];
	},

	async softDelete(id: number): Promise<void> {
		await db
			.update(prompts)
			.set({ deletedAt: new Date() })
			.where(eq(prompts.id, id));
	},

	async bulkSoftDelete(ids: number[]): Promise<number> {
		if (ids.length === 0) return 0;
		return db.transaction(async (tx) => {
			const result = await tx
				.update(prompts)
				.set({ deletedAt: new Date() })
				.where(inArray(prompts.id, ids))
				.returning();
			return result.length;
		});
	}
};
