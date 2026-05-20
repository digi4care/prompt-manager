/**
 * Council Debate Service — thin re-export barrel.
 *
 * All logic has been decomposed into:
 *   src/lib/server/council/debate/types.ts
 *   src/lib/server/council/debate/prompts.ts
 *   src/lib/server/council/debate/execution.ts
 *
 * Import from this file for backward compatibility.
 */

export { executeCouncilDebate, executeDebate } from '../council/debate';
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
} from '../council/debate';
