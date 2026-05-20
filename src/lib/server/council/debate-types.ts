/**
 * Debate-specific types for the council debate service.
 *
 * Extracted from council-debate.service.ts to support SRP decomposition.
 */

/**
 * Debate agent archetypes - the three perspectives in the debate
 */
export type DebateArchetype = 'proponent' | 'skeptic' | 'pragmatist';

/**
 * Debate workflow states
 */
export type DebateState =
	| 'idle'
	| 'debating_round_1'
	| 'debating_round_2'
	| 'debating_round_3'
	| 'synthesizing'
	| 'complete'
	| 'error';

/**
 * Configuration for a debate agent
 */
export interface DebateAgentConfig {
	id: number;
	archetype: DebateArchetype;
	name: string;
	systemPrompt: string;
	modelId: string;
	providerId: string;
}

/**
 * Result from a single debate agent
 */
export interface DebateAgentResult {
	archetype: DebateArchetype;
	agentName: string;
	output: string;
	model: { providerId: string; modelId: string };
	usage: { promptTokens: number; completionTokens: number };
}

/**
 * Result from a single debate round (all 3 agents)
 */
export interface DebateRoundResult {
	round: number;
	agentResults: DebateAgentResult[];
}

/**
 * Structured synthesis output from the debate
 */
export interface DebateSynthesis {
	summary: string;
	keyArgumentsFor: string[];
	keyArgumentsAgainst: string[];
	pointsOfAgreement: string[];
	finalRecommendation: string;
	consensusLevel: 'Strong consensus' | 'Moderate consensus' | 'Mixed views';
}

/**
 * Complete debate run record
 */
export interface DebateRun {
	id: number;
	promptId: number;
	topicContent: string;
	currentRound: number;
	state: DebateState;
	rounds: DebateRoundResult[];
	synthesis?: DebateSynthesis;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Event types emitted during debate execution
 */
export type DebateEventType =
	| 'debate_start'
	| 'round_start'
	| 'agent_start'
	| 'agent_delta'
	| 'agent_complete'
	| 'round_complete'
	| 'synthesis_start'
	| 'synthesis_delta'
	| 'synthesis_complete'
	| 'debate_complete'
	| 'error';

/**
 * Event emitted during debate execution
 */
export interface DebateEvent {
	type: DebateEventType;
	round?: number;
	archetype?: DebateArchetype;
	data: unknown;
}

/**
 * Agent override configuration for customizing debate agents
 */
export interface AgentOverride {
	promptId: number;
	versionId?: number;
}
