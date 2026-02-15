import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listPatterns, getTopPatterns } from '$lib/server/services/patterns.service';
import { z } from 'zod';

/**
 * MED-3 FIX: Input validation with Zod
 * Validate query parameters and prevent injection attacks
 */
const QuerySchema = z.object({
	top: z.coerce.number().int().min(1).max(50).optional(),
	category: z.string().max(100).optional()
});

export const GET: RequestHandler = async ({ url }) => {
	try {
		// MED-3: Validate query parameters
		const searchParams = Object.fromEntries(url.searchParams);
		const validation = QuerySchema.safeParse(searchParams);

		if (!validation.success) {
			console.warn('[SECURITY] Invalid query parameters:', validation.error.issues);
			throw error(400, 'Invalid query parameters');
		}

		const limit = validation.data.top;
		const patterns = limit ? await getTopPatterns(limit) : await listPatterns();

		return json({ data: patterns });
	} catch (err) {
		console.error('Failed to fetch patterns:', err);
		throw error(500, 'Failed to fetch patterns');
	}
};
