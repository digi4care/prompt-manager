import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	createSnippet,
	snippetTitleExists,
	getAllCategories,
	getAllTags
} from '$lib/server/services/snippets.service';
import { z } from 'zod';

const createSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().optional(),
	content: z.string().min(1, 'Content is required').max(50000),
	categoryId: z.string().optional(), // Form sends string, convert to number
	tagIds: z.string().optional() // Comma-separated tag IDs in form
});

export const load: PageServerLoad = async () => {
	const [categories, tags] = await Promise.all([getAllCategories(), getAllTags()]);
	return { categories, tags };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const parsed = createSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten(), values: data });
		}

		const { categoryId, tagIds, ...rest } = parsed.data;

		// Convert categoryId to number
		const categoryIdNum = categoryId ? parseInt(categoryId) : undefined;

		// Convert tagIds string to number array
		const tagIdsArray = tagIds
			? tagIds
					.split(',')
					.map((t) => parseInt(t.trim()))
					.filter((t) => !isNaN(t))
			: [];

		// Check for duplicate title
		const titleExists = await snippetTitleExists(rest.title);
		if (titleExists) {
			return fail(409, {
				errors: {
					formErrors: ['A snippet with this title already exists'],
					fieldErrors: {}
				},
				values: data
			});
		}

		try {
			const snippet = await createSnippet({
				...rest,
				categoryId: categoryIdNum,
				tagIds: tagIdsArray
			});

			throw redirect(303, `/snippets/${snippet.id}`);
		} catch (err) {
			// Re-throw redirects
			if (err instanceof Error && err.message.includes('redirect')) {
				throw err;
			}
			return fail(500, {
				errors: { formErrors: ['Failed to create snippet'], fieldErrors: {} },
				values: data
			});
		}
	}
};
