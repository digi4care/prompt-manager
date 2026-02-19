import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { councilAgents } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET: Get single council agent
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		error(400, 'Invalid ID');
	}

	const [agent] = await db.select().from(councilAgents).where(eq(councilAgents.id, id));

	if (!agent) {
		error(404, 'Council agent not found');
	}

	return json({ data: agent });
};

// PUT: Update council agent
export const PUT: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		error(400, 'Invalid ID');
	}

	const body = await request.json();
	const {
		modelId,
		modelName,
		modelProvider,
		modelLogo,
		temperature,
		maxTokens,
		promptLinkId,
		agentOrder
	} = body;

	const updateData: Record<string, unknown> = {};
	if (modelId !== undefined) updateData.modelId = modelId;
	if (modelName !== undefined) updateData.modelName = modelName;
	if (modelProvider !== undefined) updateData.modelProvider = modelProvider;
	if (modelLogo !== undefined) updateData.modelLogo = modelLogo;
	if (temperature !== undefined) updateData.temperature = temperature;
	if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
	if (promptLinkId !== undefined) updateData.promptLinkId = promptLinkId;
	if (agentOrder !== undefined) updateData.agentOrder = agentOrder;

	const [agent] = await db
		.update(councilAgents)
		.set(updateData)
		.where(eq(councilAgents.id, id))
		.returning();

	if (!agent) {
		error(404, 'Council agent not found');
	}

	return json({ data: agent });
};

// DELETE: Remove council agent
export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		error(400, 'Invalid ID');
	}

	const [agent] = await db.delete(councilAgents).where(eq(councilAgents.id, id)).returning();

	if (!agent) {
		error(404, 'Council agent not found');
	}

	return json({ data: agent });
};
