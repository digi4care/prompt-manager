/**
 * Council Debate Service
 *
 * Implements structured multi-perspective debate with 3 agents
 * (Proponent, Skeptic, Pragmatist) arguing across 3 rounds,
 * followed by a neutral synthesizer producing a structured conclusion.
 *
 * Workflow:
 * 1. Run ALL 3 agents IN PARALLEL on the same topic
 * 2. Accumulate context across 3 rounds
 * 3. After Round 3, run synthesizer to produce structured conclusion
 */
import { db } from '../db/client';
import { councilRuns, prompts, promptVersions, functionDefaults } from '../db/schema';
import { getOpencodeClient } from './opencode.service';
import { eq } from 'drizzle-orm';
import type { Session } from '@opencode-ai/sdk';
import type { FunctionType } from './function-defaults.service';

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
 * Default archetype system prompts (LOCKED per user decision)
 */
const ARCHETYPE_PROMPTS: Record<DebateArchetype, string> = {
	proponent: `You are the Proponent in a structured debate. Your role is to argue IN FAVOR of the topic.

Guidelines:
- Present strong arguments supporting the proposal
- Highlight benefits, opportunities, and positive outcomes
- Use evidence and logical reasoning
- Acknowledge counterarguments but explain why your position is stronger
- Be persuasive but intellectually honest

Format your arguments clearly with supporting points.`,

	skeptic: `You are the Skeptic in a structured debate. Your role is to argue AGAINST the topic.

Guidelines:
- Challenge assumptions and premises
- Surface risks, drawbacks, and potential negative outcomes
- Play devil's advocate to ensure all concerns are considered
- Use evidence and logical reasoning
- Be critical but fair - acknowledge valid points from the other side

Format your arguments clearly with specific concerns.`,

	pragmatist: `You are the Pragmatist in a structured debate. Your role is to balance both perspectives.

Guidelines:
- Evaluate both pros and cons objectively
- Focus on practical feasibility and real-world constraints
- Identify tradeoffs and conditions for success
- Seek middle ground where possible
- Consider implementation challenges and mitigation strategies

Format your arguments with balanced analysis.`
};

/**
 * Agent override configuration for customizing debate agents
 */
export interface AgentOverride {
	promptId: number;
	versionId?: number;
}

/**
 * Parse model ID to extract provider and model
 */
