/**
 * Council Review Service
 *
 * Implements PARALLEL council review where multiple agents review
 * the SAME user prompt from different perspectives simultaneously.
 *
 * Workflow:
 * 1. Load council agents (with their system prompts and model configs)
 * 2. Run ALL agents IN PARALLEL on the same user prompt
 * 3. Stream results from each agent independently
 * 4. Aggregate all feedback when complete
 */
import { db } from '../db/client';
import { councilAgents, prompts, promptVersions } from '../db/schema';
import { getOpencodeClient } from './opencode.service';
import { eq, asc } from 'drizzle-orm';
import type { Session } from '@opencode-ai/sdk';

/**
 * Council agent configuration
 */
export interface CouncilAgent {
	id: number;
	name: string;
	systemPrompt: string;
	modelId: string;
	providerId: string;
	temperature: number;
	maxTokens: number;
	order: number;
}

/**
 * Result from a single council agent
 */
export interface CouncilAgentResult {
	agentId: number;
	agentName: string;
	output: string;
	model: {
		providerId: string;
		modelId: string;
		displayName: string;
	};
	usage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	duration: {
		ms: number;
		seconds: number;
	};
	status: 'streaming' | 'complete' | 'error';
	error?: string;
}

/**
 * Event types for council review streaming
 */
export type CouncilReviewEventType =
	| 'review_start' // Council review starting
	| 'agent_start' // Individual agent starting
	| 'agent_delta' // Streaming delta from an agent
	| 'agent_complete' // Agent finished
	| 'review_complete' // All agents finished
	| 'error'; // Error occurred

/**
 * Council review event
 */
export interface CouncilReviewEvent {
	type: CouncilReviewEventType;
	agentId?: number;
	agentName?: string;
	data: unknown;
}

/**
 * Default council agent perspectives when none configured
 */
const DEFAULT_AGENTS: CouncilAgent[] = [
	{
		id: 1,
		name: 'Code Quality Reviewer',
		systemPrompt: `You are a code quality expert. Your role is to review prompts that will be used to generate code.

Analyze the prompt for:
- Clarity and specificity
- Edge case handling
- Error handling requirements
- Code organization and structure needs
- Best practices alignment

Provide specific, actionable feedback on how to improve the prompt for better code quality outcomes.

Format your response as:
## Code Quality Assessment
[Your assessment here]

## Suggestions
- [Suggestion 1]
- [Suggestion 2]
- [etc.]`,
		modelId: 'glm-5',
		providerId: 'zai-coding-plan',
		temperature: 0.3,
		maxTokens: 2048,
		order: 1
	},
	{
		id: 2,
		name: 'Security Reviewer',
		systemPrompt: `You are a security expert. Your role is to review prompts that will be used to generate code.

Analyze the prompt for:
- Input validation requirements
- Authentication and authorization needs
- Data protection concerns
- Potential security vulnerabilities
- Secure coding practices

Provide specific, actionable feedback on how to improve the prompt for more secure code generation.

Format your response as:
## Security Assessment
[Your assessment here]

## Security Recommendations
- [Recommendation 1]
- [Recommendation 2]
- [etc.]`,
		modelId: 'glm-5',
		providerId: 'zai-coding-plan',
		temperature: 0.3,
		maxTokens: 2048,
		order: 2
	},
	{
		id: 3,
		name: 'Best Practices Reviewer',
		systemPrompt: `You are a software best practices expert. Your role is to review prompts that will be used to generate code.

Analyze the prompt for:
- Documentation requirements
- Testing needs
- Maintainability concerns
- Performance considerations
- Scalability requirements
- Adherence to language/framework conventions

Provide specific, actionable feedback on how to improve the prompt for code that follows best practices.

Format your response as:
## Best Practices Assessment
[Your assessment here]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
- [etc.]`,
		modelId: 'glm-5',
		providerId: 'zai-coding-plan',
		temperature: 0.3,
		maxTokens: 2048,
		order: 3
	}
];

/**
 * Load council agents from database with linked prompt titles
 * @param overrides - Map of agentId -> promptId to use instead of linked prompt
 */
