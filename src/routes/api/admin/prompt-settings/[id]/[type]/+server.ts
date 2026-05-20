import type { RequestHandler } from './$types';
import {
	getPromptFunctionSettings,
	upsertPromptFunctionSettings,
	deletePromptFunctionSettings,
	type UpdatePromptFunctionSetting
} from '$lib/server/services/settings-cascade.service';
import { type FunctionType } from '$lib/server/services/function-defaults.service';
import { validateFunctionField, validateModelId } from '$lib/validators/function-settings';
import { requireAdmin } from '$lib/server/auth.helper';
import { parseJsonBody } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
import { db } from '$lib/server/db/client';
import { prompts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Valid function types
const VALID_FUNCTION_TYPES: FunctionType[] = ['executor', 'judge', 'improve', 'council'];

/** Validate prompt exists */
async function validatePromptExists(promptId: number): Promise<boolean> {
	const result = await db.select().from(prompts).where(eq(prompts.id, promptId)).limit(1);
	return result.length > 0;
}

/** Parse and validate route params */
function parseParams(params: Record<string, string>): { promptId: number; type: FunctionType } {
	const promptId = parseInt(params.id, 10);
	if (isNaN(promptId)) {
		apiFail('Invalid prompt ID', 400, { id: 'Must be a valid integer' });
	}
	const { type } = params;
	if (!VALID_FUNCTION_TYPES.includes(type as FunctionType)) {
		apiFail('Invalid function type', 400, { type: 'Must be one of: executor, judge, improve, council' });
	}
	return { promptId, type: type as FunctionType };
}

/**
 * GET /api/admin/prompt-settings/[id]/[type]
 * Get prompt-specific function settings override
 */
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	const { promptId, type } = parseParams(event.params);

	const promptExists = await validatePromptExists(promptId);
	if (!promptExists) apiFail('Prompt not found', 404);

	try {
		const settings = await getPromptFunctionSettings(promptId, type);
		return apiSuccess(settings);
	} catch (err) {
		console.error('Failed to get prompt function settings:', err);
		apiFail('Failed to get prompt function settings', 500);
	}
};

/**
 * PUT /api/admin/prompt-settings/[id]/[type]
 * Create or update prompt-specific function settings override
 */
export const PUT: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { promptId, type } = parseParams(event.params);

	const promptExists = await validatePromptExists(promptId);
	if (!promptExists) apiFail('Prompt not found', 404);

	const body = (await parseJsonBody(event)) as Record<string, unknown>;
	const errors: Record<string, string> = {};
	const updateData: UpdatePromptFunctionSetting = {};

	if (body.modelOverride !== undefined && body.modelOverride !== null) {
		const modelError = validateModelId(body.modelOverride as string);
		if (modelError) {
			errors.modelOverride = modelError;
		} else {
			updateData.modelOverride = body.modelOverride as string;
		}
	}

	if (body.temperature !== undefined && body.temperature !== null) {
		const tempError = validateFunctionField('temperature', body.temperature);
		if (tempError) {
			errors.temperature = tempError;
		} else {
			updateData.temperature = body.temperature as number;
		}
	}

	if (body.maxTokens !== undefined && body.maxTokens !== null) {
		const tokensError = validateFunctionField('maxTokens', body.maxTokens);
		if (tokensError) {
			errors.maxTokens = tokensError;
		} else {
			updateData.maxTokens = body.maxTokens as number;
		}
	}

	if (body.promptLinkId !== undefined && body.promptLinkId !== null) {
		if (typeof body.promptLinkId !== 'number' || !Number.isInteger(body.promptLinkId)) {
			errors.promptLinkId = 'Must be a valid integer';
		} else {
			updateData.promptLinkId = body.promptLinkId;
		}
	}

	if (Object.keys(errors).length > 0) {
		apiFail('Validation failed', 400, errors);
	}

	try {
		console.log(
			`[AUDIT] User ${user.userId} (${user.email}) updating prompt function settings: prompt=${promptId}, type=${type}`,
			updateData
		);

		const settings = await upsertPromptFunctionSettings(promptId, type, updateData);
		return apiSuccess(settings);
	} catch (err) {
		console.error('Failed to upsert prompt function settings:', err);
		apiFail('Failed to update prompt function settings', 500);
	}
};

/**
 * DELETE /api/admin/prompt-settings/[id]/[type]
 * Remove prompt-specific function settings override
 */
export const DELETE: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { promptId, type } = parseParams(event.params);

	const promptExists = await validatePromptExists(promptId);
	if (!promptExists) apiFail('Prompt not found', 404);

	try {
		console.log(
			`[AUDIT] User ${user.userId} (${user.email}) deleting prompt function settings: prompt=${promptId}, type=${type}`
		);

		const deleted = await deletePromptFunctionSettings(promptId, type);

		return apiSuccess(
			deleted
				? { message: 'Prompt function settings override deleted' }
				: { message: 'No override existed to delete' }
		);
	} catch (err) {
		console.error('Failed to delete prompt function settings:', err);
		apiFail('Failed to delete prompt function settings', 500);
	}
};
