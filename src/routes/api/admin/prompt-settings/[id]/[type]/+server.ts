import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getPromptFunctionSettings,
	upsertPromptFunctionSettings,
	deletePromptFunctionSettings,
	type UpdatePromptFunctionSetting
} from '$lib/server/services/settings-cascade.service';
import { type FunctionType } from '$lib/server/services/function-defaults.service';
import { validateFunctionField, validateModelId } from '$lib/validators/function-settings';
import { authenticateRequest } from '$lib/server/auth/jwt';
import { db } from '$lib/server/db/client';
import { prompts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Valid function types
const VALID_FUNCTION_TYPES: FunctionType[] = ['executor', 'judge', 'improve', 'council'];

/**
 * Validate prompt exists
 */
async function validatePromptExists(promptId: number): Promise<boolean> {
	const result = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
	return result.length > 0;
}

/**
 * GET /api/admin/prompt-settings/[id]/[type]
 * Get prompt-specific function settings override
 */
export const GET: RequestHandler = async (event) => {
	// Require authentication
	authenticateRequest(event);

	const { id, type } = event.params;
	const promptId = parseInt(id, 10);

	// Validate prompt ID
	if (isNaN(promptId)) {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid prompt ID',
				errors: { id: 'Must be a valid integer' }
			})
		);
	}

	// Validate function type
	if (!VALID_FUNCTION_TYPES.includes(type as FunctionType)) {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid function type',
				errors: { type: 'Must be one of: executor, judge, improve, council' }
			})
		);
	}

	// Validate prompt exists
	const promptExists = await validatePromptExists(promptId);
	if (!promptExists) {
		throw error(
			404,
			JSON.stringify({
				message: 'Prompt not found',
				errors: null
			})
		);
	}

	try {
		const settings = await getPromptFunctionSettings(promptId, type as FunctionType);
		return json({ data: settings });
	} catch (err) {
		console.error('Failed to get prompt function settings:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to get prompt function settings',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};

/**
 * PUT /api/admin/prompt-settings/[id]/[type]
 * Create or update prompt-specific function settings override
 */
export const PUT: RequestHandler = async (event) => {
	// Require authentication
	const user = authenticateRequest(event);

	const { id, type } = event.params;
	const promptId = parseInt(id, 10);

	// Validate prompt ID
	if (isNaN(promptId)) {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid prompt ID',
				errors: { id: 'Must be a valid integer' }
			})
		);
	}

	// Validate function type
	if (!VALID_FUNCTION_TYPES.includes(type as FunctionType)) {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid function type',
				errors: { type: 'Must be one of: executor, judge, improve, council' }
			})
		);
	}

	// Validate prompt exists
	const promptExists = await validatePromptExists(promptId);
	if (!promptExists) {
		throw error(
			404,
			JSON.stringify({
				message: 'Prompt not found',
				errors: null
			})
		);
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	// Type guard for body
	const data = body as Record<string, unknown>;
	const errors: Record<string, string> = {};

	// Validate optional fields
	const updateData: UpdatePromptFunctionSetting = {};

	if (data.modelOverride !== undefined && data.modelOverride !== null) {
		const modelError = validateModelId(data.modelOverride as string);
		if (modelError) {
			errors.modelOverride = modelError;
		} else {
			updateData.modelOverride = data.modelOverride as string;
		}
	}

	if (data.temperature !== undefined && data.temperature !== null) {
		const tempError = validateFunctionField('temperature', data.temperature);
		if (tempError) {
			errors.temperature = tempError;
		} else {
			updateData.temperature = data.temperature as number;
		}
	}

	if (data.maxTokens !== undefined && data.maxTokens !== null) {
		const tokensError = validateFunctionField('maxTokens', data.maxTokens);
		if (tokensError) {
			errors.maxTokens = tokensError;
		} else {
			updateData.maxTokens = data.maxTokens as number;
		}
	}

	if (data.promptLinkId !== undefined && data.promptLinkId !== null) {
		if (typeof data.promptLinkId !== 'number' || !Number.isInteger(data.promptLinkId)) {
			errors.promptLinkId = 'Must be a valid integer';
		} else {
			updateData.promptLinkId = data.promptLinkId;
		}
	}

	// Return validation errors
	if (Object.keys(errors).length > 0) {
		throw error(
			400,
			JSON.stringify({
				message: 'Validation failed',
				errors
			})
		);
	}

	try {
		// Log the update for audit purposes
		console.log(
			`[AUDIT] User ${user.userId} (${user.email}) updating prompt function settings: prompt=${promptId}, type=${type}`,
			updateData
		);

		const settings = await upsertPromptFunctionSettings(promptId, type as FunctionType, updateData);
		return json({ data: settings });
	} catch (err) {
		console.error('Failed to upsert prompt function settings:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to update prompt function settings',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};

/**
 * DELETE /api/admin/prompt-settings/[id]/[type]
 * Remove prompt-specific function settings override
 */
export const DELETE: RequestHandler = async (event) => {
	// Require authentication
	const user = authenticateRequest(event);

	const { id, type } = event.params;
	const promptId = parseInt(id, 10);

	// Validate prompt ID
	if (isNaN(promptId)) {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid prompt ID',
				errors: { id: 'Must be a valid integer' }
			})
		);
	}

	// Validate function type
	if (!VALID_FUNCTION_TYPES.includes(type as FunctionType)) {
		throw error(
			400,
			JSON.stringify({
				message: 'Invalid function type',
				errors: { type: 'Must be one of: executor, judge, improve, council' }
			})
		);
	}

	// Validate prompt exists
	const promptExists = await validatePromptExists(promptId);
	if (!promptExists) {
		throw error(
			404,
			JSON.stringify({
				message: 'Prompt not found',
				errors: null
			})
		);
	}

	try {
		// Log the deletion for audit purposes
		console.log(
			`[AUDIT] User ${user.userId} (${user.email}) deleting prompt function settings: prompt=${promptId}, type=${type}`
		);

		const deleted = await deletePromptFunctionSettings(promptId, type as FunctionType);

		if (!deleted) {
			return json({
				data: null,
				message: 'No override existed to delete'
			});
		}

		return json({
			data: null,
			message: 'Prompt function settings override deleted'
		});
	} catch (err) {
		console.error('Failed to delete prompt function settings:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Failed to delete prompt function settings',
				errors: err instanceof Error ? err.message : null
			})
		);
	}
};
