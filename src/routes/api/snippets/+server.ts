import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listSnippets, createSnippet } from '$lib/server/services/snippets.service';
import { z } from 'zod';
import { optionalAuthenticateRequest, authenticateRequest } from '$lib/server/auth/jwt';

const createSnippetSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	content: z.string().min(1).max(50000),
	category: z.string().optional(),
	tags: z.array(z.string()).optional()
});

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const search = url.searchParams.get('search') || undefined;
	const category = url.searchParams.get('category') || undefined;

	// Optional authentication - public snippets accessible without auth
	optionalAuthenticateRequest(event);

	try {
		const { snippets: snippetsList, totalCount } = await listSnippets(
			limit,
			offset,
			search,
			category
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

	const { tags, ...snippetData } = parsed.data;

	try {
		// Log the authenticated user for audit purposes
		console.log(
			`[AUDIT] User ${user.userId} (${user.email}) created snippet: ${snippetData.title}`
		);

		const snippet = await createSnippet({
			...snippetData,
			tags: tags ? JSON.stringify(tags) : null
		});

		return json(snippet, { status: 201 });
	} catch (err) {
		console.error('Failed to create snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create snippet', errors: null }));
	}
};
