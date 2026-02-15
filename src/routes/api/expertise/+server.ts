import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listExpertiseFiles } from '$lib/server/services/expertise.service';
import { z } from 'zod';

/**
 * MED-3 FIX: Input validation with Zod
 * Validate query parameters and request data
 */
const QuerySchema = z.object({
	domain: z.string().optional(),
	version: z.string().optional()
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

		const files = await listExpertiseFiles();
		let expertiseList = files.map((file) => ({
			domain: file.domain,
			version: file.version,
			updatedAt: file.updatedAt
		}));

		// Apply filters if provided
		if (validation.data.domain) {
			expertiseList = expertiseList.filter((e) =>
				e.domain.toLowerCase().includes(validation.data.domain!.toLowerCase())
			);
		}

		return json({ data: expertiseList });
	} catch (err) {
		console.error('Failed to fetch expertise:', err);
		throw error(500, 'Failed to fetch expertise');
	}
};
