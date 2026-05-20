/**
 * Unified SSE handler template — eliminates duplicated SSE boilerplate.
 *
 * Every SSE endpoint duplicated:
 *   authenticate → parse JSON → validate → produce() → iterate generator →
 *   emit events → check disconnect → detect terminal → catch errors → lock.set(false)
 *
 * Usage:
 *   export const POST = createSSEHandler({
 *     schema: myZodSchema,
 *     createGenerator: (data) => myService.stream(data),
 *     isTerminal: (e) => e.type === 'complete' || e.type === 'error'
 *   });
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler, RequestEvent } from '@sveltejs/kit';
import type { ZodSchema } from 'zod';
import { produce } from 'sveltekit-sse';
import { authenticateRequest } from '$lib/server/auth.helper';

/** Minimal shape for events yielded by generators */
export interface SSEEvent {
	type: string;
}

export interface SSEHandlerOptions<TValidated, TEvent extends SSEEvent = SSEEvent> {
	/** Zod schema for request body validation */
	schema: ZodSchema<TValidated>;
	/** Create an async generator from validated data */
	createGenerator: (
		validated: TValidated,
		event: RequestEvent
	) => AsyncGenerator<TEvent> | AsyncIterable<TEvent>;
	/** Map event to SSE event name. Default: event.type */
	eventNameMap?: (event: TEvent) => string;
	/** Detect terminal events that close the stream. Default: type ends with 'complete' or is 'error' */
	isTerminal?: (event: TEvent) => boolean;
	/** Called on client disconnect */
	onStop?: () => Promise<void> | void;
	/** Heartbeat interval in ms. Default: 15000 */
	pingMs?: number;
	/** Require auth. Default: true */
	requireAuth?: boolean;
	/** Additional params to extract before validation (e.g. URL path params) */
	extractParams?: (event: RequestEvent) => Record<string, unknown>;
}

function defaultIsTerminal(event: SSEEvent): boolean {
	const t = event.type;
	return t === 'error' || t.endsWith('_complete') || t === 'complete';
}

/**
 * Create a POST handler for SSE streaming endpoints.
 * Handles auth, validation, SSE setup, generator iteration, and error handling.
 */
export function createSSEHandler<TValidated, TEvent extends SSEEvent = SSEEvent>(
	options: SSEHandlerOptions<TValidated, TEvent>
): RequestHandler {
	return async (event) => {
		// Auth
		if (options.requireAuth !== false) {
			authenticateRequest(event);
		}

		// Parse + validate body
		let body: unknown;
		try {
			body = await event.request.json();
		} catch {
			throw error(
				400,
				JSON.stringify({
					success: false,
					error: { code: 'INVALID_JSON', message: 'Invalid JSON body' }
				})
			);
		}

		// Merge extracted params into body for validation
		const mergedBody = options.extractParams
			? { ...(body as Record<string, unknown>), ...options.extractParams(event) }
			: body;

		const result = options.schema.safeParse(mergedBody);
		if (!result.success) {
			const details = result.error.issues.reduce(
				(acc: Record<string, string>, err) => {
					acc[err.path.join('.')] = err.message;
					return acc;
				},
				{} as Record<string, string>
			);

			throw error(
				400,
				JSON.stringify({
					success: false,
					error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details }
				})
			);
		}

		const validated = result.data;
		const isTerminal = options.isTerminal ?? ((e: TEvent) => defaultIsTerminal(e));
		const eventNameMap = options.eventNameMap ?? ((e: TEvent) => e.type);

		return produce(
			async function start({ emit, lock }) {
				try {
					const generator = options.createGenerator(validated, event);

					for await (const sseEvent of generator) {
						const name = eventNameMap(sseEvent);
						const emitResult = emit(name, JSON.stringify(sseEvent));

						if (emitResult.error) {
							lock.set(false);
							return;
						}

						if (isTerminal(sseEvent)) {
							lock.set(false);
							return;
						}
					}
				} catch (err) {
					emit(
						'error',
						JSON.stringify({
							type: 'error',
							data: {
								message: err instanceof Error ? err.message : 'Stream failed',
								code: 'STREAM_ERROR'
							}
						})
					);
					lock.set(false);
				}
			},
			{
				ping: options.pingMs ?? 15000,
				...(options.onStop ? { stop() { options.onStop!(); } } : {})
			}
		);
	};
}
