import type { RequestHandler } from './$types';
import {
	upsertPromptFunctionSettings,
	deletePromptFunctionSettings
} from '$lib/server/services/settings-cascade.service';
import { authenticateRequest } from '$lib/server/auth.helper';
import { parseJsonBody } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

type FunctionType = 'executor' | 'judge' | 'improve' | 'council';

function parsePromptId(raw: string): number {
	return parseInt(raw, 10);
}

export const PUT: RequestHandler = async (event) => {
	authenticateRequest(event);
	const promptId = parsePromptId(event.params.id);

	const body = (await parseJsonBody(event)) as Record<string, unknown>;
	const { functionType, settings } = body as {
		functionType: FunctionType;
		settings: {
			modelOverride?: string | null;
			modelVariantOverride?: string | null;
			temperature?: number | null;
			maxTokens?: number | null;
			promptLinkId?: number | null;
		};
	};

	try {
		const result = await upsertPromptFunctionSettings(promptId, functionType, settings);
		return apiSuccess(result);
	} catch (err) {
		console.error('Failed to save prompt settings:', err);
		apiFail('Failed to save settings', 500);
	}
};

export const DELETE: RequestHandler = async (event) => {
	authenticateRequest(event);
	const promptId = parsePromptId(event.params.id);

	const body = (await parseJsonBody(event)) as Record<string, unknown>;
	const { functionType } = body as { functionType: FunctionType };

	try {
		await deletePromptFunctionSettings(promptId, functionType);
		return apiSuccess(null);
	} catch (err) {
		console.error('Failed to delete prompt settings:', err);
		apiFail('Failed to delete settings', 500);
	}
};
