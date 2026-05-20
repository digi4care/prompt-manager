import { snippetRepo, snippetTagRepo } from '../repositories';
import { db } from '../db/client';
import {
	snippets,
	snippetCategories,
	snippetTags,
	snippetTagAssignments,
	type NewSnippet,
	type Snippet,
	type SnippetCategory,
	type SnippetTag
} from '../db/schema';
import { eq, desc, asc, like, isNull, and, or, count, inArray } from 'drizzle-orm';

export interface SnippetWithTags extends Snippet {
	categoryName?: string | null;
	tagsList: string[];
}

export async function createSnippet(data: NewSnippet & { tagIds?: number[] }): Promise<Snippet> {
	return snippetRepo.insert(data);
}

export async function getSnippet(id: number): Promise<SnippetWithTags | null> {
	const [snippet] = await db
		.select()
		.from(snippets)
		.where(and(eq(snippets.id, id), isNull(snippets.deletedAt)))
		.limit(1);

	if (!snippet) return null;

	// Get category name
	let categoryName: string | null = null;
	if (snippet.categoryId) {
		const [category] = await db
			.select({ name: snippetCategories.name })
			.from(snippetCategories)
			.where(eq(snippetCategories.id, snippet.categoryId))
			.limit(1);
		categoryName = category?.name || null;
	}

	// Get tags
	const tagAssignments = await db
		.select({ tag: snippetTags })
		.from(snippetTagAssignments)
		.innerJoin(snippetTags, eq(snippetTagAssignments.tagId, snippetTags.id))
		.where(eq(snippetTagAssignments.snippetId, id));

	return {
		...snippet,
		categoryName,
		tagsList: tagAssignments.map((t) => t.tag.name)
	};
}

export interface ListSnippetsResult {
	snippets: SnippetWithTags[];
	totalCount: number;
}

export type SortField = 'createdAt' | 'updatedAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export async function listSnippets(
	limit = 100,
	offset = 0,
	search?: string,
	categoryId?: number,
	tagId?: number,
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

	// Category filter (by ID)
	if (categoryId) {
		conditions.push(eq(snippets.categoryId, categoryId));
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

	// Filter by tag if provided
	let snippetIds: number[] | null = null;
	if (tagId) {
		const assignments = await db
			.select({ snippetId: snippetTagAssignments.snippetId })
			.from(snippetTagAssignments)
			.where(eq(snippetTagAssignments.tagId, tagId));
		snippetIds = assignments.map((a) => a.snippetId);

		if (snippetIds.length === 0) {
			return { snippets: [], totalCount: 0 };
		}
	}

	// Fetch snippets
	let snippetsQuery = db
		.select()
		.from(snippets)
		.where(snippetIds ? and(whereCondition, inArray(snippets.id, snippetIds)) : whereCondition)
		.orderBy(orderByClause)
		.limit(limit)
		.offset(offset);

	const snippetsList = await snippetsQuery;

	// Get total count
	const [{ total }] = await db
		.select({ total: count() })
		.from(snippets)
		.where(snippetIds ? and(whereCondition, inArray(snippets.id, snippetIds)) : whereCondition);

	// Enrich with category names and tags
	const categoryIds = [
		...new Set(snippetsList.map((s) => s.categoryId).filter(Boolean))
	] as number[];
	const categoriesMap = new Map<number, string>();

	if (categoryIds.length > 0) {
		const categories = await db
			.select()
			.from(snippetCategories)
			.where(inArray(snippetCategories.id, categoryIds));
		for (const cat of categories) {
			categoriesMap.set(cat.id, cat.name);
		}
	}

	// Get all tags for these snippets
	const enrichedSnippets: SnippetWithTags[] = await Promise.all(
		snippetsList.map(async (snippet) => {
			const tagAssignments = await db
				.select({ tag: snippetTags })
				.from(snippetTagAssignments)
				.innerJoin(snippetTags, eq(snippetTagAssignments.tagId, snippetTags.id))
				.where(eq(snippetTagAssignments.snippetId, snippet.id));

			return {
				...snippet,
				categoryName: snippet.categoryId ? categoriesMap.get(snippet.categoryId) || null : null,
				tagsList: tagAssignments.map((t) => t.tag.name)
			};
		})
	);

	return {
		snippets: enrichedSnippets,
		totalCount: total
	};
}

export async function updateSnippet(
	id: number,
	data: Partial<NewSnippet> & { tagIds?: number[] }
): Promise<Snippet> {
	return snippetRepo.update(id, data);
}

export async function deleteSnippet(id: number): Promise<void> {
	await snippetRepo.softDelete(id);
}

export async function getAllCategories(): Promise<SnippetCategory[]> {
	return snippetRepo.getAllCategories();
}

export async function getAllTags(): Promise<SnippetTag[]> {
	return snippetRepo.getAllTags();
}

// Check if snippet title exists (for uniqueness validation)
export async function snippetTitleExists(title: string, excludeId?: number): Promise<boolean> {
	const conditions = [eq(snippets.title, title), isNull(snippets.deletedAt)];

	if (excludeId) {
		conditions.push(eq(snippets.id, excludeId));
	}

	const [existing] = await db
		.select({ id: snippets.id })
		.from(snippets)
		.where(and(...conditions))
		.limit(1);

	return !!existing;
}
