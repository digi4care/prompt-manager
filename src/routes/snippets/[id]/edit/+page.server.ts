import { fail, redirect, error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getSnippet, updateSnippet, deleteSnippet } from '$lib/server/services/snippets.service';
import { z } from 'zod';

const updateSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().optional(),
	content: z.string().min(1, 'Content is required').max(50000),
	category: z.string().optional(),
	tags: z.string().optional()
});

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) throw error(400, 'Invalid snippet ID');

	const snippet = await getSnippet(id);
	if (!snippet) throw error(404, 'Snippet not found');

	return {
		snippet: {
			...snippet,
			tags: snippet.tags ? JSON.parse(snippet.tags) : []
		}
	};
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const id = parseInt(params.id);
		if (isNaN(id)) throw error(400, 'Invalid snippet ID');

		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const parsed = updateSchema.safeParse(data);
		if (!parsed.success) {
			return fail(400, { errors: parsed.error.flatten(), values: data });
		}

		const { tags, ...rest } = parsed.data;
		const tagsArray = tags
			? tags
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];

		await updateSnippet(id, {
			...rest,
			tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : null
		});

		throw redirect(303, `/snippets/${id}`);
	},

	delete: async ({ params }) => {
		const id = parseInt(params.id);
		if (isNaN(id)) throw error(400, 'Invalid snippet ID');

		await deleteSnippet(id);
		throw redirect(303, '/snippets');
	}
};
