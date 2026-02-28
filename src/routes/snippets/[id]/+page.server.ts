import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSnippet } from '$lib/server/services/snippets.service';

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
