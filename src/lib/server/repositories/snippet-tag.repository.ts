import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { snippetTagAssignments, snippetTags, type SnippetTag } from '../db/schema';

export const snippetTagRepo = {
	async findBySnippetId(snippetId: number): Promise<SnippetTag[]> {
		return db
			.select({ tag: snippetTags })
			.from(snippetTagAssignments)
			.innerJoin(snippetTags, eq(snippetTagAssignments.tagId, snippetTags.id))
			.where(eq(snippetTagAssignments.snippetId, snippetId))
			.then((rows) => rows.map((r) => r.tag));
	},

	async assignTags(snippetId: number, tagIds: number[]): Promise<void> {
		return db.transaction(async (tx) => {
			await tx
				.delete(snippetTagAssignments)
				.where(eq(snippetTagAssignments.snippetId, snippetId));

			if (tagIds.length > 0) {
				await tx.insert(snippetTagAssignments).values(
					tagIds.map((tagId) => ({
						snippetId,
						tagId
					}))
				);
			}
		});
	},

	async removeTags(snippetId: number): Promise<void> {
		await db
			.delete(snippetTagAssignments)
			.where(eq(snippetTagAssignments.snippetId, snippetId));
	}
};
