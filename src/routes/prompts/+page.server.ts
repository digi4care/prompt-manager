import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	listPrompts,
	deletePrompt,
	bulkDeletePrompts,
	getAllTags,
	type SortField,
	type SortDirection
} from '$lib/server/services/prompts.service';

export const load: PageServerLoad = async ({ url }) => {
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 500);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const search = url.searchParams.get('search') || undefined;
	const tagsParam = url.searchParams.get('tags');
	const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;
	const sortField = (url.searchParams.get('sort') || 'updatedAt') as SortField;
	const sortDirection = (url.searchParams.get('direction') || 'desc') as SortDirection;

	try {
		// Fetch ALL tags (not just from filtered prompts)
		const allTags = await getAllTags();

		const { prompts: promptsList, totalCount } = await listPrompts(
			limit,
			offset,
			search,
			tags,
			sortField,
			sortDirection
		);

		// Transform tags from JSON string or comma-separated to array
		// Transform llm_providers to llmProviders
		const prompts = promptsList.map((p) => ({
			...p,
			tags: (() => {
				if (typeof p.tags === 'string') {
					try {
						return JSON.parse(p.tags);
					} catch {
						return p.tags
							.split(',')
							.map((t) => t.trim())
							.filter(Boolean);
					}
				}
				return p.tags || [];
			})(),
		llmProviders:
			typeof p.llm_providers === 'string'
				? (() => {
						try {
							return JSON.parse(p.llm_providers);
						} catch {
							return (p.llm_providers || '')
								.split(',')
								.map((t: string) => t.trim())
								.filter(Boolean);
						}
					})()
				: p.llm_providers || []
		}));

		return {
			prompts,
			allTags,
			pagination: {
				limit,
				offset,
				totalCount,
				hasMore: offset + promptsList.length < totalCount
			},
			meta: {
				title: 'Prompt Library',
				description: 'Browse and manage your prompt collection'
			}
		};
	} catch (err) {
		console.error('Failed to fetch prompts:', err);
		throw error(500, 'Failed to fetch prompts');
	}
};

export const actions: Actions = {
	deletePrompt: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id || isNaN(Number(id))) {
			return fail(400, { message: 'Invalid prompt ID' });
		}

		try {
			await deletePrompt(Number(id));
			return { success: true, message: 'Prompt deleted successfully' };
		} catch (err) {
			console.error('Failed to delete prompt:', err);
			return fail(500, { message: 'Failed to delete prompt' });
		}
	},

	bulkDeletePrompts: async ({ request }) => {
		const formData = await request.formData();
		const idsJson = formData.get('ids');

		if (!idsJson || typeof idsJson !== 'string') {
			return fail(400, { message: 'No prompts selected' });
		}

		try {
			const ids = JSON.parse(idsJson) as number[];
			const deletedCount = await bulkDeletePrompts(ids);
			return {
				success: true,
				message: `Deleted ${deletedCount} prompt${deletedCount !== 1 ? 's' : ''}`,
				deletedCount
			};
		} catch (err) {
			console.error('Failed to bulk delete prompts:', err);
			return fail(500, { message: 'Failed to delete prompts' });
		}
	}
};