async function loadCouncilAgents(
	_promptId: number,
	overrides?: Map<number, number>
): Promise<CouncilAgent[]> {
	try {
		// Load council agents from database
		const agents = await db
			.select({
				id: councilAgents.id,
				modelId: councilAgents.modelId,
				providerId: councilAgents.modelProvider,
				temperature: councilAgents.temperature,
				maxTokens: councilAgents.maxTokens,
				order: councilAgents.agentOrder,
				promptLinkId: councilAgents.promptLinkId
			})
			.from(councilAgents)
			.where(eq(councilAgents.parentType, 'function_defaults'))
			.orderBy(asc(councilAgents.agentOrder));

		if (agents.length === 0) {
			console.log('[CouncilReview] No configured agents, using defaults');
			return DEFAULT_AGENTS;
		}

		// Fetch linked prompt titles and content for each agent
		const agentsWithPrompts: CouncilAgent[] = [];

		for (const agent of agents) {
			let name = `Agent ${agent.order}`;
			let systemPrompt = '';

			// Check if there's an override for this agent
			const effectivePromptId = overrides?.get(agent.id) || agent.promptLinkId;

			if (effectivePromptId) {
				// Get the linked prompt's title and latest version content
				const [linkedPrompt] = await db
					.select({ title: prompts.title, latestVersionId: prompts.latestVersionId })
					.from(prompts)
					.where(eq(prompts.id, effectivePromptId))
					.limit(1);

				if (linkedPrompt) {
					name = linkedPrompt.title || name;

					// Get the content from the latest version
					if (linkedPrompt.latestVersionId) {
						const [version] = await db
							.select({ content: promptVersions.content })
							.from(promptVersions)
							.where(eq(promptVersions.id, linkedPrompt.latestVersionId))
							.limit(1);

						if (version) {
							systemPrompt = version.content || '';
						}
					}
				}
			}

			// Parse model ID to get provider and model
			const { providerId, modelId } = parseModelId(agent.modelId);

			agentsWithPrompts.push({
				id: agent.id,
				name,
				systemPrompt,
				modelId,
				providerId: agent.providerId || providerId,
				temperature: agent.temperature,
				maxTokens: agent.maxTokens,
				order: agent.order
			});
		}

		console.log(
			`[CouncilReview] Loaded ${agentsWithPrompts.length} agents:`,
			agentsWithPrompts.map((a) => a.name)
		);
		return agentsWithPrompts;
	} catch (error) {
		console.error('[CouncilReview] Error loading agents:', error);
		return DEFAULT_AGENTS;
	}
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
 * Run a single council agent review
 * Returns an async generator that yields events
 */
async function* runAgentReview(
	agent: CouncilAgent,
	userPrompt: string
): AsyncGenerator<CouncilReviewEvent, CouncilAgentResult, unknown> {
	const startTime = Date.now();
	let accumulatedOutput = '';
	let inputTokens = 0;
	let outputTokens = 0;

	// Yield agent start event
	yield {
		type: 'agent_start',
		agentId: agent.id,
		agentName: agent.name,
		data: { agentName: agent.name }
	};

	try {
		const client = await getOpencodeClient();
		const { providerId, modelId } = parseModelId(agent.modelId);

		// Subscribe to events FIRST
		const eventSubscription = await client.event.subscribe();
		// Use any type for event stream since SDK types are too strict
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

		// Construct the full prompt: system prompt + user prompt
		const fullPrompt = `${agent.systemPrompt}

---

## Prompt to Review:

${userPrompt}

---

## Your Review:`;

		// Send prompt
		const promptPromise = client.session.prompt({
			path: { id: sessionID },
			body: {
				parts: [{ type: 'text', text: fullPrompt }],
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
						type: 'agent_delta',
						agentId: agent.id,
						agentName: agent.name,
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
							inputTokens = promptResult.data.info.tokens.input ?? 0;
							outputTokens = promptResult.data.info.tokens.output ?? 0;
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
		const endTime = Date.now();
		return {
			agentId: agent.id,
			agentName: agent.name,
			output: '',
			model: {
				providerId: agent.providerId,
				modelId: agent.modelId,
				displayName: `${agent.providerId}/${agent.modelId}`
			},
			usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
			duration: { ms: endTime - startTime, seconds: Math.round((endTime - startTime) / 1000) },
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}

	const endTime = Date.now();
	return {
		agentId: agent.id,
		agentName: agent.name,
		output: accumulatedOutput,
		model: {
			providerId: agent.providerId,
			modelId: agent.modelId,
			displayName: `${agent.providerId}/${agent.modelId}`
		},
		usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
		duration: { ms: endTime - startTime, seconds: Math.round((endTime - startTime) / 1000) },
		status: 'complete'
	};
}

/**
 * Execute council review - all agents in parallel
 *
 * @param promptId - The ID of the prompt being reviewed
 * @param userPrompt - The content of the prompt to review
 * @param agentOverrides - Map of agentId -> promptId to use instead of linked prompt
 * @yields CouncilReviewEvent - events from all agents running in parallel
 */
export async function* executeCouncilReview(options: {
	promptId: number;
	userPrompt: string;
	agentOverrides?: Record<number, number>;
}): AsyncGenerator<CouncilReviewEvent, CouncilAgentResult[], unknown> {
	const { promptId, userPrompt, agentOverrides } = options;

	// Convert overrides to Map for easier lookup
	const overridesMap = agentOverrides
		? new Map(Object.entries(agentOverrides).map(([k, v]) => [parseInt(k, 10), v]))
		: undefined;

	// Load agents
	const agents = await loadCouncilAgents(promptId, overridesMap);
	console.log(`[CouncilReview] Loaded ${agents.length} agents for parallel review`);

	// Yield review start event
	yield {
		type: 'review_start',
		data: {
			agentCount: agents.length,
			agents: agents.map((a) => ({ id: a.id, name: a.name }))
		}
	};

	// Track results
	const results: CouncilAgentResult[] = [];
	const pendingGenerators: Map<
		number,
		{
			generator: AsyncGenerator<CouncilReviewEvent, CouncilAgentResult, unknown>;
			agent: CouncilAgent;
			done: boolean;
		}
	> = new Map();

	// Start all agents in parallel
	for (const agent of agents) {
		const generator = runAgentReview(agent, userPrompt);
		pendingGenerators.set(agent.id, { generator, agent, done: false });
	}

	// Process events from all agents round-robin style
	while (pendingGenerators.size > 0) {
		for (const [agentId, entry] of pendingGenerators) {
			if (entry.done) continue;

			try {
				const result = await entry.generator.next();

				if (result.done) {
					// Agent finished - capture result
					const agentResult = result.value;
					results.push(agentResult);
					entry.done = true;

					// Yield agent complete event
					yield {
						type: 'agent_complete',
						agentId: agentId,
						agentName: entry.agent.name,
						data: agentResult
					};
				} else {
					// Yield the event from this agent
					yield result.value;
				}
			} catch (error) {
				// Agent errored
				const errorResult: CouncilAgentResult = {
					agentId: agentId,
					agentName: entry.agent.name,
					output: '',
					model: {
						providerId: entry.agent.providerId,
						modelId: entry.agent.modelId,
						displayName: `${entry.agent.providerId}/${entry.agent.modelId}`
					},
					usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
					duration: { ms: 0, seconds: 0 },
					status: 'error',
					error: error instanceof Error ? error.message : 'Unknown error'
				};
				results.push(errorResult);
				entry.done = true;

				yield {
					type: 'error',
					agentId: agentId,
					agentName: entry.agent.name,
					data: { message: errorResult.error }
				};
			}
		}

		// Remove finished agents
		for (const [agentId, entry] of pendingGenerators) {
			if (entry.done) {
				pendingGenerators.delete(agentId);
			}
		}
	}

	// Yield review complete event
	yield {
		type: 'review_complete',
		data: {
			results: results,
			summary: `Council review complete. ${results.length} agents provided feedback.`
		}
	};

	return results;
}
