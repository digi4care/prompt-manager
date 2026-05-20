/**
 * Debate execution orchestrator and core logic.
 *
 * Coordinates the full debate workflow:
 * 1. Creates a debate run record
 * 2. Runs 3 rounds with all agents in parallel per round
 * 3. Accumulates context across rounds
 * 4. Runs synthesizer after Round 3
 * 5. Yields events for each agent, round, and synthesis
 * 6. Returns final DebateRun on completion
 */

import { db } from '../../db/client';
import {
	councilRuns,
	functionDefaults,
	councilAgents,
	prompts,
	promptVersions
} from '../../db/schema';
import { eq, asc } from 'drizzle-orm';
import { getOpencodeClient } from '../../services/opencode.service';
import type { Session } from '@opencode-ai/sdk';
import type { FunctionType } from '../../services/function-defaults.service';
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
} from './types';
import { MAX_ROUNDS } from './types';
import {
	ARCHETYPE_PROMPTS,
	buildDebateContextForRound,
	buildSynthesisPrompt,
	parseSynthesisJson
} from './prompts';

// ─── Agent Loading ───────────────────────────────────────────────────────────

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
		const archetypeIndex = (dbAgent.agentOrder - 1) % 3;
		const archetypes: DebateArchetype[] = ['proponent', 'skeptic', 'pragmatist'];
		const archetype = archetypes[archetypeIndex];

		let systemPrompt = ARCHETYPE_PROMPTS[archetype];
		let name = dbAgent.promptTitle || archetype.charAt(0).toUpperCase() + archetype.slice(1);

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

// ─── Persistence ─────────────────────────────────────────────────────────────

/**
 * Create a new debate run record in the database.
 */
export async function createDebateRun(promptId: number, topicContent: string): Promise<number> {
	const result = await db
		.insert(councilRuns)
		.values({
			promptId,
			inputContent: topicContent,
			currentRound: 1,
			maxRounds: MAX_ROUNDS,
			state: 'idle',
			steps: '[]',
			finalOutput: null
		})
		.returning({ id: councilRuns.id });

	return result[0].id;
}

/**
 * Update debate run state in database.
 */
export async function updateDebateRun(
	runId: number,
	updates: {
		state?: DebateState;
		currentRound?: number;
		steps?: DebateRoundResult[];
		finalOutput?: string;
	}
): Promise<void> {
	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
		...updates
	};

	if (updates.steps !== undefined) {
		updateData.steps = JSON.stringify(updates.steps);
	}

	await db.update(councilRuns).set(updateData).where(eq(councilRuns.id, runId));
}

// ─── Single Agent Execution ──────────────────────────────────────────────────

/**
 * Run a single debate agent.
 * Returns an async generator that yields events.
 */
