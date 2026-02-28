import { db } from '../db/client';
import { snippets, type NewSnippet, type Snippet } from '../db/schema';
import { eq, desc, asc, like, isNull, and, or, count } from 'drizzle-orm';

export async function createSnippet(data: NewSnippet): Promise<Snippet> {
	const [snippet] = await db.insert(snippets).values(data).returning();
	return snippet;
}

export async function getSnippet(id: number): Promise<Snippet | null> {
	const [snippet] = await db
		.select()
		.from(snippets)
		.where(and(eq(snippets.id, id), isNull(snippets.deletedAt)))
		.limit(1);
	return snippet || null;
}

export interface ListSnippetsResult {
	snippets: Snippet[];
	totalCount: number;
}

export type SortField = 'createdAt' | 'updatedAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export async function listSnippets(
	limit = 100,
	offset = 0,
	search?: string,
	category?: string,
	sortField: SortField = 'updatedAt',
	sortDirection: SortDirection = 'desc'
): Promise<ListSnippetsResult> {
	// Build where conditions
	const conditions = [isNull(snippets.deletedAt)];

	// Search condition - search in title, description, AND content
	if (search) {
		conditions.push(
			or(
				like(snippets.title, `%${search}%`),
				like(snippets.description, `%${search}%`),
				like(snippets.content, `%${search}%`)
			)!
		);
	}

	// Category filter
	if (category) {
		conditions.push(eq(snippets.category, category));
	}

	// Execute query with conditions
	const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

	// Build orderBy clause
	const orderByColumn =
		sortField === 'title'
			? snippets.title
			: sortField === 'createdAt'
				? snippets.createdAt
				: snippets.updatedAt;
	const orderByClause = sortDirection === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

	// Fetch snippets
	const snippetsList = await db
		.select()
		.from(snippets)
		.where(whereCondition)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	// Get total count
	const [{ total }] = await db.select({ total: count() }).from(snippets).where(whereCondition);

	return {
		snippets: snippetsList,
		totalCount: total
	};
}

export async function updateSnippet(id: number, data: Partial<NewSnippet>): Promise<Snippet> {
	const [updated] = await db
		.update(snippets)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(snippets.id, id))
		.returning();
	return updated;
}

export async function deleteSnippet(id: number): Promise<void> {
	// Soft delete
	await db.update(snippets).set({ deletedAt: new Date() }).where(eq(snippets.id, id));
}

export async function getAllCategories(): Promise<string[]> {
	const allSnippets = await db
		.select({ category: snippets.category })
		.from(snippets)
		.where(isNull(snippets.deletedAt));

	const categories = new Set<string>();
	for (const snippet of allSnippets) {
		if (snippet.category) {
			categories.add(snippet.category);
		}
	}

	return Array.from(categories).sort();
}
