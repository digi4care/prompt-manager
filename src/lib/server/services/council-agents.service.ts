import { db } from '../db/client';
import { councilAgents, prompts } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { createCouncilAgent } from '../db/council-agents.facade';
import type { ParentType } from '../db/schema';
import type { CreateCouncilAgentParams } from '../db/council-agents.facade';

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
	agentOrder: number;
	promptLinkId: number | null;
	createdAt: Date;
	updatedAt: Date;
	promptName: string | null;
};

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
