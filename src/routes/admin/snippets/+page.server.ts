import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { snippetCategories, snippetTags } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const [categories, tags] = await Promise.all([
		db
			.select()
			.from(snippetCategories)
			.orderBy(asc(snippetCategories.sortOrder), asc(snippetCategories.name)),
		db.select().from(snippetTags).orderBy(asc(snippetTags.name))
	]);

	return {
		categories,
		tags
	};
};
