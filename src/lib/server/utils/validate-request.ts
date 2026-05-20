/**
 * Request validation utility — eliminates JSON-parse + Zod boilerplate.
 *
 * Every route handler repeated:
 *   let data; try { data = await request.json() } catch { throw error(400, ...) }
 *   const parsed = schema.safeParse(data);
 *   if (!parsed.success) { throw error(400, ...) }
 *
 * Usage:
 *   const data = await validateRequest(event, myZodSchema);
 *   // data is fully typed
 */
import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { ZodSchema } from 'zod';

export interface ValidationError {
	message: string;
	errors: unknown;
}

/**
 * Parse JSON body and validate against a Zod schema.
 * Throws SvelteKit error(400) on parse failure or validation failure.
 */
export async function validateRequest<T>(
	event: RequestEvent,
	schema: ZodSchema<T>
): Promise<T> {
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid JSON body',
				errors: null
			})
		);
	}

	const result = schema.safeParse(body);
	if (!result.success) {
		throw error(
			400,
			JSON.stringify({
				message: 'Validation failed',
				errors: result.error.flatten()
			})
		);
	}

	return result.data;
}

/**
 * Parse JSON body without Zod validation.
 * Useful for routes that need raw JSON but still want consistent parse-error handling.
 */
export async function parseJsonBody(event: RequestEvent): Promise<unknown> {
	try {
		return await event.request.json();
	} catch {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid JSON body',
				errors: null
			})
		);
	}
}

/**
 * Parse JSON body with a fallback value on parse failure.
 * Useful for routes that accept optional bodies (e.g. POST with defaults).
 */
export async function parseJsonBodyOrDefault<T>(
	event: RequestEvent,
	defaultValue: T
): Promise<T> {
	try {
		return (await event.request.json()) as T;
	} catch {
		return defaultValue;
	}
}
