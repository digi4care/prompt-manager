import type { PageServerLoad } from './$types';
import { listSnippets, getAllCategories, getAllTags } from '$lib/server/services/snippets.service';

const PER_PAGE = 20;

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || undefined;
	const categoryIdParam = url.searchParams.get('categoryId');
	const categoryId = categoryIdParam ? parseInt(categoryIdParam) : undefined;
	const pageParam = url.searchParams.get('page');
	const page = pageParam ? Math.max(1, parseInt(pageParam)) : 1;
	const offset = (page - 1) * PER_PAGE;

	const [{ snippets, totalCount }, categories, tags] = await Promise.all([
		listSnippets(PER_PAGE, offset, search, categoryId),
		getAllCategories(),
		getAllTags()
	]);

	return {
		snippets,
		totalCount,
		categories,
		tags,
		search: search || '',
		categoryId: categoryId || null,
		page,
		perPage: PER_PAGE,
		totalPages: Math.ceil(totalCount / PER_PAGE),
		hasMore: offset + snippets.length < totalCount
	};
};
