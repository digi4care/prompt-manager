import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { upsertPromptFunctionSettings } from '$lib/server/services/settings-cascade.service';

type FunctionType = 'executor' | 'judge' | 'improve' | 'council';

export const PUT: RequestHandler = async ({ params, request }) => {
	const promptId = parseInt(params.id, 10);

	if (isNaN(promptId)) {
		return json({ error: 'Invalid prompt ID' }, { status: 400 });
	}

	try {
		const body = await request.json();
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

		if (!functionType || !['executor', 'judge', 'improve', 'council'].includes(functionType)) {
			return json({ error: 'Invalid function type' }, { status: 400 });
		}

		const result = await upsertPromptFunctionSettings(promptId, functionType, settings);
		return json({ data: result });
	} catch (error) {
		console.error('Failed to save prompt settings:', error);
		return json({ error: 'Failed to save settings' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, request }) => {
	const promptId = parseInt(params.id, 10);

	if (isNaN(promptId)) {
		return json({ error: 'Invalid prompt ID' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const { functionType } = body as { functionType: FunctionType };

		if (!functionType || !['executor', 'judge', 'improve', 'council'].includes(functionType)) {
			return json({ error: 'Invalid function type' }, { status: 400 });
		}

		const { deletePromptFunctionSettings } =
			await import('$lib/server/services/settings-cascade.service');
		await deletePromptFunctionSettings(promptId, functionType);
		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete prompt settings:', error);
		return json({ error: 'Failed to delete settings' }, { status: 500 });
	}
};
