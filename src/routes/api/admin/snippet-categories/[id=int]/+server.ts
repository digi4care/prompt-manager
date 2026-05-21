import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
import {
	getCategoryById,
	updateCategory,
	deleteCategory,
	DuplicateNameError,
	CategoryNotFoundError,
	CategoryInUseError
} from '$lib/server/services/snippet-categories.service';
import { z } from 'zod';

const updateCategorySchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional().nullable(),
	sortOrder: z.number().int().min(0).optional()
});

// GET /api/admin/snippet-categories/[id] - Get a single category
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);

	const category = await getCategoryById(id);
	if (!category) apiFail('Category not found', 404);

	return apiSuccess(category);
};

// PUT /api/admin/snippet-categories/[id] - Update a category
export const PUT: RequestHandler = async (event) => {
	const user = authenticateRequest(event);
	const id = parseInt(event.params.id);
	const data = await validateRequest(event, updateCategorySchema);

	try {
		const updated = await updateCategory(id, data);
		console.log(`[AUDIT] User ${user.userId} updated snippet category: ${updated.name}`);
		return apiSuccess(updated);
	} catch (err: unknown) {
		if (err instanceof DuplicateNameError) apiFail(err.message, 409);
		if (err instanceof CategoryNotFoundError) apiFail(err.message, 404);
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to update snippet category:', err);
		apiFail('Failed to update category', 500);
	}
};

// DELETE /api/admin/snippet-categories/[id] - Delete a category
export const DELETE: RequestHandler = async (event) => {
	const user = authenticateRequest(event);
	const id = parseInt(event.params.id);
	try {
		await deleteCategory(id);
		console.log(`[AUDIT] User ${user.userId} deleted snippet category: ${id}`);
		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		if (err instanceof CategoryNotFoundError) apiFail(err.message, 404);
		if (err instanceof CategoryInUseError) apiFail(err.message, 400);
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to delete snippet category:', err);
		apiFail('Failed to delete category', 500);
	}
};
