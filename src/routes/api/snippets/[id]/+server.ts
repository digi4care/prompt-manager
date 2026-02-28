import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getSnippet,
	updateSnippet,
	deleteSnippet,
	snippetTitleExists,
	getAllCategories,
	getAllTags
} from '$lib/server/services/snippets.service';
import { authenticateWithBetterAuth } from '$lib/server/auth/jwt';
import { z } from 'zod';

const updateSnippetSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	content: z.string().min(1).max(50000).optional(),
	categoryId: z.number().int().positive().optional().nullable(),
	tagIds: z.array(z.number().int().positive()).optional()
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
			data: snippet
		});
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch snippet', errors: null }));
	}
};

export const PATCH: RequestHandler = async (event) => {
	const { params, request } = event;

	// Require authentication for updating snippets
	authenticateWithBetterAuth(event);
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

		const { tagIds, ...rest } = parsed.data;

		// Validate categoryId if provided
		if (rest.categoryId !== undefined && rest.categoryId !== null) {
			const categories = await getAllCategories();
			if (!categories.find((c) => c.id === rest.categoryId)) {
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

		// Check for duplicate title if title is being updated
		if (rest.title && rest.title !== existing.title) {
			const titleExists = await snippetTitleExists(rest.title, id);
			if (titleExists) {
				throw error(
					409,
					JSON.stringify({
						message: 'A snippet with this title already exists',
						errors: null
					})
				);
			}
		}

		const updated = await updateSnippet(id, {
			...rest,
			tagIds
		});

		return json({ data: updated });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to update snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to update snippet', errors: null }));
	}
};

export const DELETE: RequestHandler = async (event) => {
	const { params } = event;

	// Require authentication for deleting snippets
	authenticateWithBetterAuth(event);
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
