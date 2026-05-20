/**
 * Debate agent loading from database settings.
 *
 * Responsible for building DebateAgentConfig[] from the council_agents
 * table, with fallback to default archetypes.
 */

import { db } from '../db/client';
import {
	councilAgents,
	prompts,
	promptVersions
} from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import type { DebateArchetype, DebateAgentConfig, AgentOverride } from './debate-types';
import { ARCHETYPE_PROMPTS } from './debate-prompts';

/**
 * Parse model ID to extract provider and model.
 */
export function parseModelId(modelIdValue: string): { providerId: string; modelId: string } {
	const slashIndex = modelIdValue.indexOf('/');
	if (slashIndex === -1) {
		return { providerId: 'zai-coding-plan', modelId: modelIdValue };
	}
	return {
		providerId: modelIdValue.substring(0, slashIndex),
		modelId: modelIdValue.substring(slashIndex + 1)
	};
}

/**
 * Load debate agent configurations from database settings.
 * Order and names are determined by council_agents table.
 */
export async function loadDebateAgents(
	overrides?: Map<DebateArchetype, AgentOverride>
): Promise<DebateAgentConfig[]> {
	// Fetch council agents from database (ordered by agentOrder)
	const dbAgents = await db
		.select({
			id: councilAgents.id,
			agentOrder: councilAgents.agentOrder,
			modelId: councilAgents.modelId,
			promptLinkId: councilAgents.promptLinkId,
			promptTitle: prompts.title,
			promptVersionId: prompts.latestVersionId
		})
		.from(councilAgents)
		.leftJoin(prompts, eq(councilAgents.promptLinkId, prompts.id))
		.where(eq(councilAgents.parentType, 'function_defaults'))
		.orderBy(asc(councilAgents.agentOrder));

	if (dbAgents.length === 0) {
		console.warn('[CouncilDebate] No council agents found in database, using defaults');
		// Fallback to defaults if no agents configured
		const archetypes: DebateArchetype[] = ['proponent', 'skeptic', 'pragmatist'];
		return archetypes.map((archetype, i) => ({
			id: i + 1,
			archetype,
			name: archetype.charAt(0).toUpperCase() + archetype.slice(1),
			systemPrompt: ARCHETYPE_PROMPTS[archetype],
			modelId: 'glm-5',
			providerId: 'zhipu'
		}));
	}

	const agents: DebateAgentConfig[] = [];

	for (let i = 0; i < dbAgents.length; i++) {
		const dbAgent = dbAgents[i];
		// Use agentOrder as archetype identifier (1=first, 2=second, 3=third)
		const archetypeIndex = (dbAgent.agentOrder - 1) % 3;
		const archetypes: DebateArchetype[] = ['proponent', 'skeptic', 'pragmatist'];
		const archetype = archetypes[archetypeIndex];

		let systemPrompt = ARCHETYPE_PROMPTS[archetype];
		let name = dbAgent.promptTitle || archetype.charAt(0).toUpperCase() + archetype.slice(1);

		// Load prompt content if linked
		if (dbAgent.promptLinkId && dbAgent.promptVersionId) {
			const [version] = await db
				.select({ content: promptVersions.content })
				.from(promptVersions)
				.where(eq(promptVersions.id, dbAgent.promptVersionId))
				.limit(1);

			if (version?.content) {
				systemPrompt = version.content;
			}
		}

		// Parse model ID
		const modelIdValue = dbAgent.modelId || 'zai-coding-plan/glm-5';
		const { providerId, modelId } = parseModelId(modelIdValue);

		agents.push({
			id: dbAgent.id,
			archetype,
			name,
			systemPrompt,
			modelId,
			providerId
		});
	}

	console.log(
		'[CouncilDebate] Loaded debate agents from settings:',
		agents.map((a) => `${a.name} (${a.archetype})`)
	);
	return agents;
}
