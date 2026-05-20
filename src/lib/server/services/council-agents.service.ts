import { db } from '../db/client';
import { councilAgents, prompts } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import {
	createCouncilAgent,
	updateCouncilAgent as facadeUpdate,
	deleteCouncilAgent as facadeDelete,
	type CreateCouncilAgentParams
} from '../db/council-agents.facade';
import type { ParentType } from '../db/schema';

export type CouncilAgentWithPrompt = {
	id: number;
	parentType: ParentType;
	parentId: number;
	modelId: string;
	modelVariant: string | null;
	modelName: string | null;
	modelProvider: string | null;
	temperature: number;
	maxTokens: number;
	thinkingLevel: string | null;
	agentOrder: number;
	promptLinkId: number | null;
	createdAt: Date;
	updatedAt: Date;
	promptName: string | null;
};

/** List all council agents for a parent type, joined with prompt names */
export async function getCouncilAgents(parentType: ParentType): Promise<CouncilAgentWithPrompt[]> {
	return db
		.select({
			id: councilAgents.id,
			parentType: councilAgents.parentType,
			parentId: councilAgents.parentId,
			modelId: councilAgents.modelId,
			modelVariant: councilAgents.modelVariant,
			modelName: councilAgents.modelName,
			modelProvider: councilAgents.modelProvider,
			temperature: councilAgents.temperature,
			maxTokens: councilAgents.maxTokens,
			thinkingLevel: councilAgents.thinkingLevel,
			agentOrder: councilAgents.agentOrder,
			promptLinkId: councilAgents.promptLinkId,
			createdAt: councilAgents.createdAt,
			updatedAt: councilAgents.updatedAt,
			promptName: prompts.title
		})
		.from(councilAgents)
		.leftJoin(prompts, eq(councilAgents.promptLinkId, prompts.id))
		.where(eq(councilAgents.parentType, parentType))
		.orderBy(asc(councilAgents.agentOrder));
}

/** Get a single council agent by ID */
export async function getCouncilAgent(id: number): Promise<CouncilAgentWithPrompt | null> {
	const [row] = await db
		.select({
			id: councilAgents.id,
			parentType: councilAgents.parentType,
			parentId: councilAgents.parentId,
			modelId: councilAgents.modelId,
			modelVariant: councilAgents.modelVariant,
			modelName: councilAgents.modelName,
			modelProvider: councilAgents.modelProvider,
			temperature: councilAgents.temperature,
			maxTokens: councilAgents.maxTokens,
			thinkingLevel: councilAgents.thinkingLevel,
			agentOrder: councilAgents.agentOrder,
			promptLinkId: councilAgents.promptLinkId,
			createdAt: councilAgents.createdAt,
			updatedAt: councilAgents.updatedAt,
			promptName: prompts.title
		})
		.from(councilAgents)
		.leftJoin(prompts, eq(councilAgents.promptLinkId, prompts.id))
		.where(eq(councilAgents.id, id));

	return row ?? null;
}

/** Create a new council agent with auto-computed order */
export async function createCouncilAgentWithOrder(
	params: Omit<CreateCouncilAgentParams, 'agentOrder'>
) {
	const existing = await db
		.select({ agentOrder: councilAgents.agentOrder })
		.from(councilAgents)
		.where(eq(councilAgents.parentType, params.parentType as ParentType))
		.orderBy(asc(councilAgents.agentOrder));

	const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.agentOrder)) + 1 : 1;

	return createCouncilAgent({ ...params, agentOrder: nextOrder });
}

/** Update a council agent by ID (partial) */
export async function updateCouncilAgent(
	id: number,
	data: Record<string, unknown>
): Promise<CouncilAgentWithPrompt | null> {
	const result = await facadeUpdate(id, {
		modelId: data.modelId as string | undefined,
		modelVariant: data.modelVariant as string | null | undefined,
		temperature: data.temperature as number | undefined,
		maxTokens: data.maxTokens as number | undefined,
		promptLinkId: data.promptLinkId as number | null | undefined,
		agentOrder: data.agentOrder as number | undefined
	});

	if (!result) return null;
	// Re-fetch through Drizzle to get joined data
	return getCouncilAgent(id);
}

/** Delete a council agent by ID */
export async function deleteCouncilAgentById(id: number): Promise<boolean> {
	return facadeDelete(id);
}