function parseModelId(modelIdValue: string): { providerId: string; modelId: string } {
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
 * Build debate context for a specific round
 * Includes topic and all previous round arguments
 */
function buildDebateContextForRound(
	topic: string,
	previousRounds: DebateRoundResult[],
	currentRound: number
): string {
	let context = `## Debate Topic

${topic}

`;

	if (previousRounds.length > 0) {
		context += `## Previous Rounds

`;
		for (const round of previousRounds) {
			context += `### Round ${round.round}

`;
			for (const result of round.agentResults) {
				context += `**${result.agentName} (${result.archetype}):**

${result.output}

`;
			}
		}
		context += `---

## Round ${currentRound}

This is Round ${currentRound} of 3. Consider the arguments above and strengthen your position.
`;
	} else {
		context += `## Round ${currentRound}

This is Round 1 of 3. Present your opening arguments.
`;
	}

	return context;
}

/**
 * Build synthesizer prompt with all debate history
 */
function buildSynthesisPrompt(topic: string, rounds: DebateRoundResult[]): string {
	let prompt = `You are a neutral synthesizer analyzing a structured debate. Your role is to produce an objective synthesis.

## Debate Topic

${topic}

## Debate History

`;

	for (const round of rounds) {
		prompt += `### Round ${round.round}

`;
		for (const result of round.agentResults) {
			prompt += `**${result.agentName} (${result.archetype}):**

${result.output}

`;
		}
	}

	prompt += `---

## Synthesis Instructions

Analyze the debate above and produce a JSON synthesis in this EXACT format:

{
  "summary": "A 2-3 sentence overview of the debate",
  "keyArgumentsFor": ["argument 1", "argument 2", "argument 3"],
  "keyArgumentsAgainst": ["argument 1", "argument 2", "argument 3"],
  "pointsOfAgreement": ["point 1", "point 2"],
  "finalRecommendation": "A clear, actionable recommendation",
  "consensusLevel": "Strong consensus" | "Moderate consensus" | "Mixed views"
}

Rules:
- Provide exactly 3 key arguments for and 3 against (or fewer if not enough distinct points)
- Identify genuine points where all perspectives agreed
- The final recommendation should be practical and balanced
- Set consensusLevel based on how much agreement existed across perspectives
- Respond ONLY with valid JSON, no other text`;

	return prompt;
}

/**
 * Parse synthesis JSON from LLM output
 * Uses multiple strategies to handle output variations
 */
function parseSynthesisJson(content: string): DebateSynthesis | null {
	// Default synthesis if parsing fails
	const defaultSynthesis: DebateSynthesis = {
		summary: 'Unable to parse structured synthesis from debate.',
		keyArgumentsFor: [],
		keyArgumentsAgainst: [],
		pointsOfAgreement: [],
		finalRecommendation: 'Review the debate history for insights.',
		consensusLevel: 'Mixed views'
	};

	try {
		// Try to find JSON object in the content
		const jsonMatch = content.match(/\{[\s\S]*"summary"[\s\S]*"consensusLevel"[\s\S]*\}/);
		if (!jsonMatch) {
			console.warn('[CouncilDebate] No JSON found in synthesis output');
			return defaultSynthesis;
		}

		const parsed = JSON.parse(jsonMatch[0]);

		// Validate required fields
		if (typeof parsed.summary !== 'string') {
			console.warn('[CouncilDebate] Invalid summary in synthesis output');
			return defaultSynthesis;
		}

		return {
			summary: parsed.summary || defaultSynthesis.summary,
			keyArgumentsFor: Array.isArray(parsed.keyArgumentsFor)
				? parsed.keyArgumentsFor.filter((a: unknown) => typeof a === 'string')
				: [],
			keyArgumentsAgainst: Array.isArray(parsed.keyArgumentsAgainst)
				? parsed.keyArgumentsAgainst.filter((a: unknown) => typeof a === 'string')
				: [],
			pointsOfAgreement: Array.isArray(parsed.pointsOfAgreement)
				? parsed.pointsOfAgreement.filter((p: unknown) => typeof p === 'string')
				: [],
			finalRecommendation: parsed.finalRecommendation || defaultSynthesis.finalRecommendation,
			consensusLevel: ['Strong consensus', 'Moderate consensus', 'Mixed views'].includes(
				parsed.consensusLevel
			)
				? parsed.consensusLevel
				: 'Mixed views'
		};
	} catch (error) {
		console.warn('[CouncilDebate] Failed to parse synthesis output:', error);
		return defaultSynthesis;
	}
}

/**
 * Load debate agent configurations
 * Uses default archetypes unless overrides are provided
 */
async function loadDebateAgents(
	overrides?: Map<DebateArchetype, AgentOverride>
): Promise<DebateAgentConfig[]> {
	const archetypes: DebateArchetype[] = ['proponent', 'skeptic', 'pragmatist'];
	const agents: DebateAgentConfig[] = [];

	for (let i = 0; i < archetypes.length; i++) {
		const archetype = archetypes[i];
		let systemPrompt = ARCHETYPE_PROMPTS[archetype];
		let name = archetype.charAt(0).toUpperCase() + archetype.slice(1);

		// Check for override
		const override = overrides?.get(archetype);
		if (override?.promptId) {
			// Load custom prompt content
			const [linkedPrompt] = await db
				.select({ title: prompts.title, latestVersionId: prompts.latestVersionId })
				.from(prompts)
				.where(eq(prompts.id, override.promptId))
				.limit(1);

			if (linkedPrompt) {
				name = linkedPrompt.title || name;

				const versionIdToUse = override.versionId || linkedPrompt.latestVersionId;
				if (versionIdToUse) {
					const [version] = await db
						.select({ content: promptVersions.content })
						.from(promptVersions)
						.where(eq(promptVersions.id, versionIdToUse))
						.limit(1);

					if (version?.content) {
						systemPrompt = version.content;
					}
				}
			}
		}

		// Get model from 'judge' function defaults for synthesizer-like behavior
		const judgeDefaults = await db
			.select()
			.from(functionDefaults)
			.where(eq(functionDefaults.functionType, 'judge' as FunctionType))
			.limit(1);

		const modelIdValue = judgeDefaults[0]?.modelId || 'zai-coding-plan/glm-5';
		const { providerId, modelId } = parseModelId(modelIdValue);

		agents.push({
			id: i + 1,
			archetype,
			name,
			systemPrompt,
			modelId,
			providerId
		});
	}

	console.log(
		'[CouncilDebate] Loaded debate agents:',
		agents.map((a) => a.name)
	);
	return agents;
}

/**
 * Run a single debate agent
 * Returns an async generator that yields events
 */
async function* runDebateAgent(
	agent: DebateAgentConfig,
	context: string,
	round: number
): AsyncGenerator<DebateEvent, DebateAgentResult, unknown> {
	let accumulatedOutput = '';
	let promptTokens = 0;
	let completionTokens = 0;

	// Yield agent start event
	yield {
		type: 'agent_start',
		round,
		archetype: agent.archetype,
		data: { archetype: agent.archetype, agentName: agent.name }
	};

	try {
		const client = await getOpencodeClient();

		// Subscribe to events FIRST (with timeout protection)
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const eventStream = eventSubscription.stream as AsyncIterable<{
			type: string;
			properties?: Record<string, unknown>;
		}>;

		// Create session (with timeout protection)
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

		// Construct full prompt
		const fullPrompt = `${agent.systemPrompt}

---

${context}

---

## Your Response:`;

		// Send prompt
		const promptPromise = client.session.prompt({
			path: { id: sessionID },
			body: {
				parts: [{ type: 'text', text: fullPrompt }],
				model: {
					providerID: agent.providerId,
					modelID: agent.modelId
				}
			}
		});

		// Process events
		for await (const event of eventStream) {
			if (event.type === 'message.part.delta') {
				const props = event.properties as { sessionID?: string; delta?: string } | undefined;
				if (props?.sessionID === sessionID && props?.delta) {
					accumulatedOutput += props.delta;
					yield {
						type: 'agent_delta',
						round,
						archetype: agent.archetype,
						data: { delta: props.delta, accumulated: accumulatedOutput }
					};
				}
			}

			if (event.type === 'session.idle') {
				const props = event.properties as { sessionID?: string } | undefined;
				if (props?.sessionID === sessionID) {
					try {
						const promptResult = await promptPromise;
						if (promptResult.data?.info?.tokens) {
							promptTokens = promptResult.data.info.tokens.input ?? 0;
							completionTokens = promptResult.data.info.tokens.output ?? 0;
						}
					} catch {
						// Continue without usage info
					}
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

		// Cleanup session
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

/**
 * Run the synthesizer to produce structured conclusion
 */
async function* runSynthesizer(
	rounds: DebateRoundResult[],
	topic: string
): AsyncGenerator<DebateEvent, DebateSynthesis, unknown> {
	let accumulatedOutput = '';

	// Yield synthesis start event
	yield {
		type: 'synthesis_start',
		data: { message: 'Synthesizing debate conclusions...' }
	};

	try {
		const client = await getOpencodeClient();

		// Get model from 'judge' function defaults
		const judgeDefaults = await db
			.select()
			.from(functionDefaults)
			.where(eq(functionDefaults.functionType, 'judge' as FunctionType))
			.limit(1);

		const modelIdValue = judgeDefaults[0]?.modelId || 'zai-coding-plan/glm-5';
		const { providerId, modelId } = parseModelId(modelIdValue);

		// Subscribe to events FIRST
		const eventSubscription = await client.event.subscribe();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const eventStream = eventSubscription.stream as AsyncIterable<{
			type: string;
			properties?: Record<string, unknown>;
		}>;

		// Create session
		const createResult = await client.session.create();
		if (createResult.error) {
			throw new Error('Failed to create session');
		}
		const session = createResult.data as Session;
		const sessionID = session.id;

		// Build synthesis prompt
		const synthesisPrompt = buildSynthesisPrompt(topic, rounds);

		// Send prompt
		const promptPromise = client.session.prompt({
			path: { id: sessionID },
			body: {
				parts: [{ type: 'text', text: synthesisPrompt }],
				model: {
					providerID: providerId,
					modelID: modelId
				}
			}
		});

		// Process events
		for await (const event of eventStream) {
			if (event.type === 'message.part.delta') {
				const props = event.properties as { sessionID?: string; delta?: string } | undefined;
				if (props?.sessionID === sessionID && props?.delta) {
					accumulatedOutput += props.delta;
					yield {
						type: 'synthesis_delta',
						data: { delta: props.delta, accumulated: accumulatedOutput }
					};
				}
			}

			if (event.type === 'session.idle') {
				const props = event.properties as { sessionID?: string } | undefined;
				if (props?.sessionID === sessionID) {
					await promptPromise; // Ensure prompt completed
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

		// Cleanup session
		try {
			await client.session.delete({ path: { id: sessionID } });
		} catch {
			// Ignore cleanup errors
		}
	} catch (error) {
		console.error('[CouncilDebate] Synthesizer error:', error);
		throw error;
	}

	// Parse synthesis JSON
	const synthesis = parseSynthesisJson(accumulatedOutput);

	if (!synthesis) {
		throw new Error('Failed to parse synthesis output');
	}

	return synthesis;
}

/**
 * Create a new debate run record in the database
 */
async function createDebateRun(promptId: number, topicContent: string): Promise<number> {
	const result = await db
		.insert(councilRuns)
		.values({
			promptId,
			inputContent: topicContent,
			currentRound: 1,
			maxRounds: 3,
			state: 'idle',
			steps: '[]', // Empty JSON array (stores rounds)
			finalOutput: null
		})
		.returning({ id: councilRuns.id });

	return result[0].id;
}

/**
 * Update debate run state in database
 */
async function updateDebateRun(
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

	// Serialize rounds to JSON in steps column
	if (updates.steps !== undefined) {
		updateData.steps = JSON.stringify(updates.steps);
	}

	await db.update(councilRuns).set(updateData).where(eq(councilRuns.id, runId));
}

/**
 * Execute a structured debate with 3 agents across 3 rounds plus synthesis
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
