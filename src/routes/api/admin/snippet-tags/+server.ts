import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { snippetTags } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { authenticateRequest } from '$lib/server/auth.helper';
import { z } from 'zod';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiCreated, apiFail } from '$lib/server/utils/api-response';
const createTagSchema = z.object({
	name: z.string().min(1).max(100)
});

// GET /api/admin/snippet-tags - List all tags
export const GET: RequestHandler = async () => {
	const tags = await db.select().from(snippetTags).orderBy(asc(snippetTags.name));

	return apiSuccess(tags);
};

// POST /api/admin/snippet-tags - Create a new tag
export const POST: RequestHandler = async (event) => {
	const user = authenticateRequest(event);

	const data = await validateRequest(event, createTagSchema);

	try {
		// Check for duplicate name
		const [existing] = await db
			.select()
			.from(snippetTags)
			.where(eq(snippetTags.name, data.name))
			.limit(1);

		if (existing) {
			apiFail('A tag with this name already exists', 409);
		}

		const [tag] = await db.insert(snippetTags).values({ name: data.name }).returning();

		console.log(`[AUDIT] User ${user.userId} created snippet tag: ${tag.name}`);

		return apiCreated(tag);
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to create snippet tag:', err);
		apiFail('Failed to create tag', 500);
	}
};
