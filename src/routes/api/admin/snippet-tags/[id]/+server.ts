import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { snippetTags, snippetTagAssignments } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateRequest } from '$lib/server/auth.helper';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
// GET /api/admin/snippet-tags/[id] - Get a single tag
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		apiFail('Invalid tag ID', 400);
	}

	const [tag] = await db.select().from(snippetTags).where(eq(snippetTags.id, id)).limit(1);

	if (!tag) {
		apiFail('Tag not found', 404);
	}

	return apiSuccess(tag);
};

// DELETE /api/admin/snippet-tags/[id] - Delete a tag
export const DELETE: RequestHandler = async (event) => {
	const { params } = event;
	const user = authenticateRequest(event);

	const id = parseInt(params.id);
	if (isNaN(id)) {
		apiFail('Invalid tag ID', 400);
	}

	try {
		const [existing] = await db.select().from(snippetTags).where(eq(snippetTags.id, id)).limit(1);

		if (!existing) {
			apiFail('Tag not found', 404);
		}

		// Delete all tag assignments first (cascade should handle this, but be explicit)
		await db.delete(snippetTagAssignments).where(eq(snippetTagAssignments.tagId, id));

		// Delete the tag
		await db.delete(snippetTags).where(eq(snippetTags.id, id));

		console.log(`[AUDIT] User ${user.userId} deleted snippet tag: ${existing.name}`);

		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to delete snippet tag:', err);
		apiFail('Failed to delete tag', 500);
	}
};
