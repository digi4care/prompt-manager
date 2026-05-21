import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getSnippet,
	updateSnippet,
	deleteSnippet,
	snippetTitleExists,
	getAllCategories,
	getAllTags
} from '$lib/server/services/snippets.service';
import { authenticateRequest } from '$lib/server/auth.helper';
import { z } from 'zod';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

const updateSnippetSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	content: z.string().min(1).max(50000).optional(),
	categoryId: z.number().int().positive().optional().nullable(),
	tagIds: z.array(z.number().int().positive()).optional()
});

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	try {
		const snippet = await getSnippet(id);
		if (!snippet) {
			apiFail('Snippet not found', 404);
		}

		return apiSuccess(snippet);
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch snippet:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch snippet', errors: null }));
	}
};

export const PATCH: RequestHandler = async (event) => {
	const { params } = event;

	// Require authentication for updating snippets
	authenticateRequest(event);
	const id = parseInt(params.id);
	const data = await validateRequest(event, updateSnippetSchema);

	try {
		const existing = await getSnippet(id);
		if (!existing) {
			apiFail('Snippet not found', 404);
		}

		const { tagIds, ...rest } = data;

		// Validate categoryId if provided
		if (rest.categoryId !== undefined && rest.categoryId !== null) {
			const categories = await getAllCategories();
			if (!categories.find((c) => c.id === rest.categoryId)) {
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

		// Check for duplicate title if title is being updated
		if (rest.title && rest.title !== existing.title) {
			const titleExists = await snippetTitleExists(rest.title, id);
			if (titleExists) {
				apiFail('A snippet with this title already exists', 409);
			}
		}

		const updated = await updateSnippet(id, {
			...rest,
			tagIds
		});

		return apiSuccess(updated);
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
	authenticateRequest(event);
	const id = parseInt(params.id);
	try {
		const existing = await getSnippet(id);
		if (!existing) {
			apiFail('Snippet not found', 404);
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