export async function* runDebateAgent(
	agent: DebateAgentConfig,
	context: string,
	round: number
): AsyncGenerator<DebateEvent, DebateAgentResult, unknown> {
	let accumulatedOutput = '';
	let promptTokens = 0;
	let completionTokens = 0;

	yield {
		type: 'agent_start',
		round,
		archetype: agent.archetype,
		data: { archetype: agent.archetype, agentName: agent.name }
	};

	try {
		const client = await getOpencodeClient();

		let eventSubscription: Awaited<ReturnType<typeof client.event.subscribe>>;
		try {
			eventSubscription = await Promise.race([
				client.event.subscribe(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Event subscription timeout')), 10000)
				)
			]);
		} catch (subError) {
			console.error(`[${agent.archetype}] Event subscription failed:`, subError);
			yield {
				type: 'error',
				round,
				archetype: agent.archetype,
				data: {
					archetype: agent.archetype,
					agentName: agent.name,
					error: subError instanceof Error ? subError.message : 'Event subscription failed'
				}
			};
			return {
				archetype: agent.archetype,
				agentName: agent.name,
				output: '',
				model: { providerId: '', modelId: '' },
				usage: { promptTokens: 0, completionTokens: 0 }
			};
		}

		const eventStream = eventSubscription.stream as AsyncIterable<{
			type: string;
			properties?: Record<string, unknown>;
		}>;

		let createResult: Awaited<ReturnType<typeof client.session.create>>;
		try {
			createResult = await Promise.race([
				client.session.create(),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Session creation timeout')), 10000)
				)
			]);
		} catch (sessionError) {
			console.error(`[${agent.archetype}] Session creation failed:`, sessionError);
			yield {
				type: 'error',
				round,
				archetype: agent.archetype,
				data: {
					archetype: agent.archetype,
					agentName: agent.name,
					error: sessionError instanceof Error ? sessionError.message : 'Session creation failed'
				}
			};
			return {
				archetype: agent.archetype,
				agentName: agent.name,
				output: '',
				model: { providerId: '', modelId: '' },
				usage: { promptTokens: 0, completionTokens: 0 }
			};
		}

		if ('error' in createResult && createResult.error) {
			throw new Error('Failed to create session');
		}
		const session = createResult.data as Session;
		const sessionID = session.id;

		const fullPrompt = `${agent.systemPrompt}\n\n---\n\n${context}\n\n---\n\n## Your Response:`;

		await client.session.promptAsync({
			path: { id: sessionID },
			body: {
				parts: [{ type: 'text', text: fullPrompt }],
				model: {
					providerID: agent.providerId,
					modelID: agent.modelId
				}
			}
		});

		try {
			console.log(`[${agent.archetype}] Starting event processing for session ${sessionID}`);
			let eventCount = 0;
			let lastPartTextLength = 0;

			for await (const event of eventStream) {
				eventCount++;

				if (eventCount <= 10) {
					console.log(
						`[${agent.archetype}] Event #${eventCount} FULL:`,
						JSON.stringify(event, (key, value) =>
							typeof value === 'string' && value.length > 200
								? value.substring(0, 200) + '...[truncated]'
								: value
						)
					);
				} else {
					console.log(`[${agent.archetype}] Event #${eventCount}: type=${event.type}`);
				}

				if (event.type === 'message.part.updated') {
					const props = event.properties as Record<string, unknown> | undefined;
					const partObj = props?.part as Record<string, unknown> | undefined;
					const partSessionID = partObj?.sessionID || props?.sessionID || null;

					if (partSessionID !== sessionID) {
						console.log(
							`[${agent.archetype}] Skipping event - sessionID mismatch: ${partSessionID} !== ${sessionID}`
						);
						continue;
					}

					const fullText = typeof partObj?.text === 'string' ? partObj.text : null;

					if (fullText && fullText.length > lastPartTextLength) {
						const delta = fullText.substring(lastPartTextLength);
						lastPartTextLength = fullText.length;
						accumulatedOutput = fullText;

						console.log(
							`[${agent.archetype}] message.part.updated: deltaLen=${delta.length}, totalLen=${fullText.length}`
						);

						yield {
							type: 'agent_delta',
							round,
							archetype: agent.archetype,
							data: { delta, accumulated: accumulatedOutput }
						};
					} else if (typeof props?.delta === 'string') {
						accumulatedOutput += props.delta;
						yield {
							type: 'agent_delta',
							round,
							archetype: agent.archetype,
							data: { delta: props.delta, accumulated: accumulatedOutput }
						};
					}
				}

				if (event.type === 'message.part.delta') {
					const props = event.properties as
						| { sessionID?: string; delta?: string; part?: { sessionID?: string } }
						| undefined;
					const deltaSessionID = props?.sessionID || props?.part?.sessionID || null;

					if (deltaSessionID !== sessionID) {
						console.log(
							`[${agent.archetype}] Skipping delta - sessionID mismatch: ${deltaSessionID} !== ${sessionID}`
						);
						continue;
					}

					const delta = props?.delta;
					if (delta) {
						accumulatedOutput += delta;
						console.log(
							`[${agent.archetype}] message.part.delta: deltaLen=${delta.length}, totalLen=${accumulatedOutput.length}`
						);
						yield {
							type: 'agent_delta',
							round,
							archetype: agent.archetype,
							data: { delta, accumulated: accumulatedOutput }
						};
					}
				}

				if (event.type === 'session.status') {
					const props = event.properties as
						| { sessionID?: string; status?: { type?: string } }
						| undefined;
					console.log(
						`[${agent.archetype}] session.status: sessionID=${props?.sessionID}, status.type=${props?.status?.type}`
					);
					if (props?.sessionID === sessionID && props?.status?.type === 'idle') {
						console.log(`[${agent.archetype}] Session idle, breaking event loop`);
						break;
					}
				}

				if (event.type === 'session.idle') {
					const props = event.properties as { sessionID?: string } | undefined;
					console.log(`[${agent.archetype}] session.idle: sessionID=${props?.sessionID}`);
					if (props?.sessionID === sessionID) {
						console.log(`[${agent.archetype}] Session idle (legacy), breaking event loop`);
						break;
					}
				}

				if (event.type === 'session.error') {
					const props = event.properties as
						| { sessionID?: string; error?: { message?: string } }
						| undefined;
					if (props?.sessionID === sessionID) {
						throw new Error(props.error?.message || 'Agent execution failed');
					}
				}
			}
		} catch (eventError) {
			console.error(`[${agent.archetype}] Event stream error:`, eventError);
			yield {
				type: 'error',
				round,
				archetype: agent.archetype,
				data: {
					archetype: agent.archetype,
					agentName: agent.name,
					error: eventError instanceof Error ? eventError.message : 'Event stream failed'
				}
			};
			return {
				archetype: agent.archetype,
				agentName: agent.name,
				output: accumulatedOutput || 'Agent failed to respond',
				model: { providerId: agent.providerId, modelId: agent.modelId },
				usage: { promptTokens, completionTokens }
			};
		}

		try {
			await client.session.delete({ path: { id: sessionID } });
		} catch {
			// Ignore cleanup errors
		}
	} catch (error) {
		console.error(`[CouncilDebate] Agent ${agent.archetype} error:`, error);
		throw error;
	}

	return {
		archetype: agent.archetype,
		agentName: agent.name,
		output: accumulatedOutput,
		model: { providerId: agent.providerId, modelId: agent.modelId },
		usage: { promptTokens, completionTokens }
	};
}

