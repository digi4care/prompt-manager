import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSnippet } from '$lib/server/services/snippets.service';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);

	const snippet = await getSnippet(id);
	if (!snippet) throw error(404, 'Snippet not found');

	return {
		snippet
	};
};
