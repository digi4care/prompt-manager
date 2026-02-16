import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getFunctionDefault,
	updateFunctionDefaultByType,
	type FunctionType
} from '$lib/server/services/function-defaults.service';
import { validateFunctionSettingUpdate } from '$lib/validators/function-settings';
import { authenticateWithBetterAuth } from '$lib/server/auth/jwt';

// Valid function types
const VALID_FUNCTION_TYPES: FunctionType[] = ['executor', 'judge', 'improve', 'council'];

/**
 * GET /api/admin/function-defaults/[type]
 * Fetch a single function default by type
 */
export const GET: RequestHandler = async (event) => {
	// Require authentication via Better Auth
	authenticateWithBetterAuth(event);

	const { type } = event.params;

	// Validate function type
	if (!VALID_FUNCTION_TYPES.includes(type as FunctionType)) {
		throw error(
			404,
			JSON.stringify({
				message: `Function type '${type}' not found`,
				errors: { type: 'Invalid function type. Must be one of: executor, judge, improve, council' }
			})
		);
	}

	try {
		const defaultSetting = await getFunctionDefault(type as FunctionType);

		if (!defaultSetting) {
			throw error(
				404,
				JSON.stringify({
					message: `Function default for type '${type}' not found`,
					errors: null
				})
			);
		}

		return json({ data: defaultSetting });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err instanceof Error && err.message.includes('404')) {
			throw err;
		}
		console.error('Failed to fetch function default:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to fetch function default',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};

/**
 * PUT /api/admin/function-defaults/[type]
 * Update a function default by type with validation
 */
export const PUT: RequestHandler = async (event) => {
	// Require authentication via Better Auth
	authenticateWithBetterAuth(event);

	const { type } = event.params;

	// Validate function type
	if (!VALID_FUNCTION_TYPES.includes(type as FunctionType)) {
		throw error(
			404,
			JSON.stringify({
				message: `Function type '${type}' not found`,
				errors: { type: 'Invalid function type. Must be one of: executor, judge, improve, council' }
			})
		);
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	// Validate the update data
	const validation = validateFunctionSettingUpdate(body as Record<string, unknown>);

	if (!validation.success) {
		throw error(
			400,
			JSON.stringify({
				message: 'Validation failed',
				errors: validation.errors
			})
		);
	}

	try {
		// Log the update for audit purposes
		const authUser = event.locals.auth?.user;
		console.log(
			`[AUDIT] User ${authUser?.id || 'unknown'} (${authUser?.email || 'unknown'}) updating function default: ${type}`,
			validation.data
		);

		const updated = await updateFunctionDefaultByType(type as FunctionType, validation.data || {});
		return json({ data: updated });
	} catch (err) {
		console.error('Failed to update function default:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to update function default',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};
