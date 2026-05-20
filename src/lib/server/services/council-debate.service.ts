/**
 * Council Debate Service — thin re-export barrel.
 *
 * All implementation has been decomposed into focused modules under council/:
 * - debate-types.ts      — type definitions
 * - debate-prompts.ts    — prompt building, synthesis parsing
 * - agent-loader.ts      — agent config loading from DB
 * - agent-runner.ts      — single agent execution (streaming)
 * - synthesizer.ts       — synthesis execution
 * - debate-persistence.ts — DB create/update for debate runs
 * - debate-executor.ts   — orchestration (executeDebate)
 *
 * This file preserves backward compatibility for existing import paths.
 */

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
} from '../council/debate-types';

export { executeDebate, executeDebate as executeCouncilDebate } from '../council/debate-executor';
