import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { promptVersions, prompts } from '../db/schema';
import type { PromptVersion, NewPromptVersion } from '../db/schema';

export const versionRepo = {
	async findById(id: number): Promise<PromptVersion | null> {
		const rows = await db
			.select()
			.from(promptVersions)
			.where(eq(promptVersions.id, id))
			.limit(1);
		return rows[0] ?? null;
	},

	async findLatestByPromptId(promptId: number): Promise<PromptVersion | null> {
		const rows = await db
			.select()
			.from(promptVersions)
			.where(eq(promptVersions.promptId, promptId))
			.orderBy(desc(promptVersions.createdAt))
			.limit(1);
		return rows[0] ?? null;
	},

	async findByPromptId(promptId: number): Promise<PromptVersion[]> {
		return db
			.select()
			.from(promptVersions)
			.where(eq(promptVersions.promptId, promptId))
			.orderBy(desc(promptVersions.createdAt));
	},

	async insert(data: NewPromptVersion): Promise<PromptVersion> {
		const rows = await db.insert(promptVersions).values(data).returning();
		return rows[0];
	},

	async insertWithLatestRef(
		promptId: number,
		versionData: NewPromptVersion
	): Promise<PromptVersion> {
		return db.transaction(async (tx) => {
			const inserted = await tx
				.insert(promptVersions)
				.values(versionData)
				.returning();
			const version = inserted[0];

			await tx
				.update(prompts)
				.set({ latestVersionId: version.id, updatedAt: new Date() })
				.where(eq(prompts.id, promptId));

			return version;
		});
	}
};
