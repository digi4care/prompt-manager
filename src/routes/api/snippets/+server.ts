import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	listSnippets,
	createSnippet,
	snippetTitleExists,
	getAllCategories,
	getAllTags
} from '$lib/server/services/snippets.service';
import { z } from 'zod';
import { optionalAuthenticateRequest, authenticateRequest } from '$lib/server/auth/jwt';

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
		return json({
			data: { snippets: snippetsList, totalCount },
			pagination: { limit, offset, hasMore: snippetsList.length === limit }
		});
	} catch (err) {
		console.error('Failed to fetch snippets:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch snippets', errors: null }));
	}
};

export const POST: RequestHandler = async (event) => {
	const { request } = event;
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	// Require authentication for creating snippets
	const user = authenticateRequest(event);

	const parsed = createSnippetSchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	const { tagIds, ...snippetData } = parsed.data;

	// Validate categoryId if provided
	if (snippetData.categoryId) {
		const categories = await getAllCategories();
		if (!categories.find((c) => c.id === snippetData.categoryId)) {
			throw error(400, JSON.stringify({ message: 'Invalid category ID', errors: null }));
		}
	}

	// Validate tagIds if provided
	if (tagIds && tagIds.length > 0) {
		const tags = await getAllTags();
		const validTagIds = new Set(tags.map((t) => t.id));
		for (const tagId of tagIds) {
			if (!validTagIds.has(tagId)) {
				throw error(400, JSON.stringify({ message: `Invalid tag ID: ${tagId}`, errors: null }));
			}
		}
	}

	// Check for duplicate title
	const titleExists = await snippetTitleExists(snippetData.title);
	if (titleExists) {
		throw error(
			409,
			JSON.stringify({
				message: 'A snippet with this title already exists',
				errors: null
			})
		);
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

		return json(snippet, { status: 201 });
	} catch (err) {
		console.error('Failed to create snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create snippet', errors: null }));
	}
};
