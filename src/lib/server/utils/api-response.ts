/**
 * Standardized API response helpers — eliminates inconsistent response formats.
 *
 * Before: routes used json({data}), json({...snippet}, {status:201}),
 *         json({success:true, data}), json({agents}), throw error(status, JSON.stringify(...))
 *
 * Usage:
 *   return ApiSuccess(payload);
 *   return ApiCreated(newItem);
 *   return ApiPaginated(items, { limit, offset, total });
 *   throw ApiFail('Not found', 404);
 *   throw ApiFail('Validation failed', 400, { field: 'email', message: '...' });
 */
import { json, error } from '@sveltejs/kit';

export interface PaginatedResponse {
	limit: number;
	offset: number;
	total: number;
	hasMore: boolean;
}

/**
 * Successful response with data wrapper.
 */
export function apiSuccess(data: unknown, status = 200) {
	return json({ success: true, data }, { status });
}

/**
 * 201 Created response.
 */
export function apiCreated(data: unknown) {
	return json({ success: true, data }, { status: 201 });
}

/**
 * Paginated list response.
 */
export function apiPaginated(
	data: unknown,
	opts: { limit: number; offset: number; total: number }
) {
	return json({
		success: true,
		data,
		pagination: {
			limit: opts.limit,
			offset: opts.offset,
			total: opts.total,
			hasMore: opts.offset + (Array.isArray(data) ? data.length : 0) < opts.total
		}
	});
}

/**
 * Throw a formatted API error. Never returns — always throws.
 *
 * The error body is JSON-stringified for SvelteKit's error() convention:
 *   { message, errors }
 */
export function apiFail(message: string, status = 400, errors: unknown = null): never {
	throw error(status, JSON.stringify({ message, errors }));
}
