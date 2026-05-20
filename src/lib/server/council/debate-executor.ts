/**
 * Debate execution orchestrator.
 *
 * Coordinates the full debate workflow:
 * 1. Creates a debate run record
 * 2. Runs 3 rounds with all agents in parallel per round
 * 3. Accumulates context across rounds
 * 4. Runs synthesizer after Round 3
 * 5. Yields events for each agent, round, and synthesis
 * 6. Returns final DebateRun on completion
 */

import { db } from '../db/client';
import { councilRuns } from '../db/schema';
import { eq } from 'drizzle-orm';
import type {
	DebateArchetype,
	DebateAgentConfig,
	DebateAgentResult,
	DebateEvent,
	DebateRoundResult,
	DebateRun,
	DebateState,
	DebateSynthesis,
	AgentOverride
} from './debate-types';
import { buildDebateContextForRound } from './debate-prompts';
import { loadDebateAgents } from './agent-loader';
import { runDebateAgent } from './agent-runner';
import { runSynthesizer } from './synthesizer';
import { createDebateRun, updateDebateRun } from './debate-persistence';

/**
 * Execute a structured debate with 3 agents across 3 rounds plus synthesis.
 *
 * This async generator:
 * 1. Creates a debate run record in the database
 * 2. Runs 3 rounds with all agents in parallel per round
 * 3. Accumulates context across rounds (cumulative)
 * 4. Runs synthesizer after Round 3
 * 5. Yields events for each agent, round, and synthesis
 * 6. Returns final DebateRun on completion
 *
 * @param options - promptId, topic, and optional agent overrides
 * @yields DebateEvent - streaming events throughout the debate
 * @returns DebateRun - final state of the debate run
 */
