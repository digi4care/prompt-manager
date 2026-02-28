import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { snippetCategories, snippets } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { authenticateRequest } from '$lib/server/auth/jwt';
import { z } from 'zod';
import { isNull } from 'drizzle-orm';

const updateCategorySchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional().nullable(),
	sortOrder: z.number().int().min(0).optional()
});

// GET /api/admin/snippet-categories/[id] - Get a single category
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid category ID', errors: null }));
	}

	const [category] = await db
		.select()
		.from(snippetCategories)
		.where(eq(snippetCategories.id, id))
		.limit(1);

	if (!category) {
		throw error(404, JSON.stringify({ message: 'Category not found', errors: null }));
	}

	return json({ data: category });
};

// PUT /api/admin/snippet-categories/[id] - Update a category
export const PUT: RequestHandler = async (event) => {
	const { params, request } = event;
	const user = authenticateRequest(event);

	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid category ID', errors: null }));
	}

	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	const parsed = updateCategorySchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	try {
		const [existing] = await db
			.select()
			.from(snippetCategories)
			.where(eq(snippetCategories.id, id))
			.limit(1);

		if (!existing) {
			throw error(404, JSON.stringify({ message: 'Category not found', errors: null }));
		}

		// Check for duplicate name if name is being updated
		if (parsed.data.name && parsed.data.name !== existing.name) {
			const [duplicate] = await db
				.select()
				.from(snippetCategories)
				.where(eq(snippetCategories.name, parsed.data.name))
				.limit(1);

			if (duplicate) {
				throw error(
					409,
					JSON.stringify({ message: 'A category with this name already exists', errors: null })
				);
			}
		}

		const [updated] = await db
			.update(snippetCategories)
			.set({
				...parsed.data,
				updatedAt: new Date()
			})
			.where(eq(snippetCategories.id, id))
			.returning();

		console.log(`[AUDIT] User ${user.userId} updated snippet category: ${updated.name}`);

		return json({ data: updated });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to update snippet category:', err);
		throw error(500, JSON.stringify({ message: 'Failed to update category', errors: null }));
	}
};

// DELETE /api/admin/snippet-categories/[id] - Delete a category
export const DELETE: RequestHandler = async (event) => {
	const { params } = event;
	const user = authenticateRequest(event);

	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid category ID', errors: null }));
	}

	try {
		const [existing] = await db
			.select()
			.from(snippetCategories)
			.where(eq(snippetCategories.id, id))
			.limit(1);

		if (!existing) {
			throw error(404, JSON.stringify({ message: 'Category not found', errors: null }));
		}

		// Check if any snippets use this category
		const [snippetUsingCategory] = await db
			.select({ id: snippets.id })
			.from(snippets)
			.where(eq(snippets.categoryId, id))
			.limit(1);

		if (snippetUsingCategory) {
			throw error(
				400,
				JSON.stringify({
					message: 'Cannot delete category: snippets are using it',
					errors: null
				})
			);
		}

		await db.delete(snippetCategories).where(eq(snippetCategories.id, id));

		console.log(`[AUDIT] User ${user.userId} deleted snippet category: ${existing.name}`);

		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to delete snippet category:', err);
		throw error(500, JSON.stringify({ message: 'Failed to delete category', errors: null }));
	}
};
