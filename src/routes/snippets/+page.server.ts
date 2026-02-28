import type { PageServerLoad } from './$types';
import { listSnippets, getAllCategories, getAllTags } from '$lib/server/services/snippets.service';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || undefined;
	const categoryIdParam = url.searchParams.get('categoryId');
	const categoryId = categoryIdParam ? parseInt(categoryIdParam) : undefined;

	const [{ snippets, totalCount }, categories, tags] = await Promise.all([
		listSnippets(500, 0, search, categoryId),
		getAllCategories(),
		getAllTags()
	]);

	return {
		snippets,
		totalCount,
		categories,
		tags,
		search: search || '',
		categoryId: categoryId || null
	};
};
