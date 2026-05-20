import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { snippetCategories, snippets } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateRequest } from '$lib/server/auth.helper';
import { z } from 'zod';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

const updateCategorySchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional().nullable(),
	sortOrder: z.number().int().min(0).optional()
});

// GET /api/admin/snippet-categories/[id] - Get a single category
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		apiFail('Invalid category ID', 400);
	}

	const [category] = await db
		.select()
		.from(snippetCategories)
		.where(eq(snippetCategories.id, id))
		.limit(1);

	if (!category) {
		apiFail('Category not found', 404);
	}

	return apiSuccess(category);
};

// PUT /api/admin/snippet-categories/[id] - Update a category
export const PUT: RequestHandler = async (event) => {
	const { params } = event;
	const user = authenticateRequest(event);

	const id = parseInt(params.id);
	if (isNaN(id)) {
		apiFail('Invalid category ID', 400);
	}

	const data = await validateRequest(event, updateCategorySchema);

	try {
		const [existing] = await db
			.select()
			.from(snippetCategories)
			.where(eq(snippetCategories.id, id))
			.limit(1);

		if (!existing) {
			apiFail('Category not found', 404);
		}

		// Check for duplicate name if name is being updated
		if (data.name && data.name !== existing.name) {
			const [duplicate] = await db
				.select()
				.from(snippetCategories)
				.where(eq(snippetCategories.name, data.name))
				.limit(1);

			if (duplicate) {
				apiFail('A category with this name already exists', 409);
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

		console.log(`[AUDIT] User ${user.userId} updated snippet category: ${updated.name}`);

		return apiSuccess(updated);
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to update snippet category:', err);
		apiFail('Failed to update category', 500);
	}
};

// DELETE /api/admin/snippet-categories/[id] - Delete a category
export const DELETE: RequestHandler = async (event) => {
	const { params } = event;
	const user = authenticateRequest(event);

	const id = parseInt(params.id);
	if (isNaN(id)) {
		apiFail('Invalid category ID', 400);
	}

	try {
		const [existing] = await db
			.select()
			.from(snippetCategories)
			.where(eq(snippetCategories.id, id))
			.limit(1);

		if (!existing) {
			apiFail('Category not found', 404);
		}

		// Check if any snippets use this category
		const [snippetUsingCategory] = await db
			.select({ id: snippets.id })
			.from(snippets)
			.where(eq(snippets.categoryId, id))
			.limit(1);

		if (snippetUsingCategory) {
			apiFail('Cannot delete category: snippets are using it', 400);
		}

		await db.delete(snippetCategories).where(eq(snippetCategories.id, id));

		console.log(`[AUDIT] User ${user.userId} deleted snippet category: ${existing.name}`);

		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to delete snippet category:', err);
		apiFail('Failed to delete category', 500);
	}
};
