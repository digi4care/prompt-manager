import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllPromptFunctionSettings } from '$lib/server/services/settings-cascade.service';

export const GET: RequestHandler = async ({ params }) => {
	const promptId = parseInt(params.id, 10);

	if (isNaN(promptId)) {
		return json({ error: 'Invalid prompt ID' }, { status: 400 });
	}

	try {
		const settings = await getAllPromptFunctionSettings(promptId);
		return json({ data: settings });
	} catch (error) {
		console.error('Failed to fetch prompt settings:', error);
		return json({ error: 'Failed to fetch settings' }, { status: 500 });
	}
};
