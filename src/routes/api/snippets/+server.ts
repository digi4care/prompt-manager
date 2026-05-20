import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listSnippets,
	createSnippet,
	snippetTitleExists,
	getAllCategories,
	getAllTags
} from '$lib/server/services/snippets.service';
import { z } from 'zod';
import { optionalAuthenticateRequest, authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiCreated, apiFail, apiPaginated } from '$lib/server/utils/api-response';

const createSnippetSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	content: z.string().min(1).max(50000),
	categoryId: z.number().int().positive().optional().nullable(),
	tagIds: z.array(z.number().int().positive()).optional()
});

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const search = url.searchParams.get('search') || undefined;
	const categoryIdParam = url.searchParams.get('categoryId');
	const tagIdParam = url.searchParams.get('tagId');

	const categoryId = categoryIdParam ? parseInt(categoryIdParam) : undefined;
	const tagId = tagIdParam ? parseInt(tagIdParam) : undefined;

	// Optional authentication - public snippets accessible without auth
	optionalAuthenticateRequest(event);

	try {
		const { snippets: snippetsList, totalCount } = await listSnippets(
			limit,
			offset,
			search,
			categoryId,
			tagId
		);
		return apiPaginated(
			{ snippets: snippetsList, totalCount },
			{ limit, offset, total: totalCount }
		);
	} catch (err) {
		console.error('Failed to fetch snippets:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch snippets', errors: null }));
	}
};

export const POST: RequestHandler = async (event) => {
	const data = await validateRequest(event, createSnippetSchema);

	// Require authentication for creating snippets
	const user = authenticateRequest(event);

	const { tagIds, ...snippetData } = data;

	// Validate categoryId if provided
	if (snippetData.categoryId) {
		const categories = await getAllCategories();
		if (!categories.find((c) => c.id === snippetData.categoryId)) {
			apiFail('Invalid category ID', 400);
		}
	}

	// Validate tagIds if provided
	if (tagIds && tagIds.length > 0) {
		const tags = await getAllTags();
		const validTagIds = new Set(tags.map((t) => t.id));
		for (const tagId of tagIds) {
			if (!validTagIds.has(tagId)) {
				apiFail(`Invalid tag ID: ${tagId}`, 400);
			}
		}
	}

	// Check for duplicate title
	const titleExists = await snippetTitleExists(snippetData.title);
	if (titleExists) {
		apiFail('A snippet with this title already exists', 409);
	}

	try {
		// Log the authenticated user for audit purposes
		console.log(
			`[AUDIT] User ${user.userId} (${user.email}) created snippet: ${snippetData.title}`
		);

		const snippet = await createSnippet({
			...snippetData,
			tagIds
		});

		return apiCreated(snippet);
	} catch (err) {
		console.error('Failed to create snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create snippet', errors: null }));
	}
};