// ─── Synthesizer ─────────────────────────────────────────────────────────────

/**
 * Run the synthesizer to produce structured conclusion.
 */
export async function* runSynthesizer(
	rounds: DebateRoundResult[],
	topic: string
): AsyncGenerator<DebateEvent, DebateSynthesis, unknown> {
	let accumulatedOutput = '';

	yield {
		type: 'synthesis_start',
		data: { message: 'Synthesizing debate conclusions...' }
	};

	try {
		const client = await getOpencodeClient();

		const judgeDefaults = await db
			.select()
			.from(functionDefaults)
			.where(eq(functionDefaults.functionType, 'judge' as FunctionType))
			.limit(1);

		const modelIdValue = judgeDefaults[0]?.modelId || 'zai-coding-plan/glm-5';
		const { providerId, modelId } = parseModelId(modelIdValue);

		const eventSubscription = await client.event.subscribe();
		const eventStream = eventSubscription.stream as AsyncIterable<{
			type: string;
			properties?: Record<string, unknown>;
		}>;

		const createResult = await client.session.create();
		if (createResult.error) {
			throw new Error('Failed to create session');
		}
		const session = createResult.data as Session;
		const sessionID = session.id;

		const synthesisPrompt = buildSynthesisPrompt(topic, rounds);

		await client.session.promptAsync({
			path: { id: sessionID },
			body: {
				parts: [{ type: 'text', text: synthesisPrompt }],
				model: {
					providerID: providerId,
					modelID: modelId
				}
			}
		});

		for await (const event of eventStream) {
			if (event.type === 'message.part.updated') {
				const props = event.properties as
					| {
							part?: { sessionID?: string; type?: string };
							delta?: string;
					  }
					| undefined;
				if (props?.part?.sessionID === sessionID && props?.delta) {
					accumulatedOutput += props.delta;
					yield {
						type: 'synthesis_delta',
						data: { delta: props.delta, accumulated: accumulatedOutput }
					};
				}
			}

			if (event.type === 'session.status') {
				const props = event.properties as
					| { sessionID?: string; status?: { type?: string } }
					| undefined;
				if (props?.sessionID === sessionID && props?.status?.type === 'idle') {
					break;
				}
			}

			if (event.type === 'session.idle') {
				const props = event.properties as { sessionID?: string } | undefined;
				if (props?.sessionID === sessionID) {
					break;
				}
			}

			if (event.type === 'session.error') {
				const props = event.properties as
					| { sessionID?: string; error?: { message?: string } }
					| undefined;
				if (props?.sessionID === sessionID) {
					throw new Error(props.error?.message || 'Synthesis execution failed');
				}
			}
		}

		try {
			await client.session.delete({ path: { id: sessionID } });
		} catch {
			// Ignore cleanup errors
		}
	} catch (error) {
		console.error('[CouncilDebate] Synthesizer error:', error);
		throw error;
	}

	const synthesis = parseSynthesisJson(accumulatedOutput);

	if (!synthesis) {
		throw new Error('Failed to parse synthesis output');
	}

	return synthesis;
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

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
 */
export async function* executeCouncilDebate(options: {
	promptId: number;
	topic: string;
	agentOverrides?: Map<DebateArchetype, AgentOverride>;
}): AsyncGenerator<DebateEvent, DebateRun, unknown> {
	const { promptId, topic, agentOverrides } = options;

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

	yield {
		type: 'debate_start',
		data: {
			topic,
			maxRounds: MAX_ROUNDS,
			agents: ['proponent', 'skeptic', 'pragmatist']
		}
	};

	const agents = await loadDebateAgents(agentOverrides);
	const rounds: DebateRoundResult[] = [];

	for (let roundNum = 1; roundNum <= MAX_ROUNDS; roundNum++) {
		const stateValue = `debating_round_${roundNum}` as DebateState;
		await updateDebateRun(runId, { state: stateValue, currentRound: roundNum });

		yield {
			type: 'round_start',
			round: roundNum,
			data: { round: roundNum }
		};

		const context = buildDebateContextForRound(topic, rounds, roundNum);

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

		while (pendingGenerators.size > 0) {
			for (const [archetype, entry] of pendingGenerators) {
				if (entry.done) continue;

				try {
					const result = await entry.generator.next();

					if (result.done) {
						const agentResult = result.value;
						roundResults.push(agentResult);
						entry.done = true;

						yield {
							type: 'agent_complete',
							round: roundNum,
							archetype,
							data: agentResult
						};
					} else {
						yield result.value;
					}
				} catch (error) {
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

			for (const [archetype, entry] of pendingGenerators) {
				if (entry.done) {
					pendingGenerators.delete(archetype);
				}
			}
		}

		const roundResult: DebateRoundResult = {
			round: roundNum,
			agentResults: roundResults
		};
		rounds.push(roundResult);

		await updateDebateRun(runId, { steps: rounds });

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
		synthesis = {
			summary: 'Synthesis failed to complete.',
			keyArgumentsFor: [],
			keyArgumentsAgainst: [],
			pointsOfAgreement: [],
			finalRecommendation: 'Review individual round outputs for insights.',
			consensusLevel: 'Mixed views'
		};
	}

	await updateDebateRun(runId, {
		state: 'complete',
		steps: rounds,
		finalOutput: JSON.stringify(synthesis)
	});

	yield {
		type: 'debate_complete',
		data: {
			rounds,
			synthesis
		}
	};

	const runRecord = await db.select().from(councilRuns).where(eq(councilRuns.id, runId)).limit(1);

	if (runRecord.length === 0) {
		throw new Error('Debate run record not found');
	}

	const dbRun = runRecord[0];

	let parsedRounds: DebateRoundResult[] = [];
	try {
		parsedRounds = dbRun.steps ? JSON.parse(dbRun.steps) : [];
	} catch {
		console.warn('[CouncilDebate] Failed to parse rounds JSON');
	}

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

/**
 * Backward-compatible alias for {@link executeCouncilDebate}.
 */
export { executeCouncilDebate as executeDebate };
