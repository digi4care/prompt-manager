import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPrompt } from '$lib/server/services/prompts.service';
import { getExecutionHistory } from '$lib/server/services/execution-log.service';

export const load: PageServerLoad = async ({ params }) => {
	const promptId = parseInt(params.id, 10);

	// Get prompt details
	const prompt = await getPrompt(promptId);

	if (!prompt) {
		throw error(404, 'Prompt not found');
	}

	// Get execution history
	const history = await getExecutionHistory(promptId, 100, 0);

	return {
		prompt: {
			id: prompt.id,
			title: prompt.title,
			description: prompt.description
		},
		history
	};
};