export async function* executeDebate(options: {
	promptId: number;
	topic: string;
	agentOverrides?: Map<DebateArchetype, AgentOverride>;
}): AsyncGenerator<DebateEvent, DebateRun, unknown> {
	const { promptId, topic, agentOverrides } = options;

	// Create debate run record
	let runId: number;
	try {
		runId = await createDebateRun(promptId, topic);
		console.log('[CouncilDebate] Created debate run:', runId);
	} catch (error) {
		yield {
			type: 'error',
			data: {
				message: error instanceof Error ? error.message : 'Failed to create debate run',
				code: 'CREATE_RUN_ERROR'
			}
		};
		throw error;
	}

	// Yield debate start event
	yield {
		type: 'debate_start',
		data: {
			topic,
			maxRounds: 3,
			agents: ['proponent', 'skeptic', 'pragmatist']
		}
	};

	// Load debate agents
	const agents = await loadDebateAgents(agentOverrides);
	const rounds: DebateRoundResult[] = [];

	// Run 3 rounds
	for (let roundNum = 1; roundNum <= 3; roundNum++) {
		// Update state
		const stateValue = `debating_round_${roundNum}` as DebateState;
		await updateDebateRun(runId, { state: stateValue, currentRound: roundNum });

		// Yield round start event
		yield {
			type: 'round_start',
			round: roundNum,
			data: { round: roundNum }
		};

		// Build context for this round (includes all previous rounds)
		const context = buildDebateContextForRound(topic, rounds, roundNum);

		// Run all agents in parallel using round-robin pattern
		const pendingGenerators: Map<
			DebateArchetype,
			{
				generator: AsyncGenerator<DebateEvent, DebateAgentResult, unknown>;
				agent: DebateAgentConfig;
				done: boolean;
			}
		> = new Map();

		for (const agent of agents) {
			const generator = runDebateAgent(agent, context, roundNum);
			pendingGenerators.set(agent.archetype, { generator, agent, done: false });
		}

		const roundResults: DebateAgentResult[] = [];

		// Process events round-robin style
		while (pendingGenerators.size > 0) {
			for (const [archetype, entry] of pendingGenerators) {
				if (entry.done) continue;

				try {
					const result = await entry.generator.next();

					if (result.done) {
						// Agent finished - capture result
						const agentResult = result.value;
						roundResults.push(agentResult);
						entry.done = true;

						// Yield agent complete event
						yield {
							type: 'agent_complete',
							round: roundNum,
							archetype,
							data: agentResult
						};
					} else {
						// Yield the event from this agent
						yield result.value;
					}
				} catch (error) {
					// Agent errored - create error result
					const errorResult: DebateAgentResult = {
						archetype,
						agentName: entry.agent.name,
						output: '',
						model: { providerId: entry.agent.providerId, modelId: entry.agent.modelId },
						usage: { promptTokens: 0, completionTokens: 0 }
					};
					roundResults.push(errorResult);
					entry.done = true;

					yield {
						type: 'error',
						round: roundNum,
						archetype,
						data: {
							message: error instanceof Error ? error.message : 'Agent execution failed'
						}
					};
				}
			}

			// Remove finished agents
			for (const [archetype, entry] of pendingGenerators) {
				if (entry.done) {
					pendingGenerators.delete(archetype);
				}
			}
		}

		// Store round result
		const roundResult: DebateRoundResult = {
			round: roundNum,
			agentResults: roundResults
		};
		rounds.push(roundResult);

		// Update database
		await updateDebateRun(runId, { steps: rounds });

		// Yield round complete event
		yield {
			type: 'round_complete',
			round: roundNum,
			data: { round: roundNum, agentCount: roundResults.length }
		};
	}

	// === SYNTHESIS PHASE ===
	await updateDebateRun(runId, { state: 'synthesizing' });

	let synthesis: DebateSynthesis | undefined;

	try {
		const synthesisGenerator = runSynthesizer(rounds, topic);
		let synthResult = await synthesisGenerator.next();

		while (!synthResult.done) {
			yield synthResult.value;
			synthResult = await synthesisGenerator.next();
		}

		synthesis = synthResult.value;

		// Yield synthesis complete event
		yield {
			type: 'synthesis_complete',
			data: synthesis
		};
	} catch (error) {
		yield {
			type: 'error',
			data: {
				message: error instanceof Error ? error.message : 'Synthesis failed',
				code: 'SYNTHESIS_ERROR'
			}
		};
		// Continue with default synthesis
		synthesis = {
			summary: 'Synthesis failed to complete.',
			keyArgumentsFor: [],
			keyArgumentsAgainst: [],
			pointsOfAgreement: [],
			finalRecommendation: 'Review individual round outputs for insights.',
			consensusLevel: 'Mixed views'
		};
	}

	// Update final state
	await updateDebateRun(runId, {
		state: 'complete',
		steps: rounds,
		finalOutput: JSON.stringify(synthesis)
	});

	// Yield debate complete event
	yield {
		type: 'debate_complete',
		data: {
			rounds,
			synthesis
		}
	};

	// Fetch and return final debate run state
	const runRecord = await db.select().from(councilRuns).where(eq(councilRuns.id, runId)).limit(1);

	if (runRecord.length === 0) {
		throw new Error('Debate run record not found');
	}

	const dbRun = runRecord[0];

	// Parse rounds from JSON
	let parsedRounds: DebateRoundResult[] = [];
	try {
		parsedRounds = dbRun.steps ? JSON.parse(dbRun.steps) : [];
	} catch {
		console.warn('[CouncilDebate] Failed to parse rounds JSON');
	}

	// Parse synthesis from finalOutput
	let parsedSynthesis: DebateSynthesis | undefined;
	try {
		parsedSynthesis = dbRun.finalOutput ? JSON.parse(dbRun.finalOutput) : undefined;
	} catch {
		console.warn('[CouncilDebate] Failed to parse synthesis JSON');
	}

	const finalRun: DebateRun = {
		id: dbRun.id,
		promptId: dbRun.promptId,
		topicContent: dbRun.inputContent,
		currentRound: dbRun.currentRound,
		state: dbRun.state as DebateState,
		rounds: parsedRounds,
		synthesis: parsedSynthesis,
		createdAt: dbRun.createdAt,
		updatedAt: dbRun.updatedAt
	};

	return finalRun;
}
