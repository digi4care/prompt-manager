import { db } from '../db/client';
import { snippetCategories, snippets, type SnippetCategory } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

export class DuplicateNameError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DuplicateNameError';
	}
}

export class CategoryInUseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CategoryInUseError';
	}
}

export class CategoryNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CategoryNotFoundError';
	}
}

export async function getCategories(): Promise<SnippetCategory[]> {
	return db
		.select()
		.from(snippetCategories)
		.orderBy(asc(snippetCategories.sortOrder), asc(snippetCategories.name));
}

export async function getCategoryById(id: number): Promise<SnippetCategory | null> {
	const [row] = await db
		.select()
		.from(snippetCategories)
		.where(eq(snippetCategories.id, id))
		.limit(1);
	return row ?? null;
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

export async function updateCategory(
	id: number,
	data: {
		name?: string;
		description?: string | null;
		sortOrder?: number;
	}
): Promise<SnippetCategory> {
	const existing = await getCategoryById(id);
	if (!existing) {
		throw new CategoryNotFoundError('Category not found');
	}

	// Check for duplicate name if name is being updated
	if (data.name && data.name !== existing.name) {
		const [duplicate] = await db
			.select()
			.from(snippetCategories)
			.where(eq(snippetCategories.name, data.name))
			.limit(1);

		if (duplicate) {
			throw new DuplicateNameError('A category with this name already exists');
		}
	}

	const [updated] = await db
		.update(snippetCategories)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(snippetCategories.id, id))
		.returning();

	return updated;
}

export async function deleteCategory(id: number): Promise<void> {
	const existing = await getCategoryById(id);
	if (!existing) {
		throw new CategoryNotFoundError('Category not found');
	}

	// Check if any snippets use this category
	const [snippetUsingCategory] = await db
		.select({ id: snippets.id })
		.from(snippets)
		.where(eq(snippets.categoryId, id))
		.limit(1);

	if (snippetUsingCategory) {
		throw new CategoryInUseError('Cannot delete category: snippets are using it');
	}

	await db.delete(snippetCategories).where(eq(snippetCategories.id, id));
}
