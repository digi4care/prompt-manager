import type { RequestHandler } from './$types';
import { z } from 'zod';
import { createSSEHandler } from '$lib/server/utils/sse-handler';
import {
	executeDebate,
	type DebateArchetype,
	type AgentOverride
} from '$lib/server/services/council-debate.service';

const DebateRequestSchema = z.object({
	promptId: z.number().int().positive(),
	topic: z.string().min(1, 'Topic is required').max(50000, 'Topic too long'),
	agentOverrides: z
		.record(
			z.string(),
			z.object({
				promptId: z.number().int().positive(),
				versionId: z.number().int().positive().optional()
			})
		)
		.optional()
});

/**
 * POST /api/council/debate
 *
 * Execute a structured debate with 3 agents (Proponent, Skeptic, Pragmatist)
 * across 3 rounds, followed by synthesis.
 */
export const POST: RequestHandler = createSSEHandler({
	schema: DebateRequestSchema,
	createGenerator: (data) => {
		const overridesMap = data.agentOverrides
			? new Map<DebateArchetype, AgentOverride>(
					Object.entries(data.agentOverrides).map(([k, v]) => [
						k as DebateArchetype,
						v as AgentOverride
					])
				)
			: undefined;

		return executeDebate({
			promptId: data.promptId,
			topic: data.topic,
			agentOverrides: overridesMap
		});
	},
	isTerminal: (e) => e.type === 'debate_complete' || e.type === 'error'
});
