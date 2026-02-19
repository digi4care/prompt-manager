import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { councilAgents } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

type ParentType = 'function_defaults' | 'prompt_function_settings';

// GET: List all council agents for function_defaults
export const GET: RequestHandler = async ({ url }) => {
	const parentType = (url.searchParams.get('parentType') ?? 'function_defaults') as ParentType;

	const agents = await db
		.select()
		.from(councilAgents)
		.where(eq(councilAgents.parentType, parentType))
		.orderBy(asc(councilAgents.agentOrder));

	return json({ data: agents });
};

// POST: Create new council agent
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	const {
		parentType = 'function_defaults',
		parentId = 0,
		modelId,
		temperature = 0.7,
		maxTokens = 4096,
		promptLinkId
	} = body;

	if (!modelId) {
		error(400, 'modelId is required');
	}

	// Get next order
	const existing = await db
		.select({ agentOrder: councilAgents.agentOrder })
		.from(councilAgents)
		.where(eq(councilAgents.parentType, parentType as ParentType))
		.orderBy(asc(councilAgents.agentOrder));

	const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.agentOrder)) + 1 : 1;

	const [agent] = await db
		.insert(councilAgents)
		.values({
			parentType: parentType as ParentType,
			parentId,
			modelId,
			temperature,
			maxTokens,
			promptLinkId: promptLinkId ?? null,
			agentOrder: nextOrder
		})
		.returning();

	return json({ data: agent }, { status: 201 });
};
