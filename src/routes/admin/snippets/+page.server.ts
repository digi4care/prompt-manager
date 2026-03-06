import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import {
	snippetCategories,
	snippetTags,
	snippets,
	snippetTagAssignments
} from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { authenticateWithBetterAuth } from '$lib/server/auth.helper';
import { z } from 'zod';

export const load: PageServerLoad = async () => {
	const [categories, tags] = await Promise.all([
		db
			.select()
			.from(snippetCategories)
			.orderBy(asc(snippetCategories.sortOrder), asc(snippetCategories.name)),
		db.select().from(snippetTags).orderBy(asc(snippetTags.name))
	]);

	return {
		categories,
		tags
	};
};

const createCategorySchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	sortOrder: z.coerce.number().int().min(0).optional()
});

const updateCategorySchema = z.object({
	id: z.coerce.number().int().positive(),
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	sortOrder: z.coerce.number().int().min(0).optional()
});

const createTagSchema = z.object({
	name: z.string().min(1).max(100)
});

export const actions: Actions = {
	// Create a new category
	createCategory: async (event) => {
		const user = authenticateWithBetterAuth(event);
		const formData = await event.request.formData();

		const parsed = createCategorySchema.safeParse(Object.fromEntries(formData));
		if (!parsed.success) {
			return fail(400, {
				action: 'createCategory',
				errors: parsed.error.flatten(),
				values: Object.fromEntries(formData)
			});
		}

		try {
			// Check for duplicate name
			const [existing] = await db
				.select()
				.from(snippetCategories)
				.where(eq(snippetCategories.name, parsed.data.name))
				.limit(1);

			if (existing) {
				return fail(409, {
					action: 'createCategory',
					error: 'A category with this name already exists',
					values: Object.fromEntries(formData)
				});
			}

			const [category] = await db
				.insert(snippetCategories)
				.values({
					name: parsed.data.name,
					description: parsed.data.description || null,
					sortOrder: parsed.data.sortOrder ?? 0
				})
				.returning();

			console.log(`[AUDIT] User ${user.userId} created snippet category: ${category.name}`);

			return { success: true, action: 'createCategory', category };
		} catch (err) {
			console.error('Failed to create snippet category:', err);
			return fail(500, {
				action: 'createCategory',
				error: 'Failed to create category',
				values: Object.fromEntries(formData)
			});
		}
	},

	// Update a category
	updateCategory: async (event) => {
		const user = authenticateWithBetterAuth(event);
		const formData = await event.request.formData();

		const parsed = updateCategorySchema.safeParse(Object.fromEntries(formData));
		if (!parsed.success) {
			return fail(400, {
				action: 'updateCategory',
				errors: parsed.error.flatten(),
				values: Object.fromEntries(formData)
			});
		}

		try {
			const [existing] = await db
				.select()
				.from(snippetCategories)
				.where(eq(snippetCategories.id, parsed.data.id))
				.limit(1);

			if (!existing) {
				return fail(404, {
					action: 'updateCategory',
					error: 'Category not found'
				});
			}

			// Check for duplicate name if name is being changed
			if (parsed.data.name !== existing.name) {
				const [duplicate] = await db
					.select()
					.from(snippetCategories)
					.where(eq(snippetCategories.name, parsed.data.name))
					.limit(1);

				if (duplicate) {
					return fail(409, {
						action: 'updateCategory',
						error: 'A category with this name already exists',
						values: Object.fromEntries(formData)
					});
				}
			}

			const [updated] = await db
				.update(snippetCategories)
				.set({
					name: parsed.data.name,
					description: parsed.data.description || null,
					sortOrder: parsed.data.sortOrder ?? 0,
					updatedAt: new Date()
				})
				.where(eq(snippetCategories.id, parsed.data.id))
				.returning();

			console.log(`[AUDIT] User ${user.userId} updated snippet category: ${updated.name}`);

			return { success: true, action: 'updateCategory', category: updated };
		} catch (err) {
			console.error('Failed to update snippet category:', err);
			return fail(500, {
				action: 'updateCategory',
				error: 'Failed to update category',
				values: Object.fromEntries(formData)
			});
		}
	},

	// Delete a category
	deleteCategory: async (event) => {
		const user = authenticateWithBetterAuth(event);
		const formData = await event.request.formData();
		const id = parseInt(formData.get('id') as string);

		if (isNaN(id)) {
			return fail(400, { action: 'deleteCategory', error: 'Invalid category ID' });
		}

		try {
			const [existing] = await db
				.select()
				.from(snippetCategories)
				.where(eq(snippetCategories.id, id))
				.limit(1);

			if (!existing) {
				return fail(404, { action: 'deleteCategory', error: 'Category not found' });
			}

			// Check if any snippets use this category
			const [snippetUsingCategory] = await db
				.select({ id: snippets.id })
				.from(snippets)
				.where(eq(snippets.categoryId, id))
				.limit(1);

			if (snippetUsingCategory) {
				return fail(400, {
					action: 'deleteCategory',
					error: 'Cannot delete category: snippets are using it'
				});
			}

			await db.delete(snippetCategories).where(eq(snippetCategories.id, id));

			console.log(`[AUDIT] User ${user.userId} deleted snippet category: ${existing.name}`);

			return { success: true, action: 'deleteCategory', deletedId: id };
		} catch (err) {
			console.error('Failed to delete snippet category:', err);
			return fail(500, { action: 'deleteCategory', error: 'Failed to delete category' });
		}
	},

	// Create a new tag
	createTag: async (event) => {
		const user = authenticateWithBetterAuth(event);
		const formData = await event.request.formData();

		const parsed = createTagSchema.safeParse(Object.fromEntries(formData));
		if (!parsed.success) {
			return fail(400, {
				action: 'createTag',
				errors: parsed.error.flatten(),
				values: Object.fromEntries(formData)
			});
		}

		try {
			// Check for duplicate name
			const [existing] = await db
				.select()
				.from(snippetTags)
				.where(eq(snippetTags.name, parsed.data.name))
				.limit(1);

			if (existing) {
				return fail(409, {
					action: 'createTag',
					error: 'A tag with this name already exists',
					values: Object.fromEntries(formData)
				});
			}

			const [tag] = await db.insert(snippetTags).values({ name: parsed.data.name }).returning();

			console.log(`[AUDIT] User ${user.userId} created snippet tag: ${tag.name}`);

			return { success: true, action: 'createTag', tag };
		} catch (err) {
			console.error('Failed to create snippet tag:', err);
			return fail(500, {
				action: 'createTag',
				error: 'Failed to create tag',
				values: Object.fromEntries(formData)
			});
		}
	},

	// Delete a tag
	deleteTag: async (event) => {
		const user = authenticateWithBetterAuth(event);
		const formData = await event.request.formData();
		const id = parseInt(formData.get('id') as string);

		if (isNaN(id)) {
			return fail(400, { action: 'deleteTag', error: 'Invalid tag ID' });
		}

		try {
			const [existing] = await db.select().from(snippetTags).where(eq(snippetTags.id, id)).limit(1);

			if (!existing) {
				return fail(404, { action: 'deleteTag', error: 'Tag not found' });
			}

			// Delete all tag assignments first
			await db.delete(snippetTagAssignments).where(eq(snippetTagAssignments.tagId, id));

			// Delete the tag
			await db.delete(snippetTags).where(eq(snippetTags.id, id));

			console.log(`[AUDIT] User ${user.userId} deleted snippet tag: ${existing.name}`);

			return { success: true, action: 'deleteTag', deletedId: id };
		} catch (err) {
			console.error('Failed to delete snippet tag:', err);
			return fail(500, { action: 'deleteTag', error: 'Failed to delete tag' });
		}
	}
};
