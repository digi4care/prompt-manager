import type { PageServerLoad } from './$types';
import { listSnippets } from '$lib/server/services/snippets.service';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || undefined;
	const category = url.searchParams.get('category') || undefined;

	const { snippets, totalCount } = await listSnippets(500, 0, search, category);

	// Extract unique categories for filter
	const categories = [...new Set(snippets.map((s) => s.category).filter(Boolean))] as string[];

	return {
		snippets: snippets.map((s) => ({
			...s,
			tags: s.tags ? JSON.parse(s.tags) : []
		})),
		totalCount,
		categories,
		search: search || '',
		category: category || ''
	};
};
