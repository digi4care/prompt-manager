import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import { produce } from 'sveltekit-sse';
import {
	executeDebate,
	type DebateArchetype,
	type AgentOverride
} from '$lib/server/services/council-debate.service';
import { authenticateWithBetterAuth } from '$lib/server/auth/jwt';

/**
 * Request validation schema for council debate endpoint
 */
const DebateRequestSchema = z.object({
	promptId: z.number().int().positive(),
	topic: z.string().min(1, 'Topic is required').max(50000, 'Topic too long'),
	agentOverrides: z
		.record(
			z.string(), // Accept any string key, validate archetype in service
			z.object({
				promptId: z.number().int().positive(),
				versionId: z.number().int().positive().optional()
			})
		)
		.optional()
});

/**
 * POST /api/council/debate
 *
 * Execute a structured debate with 3 agents (Proponent, Skeptic, Pragmatist)
 * arguing across 3 rounds, followed by synthesis.
 *
 * Request body:
 * - promptId: The prompt ID (for context/settings)
 * - topic: The topic to debate
 * - agentOverrides: Optional Map<archetype, { promptId, versionId? }> for custom prompts
 *
 * SSE Events:
 * - debate_start - { type, data: { topic, maxRounds, agents } }
 * - round_start - { type, round, data: { round } }
 * - agent_start - { type, round, archetype, data }
 * - agent_delta - { type, round, archetype, data: { delta, accumulated } }
 * - agent_complete - { type, round, archetype, data: DebateAgentResult }
 * - round_complete - { type, round, data: { round, agentCount } }
 * - synthesis_start - { type, data: { message } }
 * - synthesis_delta - { type, data: { delta, accumulated } }
 * - synthesis_complete - { type, data: DebateSynthesis }
 * - debate_complete - { type, data: { rounds, synthesis } }
 * - error - { type, round?, archetype?, data: { message, code? } }
 *
 * Configuration:
 * - Heartbeat ping every 15 seconds to maintain connection
 */
export const POST: RequestHandler = async (event) => {
	// Require authentication
	authenticateWithBetterAuth(event);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid JSON body',
				code: 'INVALID_JSON'
			})
		);
	}

	const validation = DebateRequestSchema.safeParse(body);

	if (!validation.success) {
		const errors = validation.error.issues.reduce(
			(acc: Record<string, string>, err) => {
				const path = err.path.join('.');
				acc[path] = err.message;
				return acc;
			},
			{} as Record<string, string>
		);

		throw error(
			400,
			JSON.stringify({
				message: 'Validation failed',
				code: 'VALIDATION_ERROR',
				errors
			})
		);
	}

	const { promptId, topic, agentOverrides } = validation.data;

	// Convert agentOverrides from record to Map for service
	const overridesMap = agentOverrides
		? new Map<DebateArchetype, AgentOverride>(
				Object.entries(agentOverrides).map(([k, v]) => [k as DebateArchetype, v as AgentOverride])
			)
		: undefined;

	// Create SSE stream using sveltekit-sse produce()
	return produce(
		async function start({ emit, lock }) {
			try {
				// Create the debate generator
				const generator = executeDebate({
					promptId,
					topic,
					agentOverrides: overridesMap
				});

				// Iterate over debate events
				let result = await generator.next();
				while (!result.done) {
					const debateEvent = result.value;

					// Serialize event with full context
					const eventData = {
						type: debateEvent.type,
						round: debateEvent.round,
						archetype: debateEvent.archetype,
						data: debateEvent.data
					};

					// Emit the event with type as event name (so frontend can select() by type)
					const emitResult = emit(debateEvent.type, JSON.stringify(eventData));

					// Check for emit errors (client disconnected)
					if (emitResult.error) {
						console.log('[CouncilDebate] Emit error, client likely disconnected');
						lock.set(false);
						return;
					}

					// If debate_complete or error, close the connection
					if (debateEvent.type === 'debate_complete' || debateEvent.type === 'error') {
						console.log('[CouncilDebate] Debate complete:', debateEvent.type);
						lock.set(false);
						return;
					}

					// Get next event
					result = await generator.next();
				}

				// Generator completed (should have been handled by debate_complete event)
				console.log('[CouncilDebate] Generator finished');
			} catch (err) {
				console.error('[CouncilDebate] Streaming error:', err);

				// Emit error event
				emit(
					'message',
					JSON.stringify({
						type: 'error',
						data: {
							message: err instanceof Error ? err.message : 'Debate execution failed',
							code: 'DEBATE_ERROR'
						}
					})
				);

				lock.set(false);
			}
		},
		{
			// Heartbeat every 15 seconds to keep connection alive
			ping: 15000
		}
	);
};
