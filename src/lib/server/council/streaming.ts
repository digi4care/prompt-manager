/**
 * Shared streaming utilities for council modes
 */
import type { CouncilEvent, CouncilEventType } from './types';

/**
 * Create a council event with timestamp
 */
export function createCouncilEvent(
	type: CouncilEventType,
	data: Record<string, unknown> = {}
): CouncilEvent {
	return {
		type,
		data,
		timestamp: Date.now()
	};
}

/**
 * Convert a ReadableStream to an async generator of strings
 * Used for SSE-style streaming from OpenCode
 */
export async function* streamToAsyncGenerator(
	stream: ReadableStream<Uint8Array>
): AsyncGenerator<string, void, unknown> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			yield decoder.decode(value, { stream: true });
		}
	} finally {
		reader.releaseLock();
	}
}
