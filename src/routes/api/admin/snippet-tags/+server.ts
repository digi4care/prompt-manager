import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/client';
import { snippetTags } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { authenticateRequest } from '$lib/server/auth.helper';
import { z } from 'zod';

const createTagSchema = z.object({
	name: z.string().min(1).max(100)
});

// GET /api/admin/snippet-tags - List all tags
export const GET: RequestHandler = async () => {
	const tags = await db.select().from(snippetTags).orderBy(asc(snippetTags.name));

	return json({ data: tags });
};

// POST /api/admin/snippet-tags - Create a new tag
export const POST: RequestHandler = async (event) => {
	const { request } = event;
	const user = authenticateRequest(event);

	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	const parsed = createTagSchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	try {
		// Check for duplicate name
		const [existing] = await db
			.select()
			.from(snippetTags)
			.where(eq(snippetTags.name, parsed.data.name))
			.limit(1);

		if (existing) {
			throw error(
				409,
				JSON.stringify({ message: 'A tag with this name already exists', errors: null })
			);
		}

		const [tag] = await db.insert(snippetTags).values({ name: parsed.data.name }).returning();

		console.log(`[AUDIT] User ${user.userId} created snippet tag: ${tag.name}`);

		return json(tag, { status: 201 });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to create snippet tag:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create tag', errors: null }));
	}
};
