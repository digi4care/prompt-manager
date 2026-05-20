import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/server/auth.helper';
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

const updateCategorySchema = z.object({
	name: z.string().min(1).max(100).optional(),
	description: z.string().max(500).optional().nullable(),
	sortOrder: z.number().int().min(0).optional()
});

// GET /api/admin/snippet-categories - List all categories
export const GET: RequestHandler = async () => {
	const categories = await getCategories();

	return json({ data: categories });
};

// POST /api/admin/snippet-categories - Create a new category
export const POST: RequestHandler = async (event) => {
	const { request } = event;
	const user = authenticateRequest(event);

	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	const parsed = createCategorySchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	try {
		const category = await createCategory(parsed.data);

		console.log(`[AUDIT] User ${user.userId} created snippet category: ${category.name}`);

		return json(category, { status: 201 });
	} catch (err: unknown) {
		if (err instanceof DuplicateNameError) {
			throw error(
				409,
				JSON.stringify({ message: 'A category with this name already exists', errors: null })
			);
		}
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to create snippet category:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create category', errors: null }));
	}
};
