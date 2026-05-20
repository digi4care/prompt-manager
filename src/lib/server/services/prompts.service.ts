import { db } from '../db/client';
import { prompts, type NewPrompt, type Prompt } from '../db/schema';
import { eq, desc, asc, like, isNull, and, count, inArray } from 'drizzle-orm';
import { type SQL, sql } from 'drizzle-orm';

export async function createPrompt(data: NewPrompt): Promise<Prompt> {
	const [prompt] = await db.insert(prompts).values(data).returning();
	return prompt;
}

export async function getPrompt(id: number): Promise<Prompt | null> {
	const [prompt] = await db
		.select()
		.from(prompts)
		.where(and(eq(prompts.id, id), isNull(prompts.deletedAt)))
		.limit(1);
	return prompt || null;
}

export interface ListPromptsResult {
	prompts: Prompt[];
	totalCount: number;
}

export type SortField = 'createdAt' | 'updatedAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export async function listPrompts(
	limit = 100,
	offset = 0,
	search?: string,
	tags?: string[],
	sortField: SortField = 'updatedAt',
	sortDirection: SortDirection = 'desc'
): Promise<ListPromptsResult> {
	// Build where conditions
	const conditions = [isNull(prompts.deletedAt)];

	// Search condition
	if (search) {
		conditions.push(like(prompts.title, `%${search}%`));
	}

	// Execute query with conditions
	const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

	// Build orderBy clause
	const orderByColumn =
		sortField === 'title'
			? prompts.title
			: sortField === 'createdAt'
				? prompts.createdAt
				: prompts.updatedAt;
	const orderByClause = sortDirection === 'desc' ? desc(orderByColumn) : asc(orderByColumn);

	// Fetch ALL prompts first (before tags filtering) for pagination
	const allPrompts = await db.select().from(prompts).where(whereCondition).orderBy(orderByClause);

	// Filter by tags in JavaScript (SQLite JSON limitation)
	let filteredPrompts = allPrompts;
	if (tags && tags.length > 0) {
		filteredPrompts = allPrompts.filter((p) => {
			// Handle both comma-separated strings and JSON arrays
			let promptTags: string[] = [];
			if (typeof p.tags === 'string') {
				try {
					promptTags = JSON.parse(p.tags);
				} catch {
					promptTags = p.tags.split(',').map((t) => t.trim());
				}
			} else if (Array.isArray(p.tags)) {
				promptTags = p.tags;
			}
			return tags.some((tag) => promptTags.includes(tag));
		});
	}

	// Apply pagination AFTER tags filtering
	const totalCount = filteredPrompts.length;
	const promptsData = filteredPrompts.slice(offset, offset + limit);

	return {
		prompts: promptsData,
		totalCount
	};
}

export async function updatePrompt(id: number, data: Partial<NewPrompt>): Promise<Prompt> {
	const [updated] = await db
		.update(prompts)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(prompts.id, id))
		.returning();
	return updated;
}

export async function deletePrompt(id: number): Promise<void> {
	// Soft delete
	await db.update(prompts).set({ deletedAt: new Date() }).where(eq(prompts.id, id));
}

export async function bulkDeletePrompts(ids: number[]): Promise<number> {
	if (!ids || ids.length === 0) return 0;

	const result = await db.transaction(async (tx) => {
		const updated = await tx
			.update(prompts)
			.set({ deletedAt: new Date() })
			.where(inArray(prompts.id, ids))
			.returning();
		return updated.length;
	});

	return result;
}

export async function getAllTags(): Promise<string[]> {
	const allPrompts = await db.select().from(prompts).where(isNull(prompts.deletedAt));

	const tags = new Set<string>();
	for (const prompt of allPrompts) {
		let promptTags: string[];
		if (typeof prompt.tags === 'string') {
			const tagStr = prompt.tags.trim();
			if (tagStr.startsWith('[')) {
				promptTags = JSON.parse(tagStr);
			} else if (tagStr.includes(',')) {
				promptTags = tagStr
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean);
			} else {
				promptTags = tagStr ? [tagStr] : [];
			}
		} else {
			promptTags = prompt.tags || [];
		}
		for (const tag of promptTags) {
			tags.add(tag);
		}
	}

	return Array.from(tags).sort();
}
