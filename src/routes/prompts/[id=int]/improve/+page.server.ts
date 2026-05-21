import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPrompt } from '$lib/server/services/prompts.service';
import { getVersionHistory } from '$lib/server/services/versions.service';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	try {
		const prompt = await getPrompt(id);
		if (!prompt) {
			throw error(404, 'Prompt not found');
		}

		const versions = await getVersionHistory(id);

		// Transform prompt data
		const transformedPrompt = {
			...prompt,
			tags: prompt.tags ? JSON.parse(prompt.tags) : []
		};

		// Get current version (first in the sorted list, which is newest first)
		const currentVersion = versions.length > 0 ? versions[0] : null;

		return {
			prompt: transformedPrompt,
			versions,
			currentVersion,
			meta: {
				title: `Improve: ${prompt.title}`,
				description: `AI-powered improvement for prompt: ${prompt.title}`
			}
		};
	} catch (err) {
		console.error('Failed to fetch prompt:', err);
		if (err instanceof error) {
			throw err;
		}
		throw error(500, 'Failed to fetch prompt');
	}
};
