/**
 * Council debate — barrel export.
 */

export { executeCouncilDebate, executeDebate } from './execution';
export type {
	DebateArchetype,
	DebateState,
	DebateAgentConfig,
	DebateAgentResult,
	DebateRoundResult,
	DebateSynthesis,
	DebateRun,
	DebateEventType,
	DebateEvent,
	AgentOverride
} from './types';
export {
	MAX_ROUNDS,
	SYNTHESIS_SYSTEM_PROMPT
} from './types';
export {
	ARCHETYPE_PROMPTS,
	buildDebateContextForRound,
	buildSynthesisPrompt,
	parseSynthesisJson
} from './prompts';
