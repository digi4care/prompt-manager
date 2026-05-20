import { eq, desc, asc, like, isNull, and, or, count } from 'drizzle-orm';
import { db } from '../db/client';
import {
	snippets,
	snippetCategories,
	snippetTags,
	snippetTagAssignments,
	type Snippet,
	type NewSnippet,
	type SnippetCategory,
	type SnippetTag
} from '../db/schema';

export type SortField = 'createdAt' | 'updatedAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export const snippetRepo = {
	async findById(id: number): Promise<Snippet | null> {
		const [result] = await db
			.select()
			.from(snippets)
			.where(and(eq(snippets.id, id), isNull(snippets.deletedAt)))
			.limit(1);
		return result ?? null;
	},

	async findAll(
		opts?: {
			limit?: number;
			offset?: number;
			search?: string;
			sortField?: SortField;
			sortDirection?: SortDirection;
		}
	): Promise<{ snippets: Snippet[]; totalCount: number }> {
		const limit = opts?.limit ?? 100;
		const offset = opts?.offset ?? 0;
		const search = opts?.search;
		const sortField = opts?.sortField ?? 'updatedAt';
		const sortDirection = opts?.sortDirection ?? 'desc';

		const conditions = [isNull(snippets.deletedAt)];

		if (search) {
			conditions.push(
				or(
					like(snippets.title, `%${search}%`),
					like(snippets.description, `%${search}%`),
					like(snippets.content, `%${search}%`)
				)!
			);
		}

		const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

		const orderByColumn =
			sortField === 'title'
				? snippets.title
				: sortField === 'createdAt'
					? snippets.createdAt
					: snippets.updatedAt;
		const orderByClause = sortDirection === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

		const snippetsList = await db
			.select()
			.from(snippets)
			.where(whereCondition)
			.orderBy(orderByClause)
			.limit(limit)
			.offset(offset);

		const [{ total }] = await db
			.select({ total: count() })
			.from(snippets)
			.where(whereCondition);

		return { snippets: snippetsList, totalCount: total };
	},

	async insert(data: NewSnippet & { tagIds?: number[] }): Promise<Snippet> {
		const { tagIds, ...snippetData } = data;

		return db.transaction(async (tx) => {
			const [snippet] = await tx.insert(snippets).values(snippetData).returning();

			if (tagIds && tagIds.length > 0) {
				await tx.insert(snippetTagAssignments).values(
					tagIds.map((tagId) => ({
						snippetId: snippet.id,
						tagId
					}))
				);
			}

			return snippet;
		});
	},

	async update(
		id: number,
		data: Partial<NewSnippet> & { tagIds?: number[] }
	): Promise<Snippet> {
		const { tagIds, ...snippetData } = data;

		return db.transaction(async (tx) => {
			const [updated] = await tx
				.update(snippets)
				.set({ ...snippetData, updatedAt: new Date() })
				.where(eq(snippets.id, id))
				.returning();

			if (tagIds !== undefined) {
				await tx
					.delete(snippetTagAssignments)
					.where(eq(snippetTagAssignments.snippetId, id));

				if (tagIds.length > 0) {
					await tx.insert(snippetTagAssignments).values(
						tagIds.map((tagId) => ({
							snippetId: id,
							tagId
						}))
					);
				}
			}

			return updated;
		});
	},

	async softDelete(id: number): Promise<void> {
		await db.update(snippets).set({ deletedAt: new Date() }).where(eq(snippets.id, id));
	},

	async getAllCategories(): Promise<SnippetCategory[]> {
		return db.select().from(snippetCategories).orderBy(asc(snippetCategories.sortOrder));
	},

	async getAllTags(): Promise<SnippetTag[]> {
		return db.select().from(snippetTags).orderBy(asc(snippetTags.name));
	}
};
