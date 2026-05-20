import { db } from '../db/client';
import { snippetCategories, type SnippetCategory } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

export class DuplicateNameError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DuplicateNameError';
	}
}

export async function getCategories(): Promise<SnippetCategory[]> {
	return db
		.select()
		.from(snippetCategories)
		.orderBy(asc(snippetCategories.sortOrder), asc(snippetCategories.name));
}

export async function createCategory(data: {
	name: string;
	description?: string;
	sortOrder?: number;
}): Promise<SnippetCategory> {
	const [existing] = await db
		.select()
		.from(snippetCategories)
		.where(eq(snippetCategories.name, data.name))
		.limit(1);

	if (existing) {
		throw new DuplicateNameError('A category with this name already exists');
	}

	const [category] = await db
		.insert(snippetCategories)
		.values({
			name: data.name,
			description: data.description || null,
			sortOrder: data.sortOrder ?? 0
		})
		.returning();

	return category;
}
