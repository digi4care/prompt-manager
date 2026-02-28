import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { snippetTags, snippetTagAssignments } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { authenticateRequest } from '$lib/server/auth/jwt';

// GET /api/admin/snippet-tags/[id] - Get a single tag
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid tag ID', errors: null }));
	}

	const [tag] = await db.select().from(snippetTags).where(eq(snippetTags.id, id)).limit(1);

	if (!tag) {
		throw error(404, JSON.stringify({ message: 'Tag not found', errors: null }));
	}

	return json({ data: tag });
};

// DELETE /api/admin/snippet-tags/[id] - Delete a tag
export const DELETE: RequestHandler = async (event) => {
	const { params } = event;
	const user = authenticateRequest(event);

	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid tag ID', errors: null }));
	}

	try {
		const [existing] = await db.select().from(snippetTags).where(eq(snippetTags.id, id)).limit(1);

		if (!existing) {
			throw error(404, JSON.stringify({ message: 'Tag not found', errors: null }));
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
		throw error(500, JSON.stringify({ message: 'Failed to delete tag', errors: null }));
	}
};
