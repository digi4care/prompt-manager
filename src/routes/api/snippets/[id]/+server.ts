import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSnippet, updateSnippet, deleteSnippet } from '$lib/server/services/snippets.service';
import { z } from 'zod';

const updateSnippetSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	content: z.string().min(1).max(50000).optional(),
	category: z.string().optional(),
	tags: z.array(z.string()).optional()
});

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid snippet ID', errors: null }));
	}

	try {
		const snippet = await getSnippet(id);
		if (!snippet) {
			throw error(404, JSON.stringify({ message: 'Snippet not found', errors: null }));
		}

		return json({
			data: {
				...snippet,
				tags: snippet.tags ? JSON.parse(snippet.tags) : []
			}
		});
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch snippet', errors: null }));
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid snippet ID', errors: null }));
	}

	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	const parsed = updateSnippetSchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	try {
		const existing = await getSnippet(id);
		if (!existing) {
			throw error(404, JSON.stringify({ message: 'Snippet not found', errors: null }));
		}

		const { tags, ...rest } = parsed.data;
		const updated = await updateSnippet(id, {
			...rest,
			tags: tags ? JSON.stringify(tags) : undefined
		});

		return json({ data: updated });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to update snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to update snippet', errors: null }));
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid snippet ID', errors: null }));
	}

	try {
		const existing = await getSnippet(id);
		if (!existing) {
			throw error(404, JSON.stringify({ message: 'Snippet not found', errors: null }));
		}

		await deleteSnippet(id);
		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to delete snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to delete snippet', errors: null }));
	}
};
