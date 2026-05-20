/**
 * Debate synthesizer execution.
 *
 * Runs the neutral synthesizer via OpenCode SDK after all debate rounds
 * complete. Produces a structured DebateSynthesis from the debate history.
 */

import { db } from '../db/client';
import { functionDefaults } from '../db/schema';
import { getOpencodeClient } from '../services/opencode.service';
import { eq } from 'drizzle-orm';
import type { Session } from '@opencode-ai/sdk';
import type { FunctionType } from '../services/function-defaults.service';
import type { DebateEvent, DebateRoundResult, DebateSynthesis } from './debate-types';
import { buildSynthesisPrompt, parseSynthesisJson } from './debate-prompts';
import { parseModelId } from './agent-loader';

/**
 * Run the synthesizer to produce structured conclusion.
 */
export async function* runSynthesizer(
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

		// Send prompt ASYNC - returns immediately with 204, track completion via events
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

		// Process events (SDK 1.2.15)
		for await (const event of eventStream) {
			// SDK 1.2.15: message.part.updated (NOT message.part.delta)
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

			// Handle session.status (new SDK)
			if (event.type === 'session.status') {
				const props = event.properties as
					| { sessionID?: string; status?: { type?: string } }
					| undefined;
				if (props?.sessionID === sessionID && props?.status?.type === 'idle') {
					break;
				}
			}

			// Handle session.idle (deprecated but still emitted)
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
