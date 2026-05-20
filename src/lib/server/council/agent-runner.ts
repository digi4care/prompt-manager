/**
 * Single debate agent execution.
 *
 * Runs one agent via OpenCode SDK, yielding streaming events.
 * Handles session lifecycle, event filtering by sessionID,
 * and timeout protection.
 */

import { getOpencodeClient } from '../services/opencode.service';
import type { Session } from '@opencode-ai/sdk';
import type { DebateAgentConfig, DebateEvent, DebateAgentResult } from './debate-types';

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

		// Send prompt ASYNC - returns immediately with 204, track completion via events
		// This prevents HeadersTimeoutError from long-running connections
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

		// Process events (with 120s max implicit timeout from HeadersTimeoutError)
		try {
			console.log(`[${agent.archetype}] Starting event processing for session ${sessionID}`);
			let eventCount = 0;
			let lastPartTextLength = 0; // Track incremental text position

			for await (const event of eventStream) {
				eventCount++;

				// VERBOSE DEBUG: Log full event structure for first 10 events
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

				// SDK 1.2.15: message.part.updated (contains full part.text, not delta)
				if (event.type === 'message.part.updated') {
					const props = event.properties as Record<string, unknown> | undefined;
					const partObj = props?.part as Record<string, unknown> | undefined;
					const partSessionID = partObj?.sessionID || props?.sessionID || null;

					// Only process events for OUR session (prevent cross-talk)
					if (partSessionID !== sessionID) {
						console.log(
							`[${agent.archetype}] Skipping event - sessionID mismatch: ${partSessionID} !== ${sessionID}`
						);
						continue;
					}

					// Get full text from part.text
					const fullText = typeof partObj?.text === 'string' ? partObj.text : null;

					if (fullText && fullText.length > lastPartTextLength) {
						// Calculate incremental delta (only new characters)
						const delta = fullText.substring(lastPartTextLength);
						lastPartTextLength = fullText.length;
						accumulatedOutput = fullText; // Use full text as accumulated

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
						// Fallback: use explicit delta if provided
						accumulatedOutput += props.delta;
						yield {
							type: 'agent_delta',
							round,
							archetype: agent.archetype,
							data: { delta: props.delta, accumulated: accumulatedOutput }
						};
					}
				}

				// SDK 1.2.15: message.part.delta (incremental AI content - THIS IS THE ONE!)
				if (event.type === 'message.part.delta') {
					const props = event.properties as
						| { sessionID?: string; delta?: string; part?: { sessionID?: string } }
						| undefined;
					const deltaSessionID = props?.sessionID || props?.part?.sessionID || null;

					// Only process events for OUR session (prevent cross-talk)
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

				// Handle session.status (new SDK uses this instead of session.idle)
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

				// Handle session.idle (deprecated but still emitted)
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
