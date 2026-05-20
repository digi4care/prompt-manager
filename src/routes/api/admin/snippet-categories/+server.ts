import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiCreated, apiFail } from '$lib/server/utils/api-response';
import {
	getCategories,
	createCategory,
	DuplicateNameError
} from '$lib/server/services/snippet-categories.service';
import { z } from 'zod';

const createCategorySchema = z.object({
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional(),
	sortOrder: z.number().int().min(0).optional()
});

// GET /api/admin/snippet-categories - List all categories
export const GET: RequestHandler = async () => {
	const categories = await getCategories();
	return apiSuccess(categories);
};

// POST /api/admin/snippet-categories - Create a new category
export const POST: RequestHandler = async (event) => {
	const user = authenticateRequest(event);
	const data = await validateRequest(event, createCategorySchema);

	try {
		const category = await createCategory(data);
		console.log(`[AUDIT] User ${user.userId} created snippet category: ${category.name}`);
		return apiCreated(category);
	} catch (err: unknown) {
		if (err instanceof DuplicateNameError) {
			apiFail('A category with this name already exists', 409);
		}
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to create snippet category:', err);
		apiFail('Failed to create category', 500);
	}
};
