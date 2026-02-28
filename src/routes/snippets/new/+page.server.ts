import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createSnippet } from '$lib/server/services/snippets.service';
import { z } from 'zod';

const createSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().optional(),
	content: z.string().min(1, 'Content is required').max(50000),
	category: z.string().optional(),
	tags: z.string().optional() // Comma-separated in form, convert to JSON
});

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const parsed = createSchema.safeParse(data);
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

		const snippet = await createSnippet({
			...rest,
			tags: tagsArray.length > 0 ? JSON.stringify(tagsArray) : null
		});

		throw redirect(303, `/snippets/${snippet.id}`);
	}
};
