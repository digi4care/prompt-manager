import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPrompt } from '$lib/server/services/prompts.service';
import { getVersionHistory } from '$lib/server/services/versions.service';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid prompt ID');
	}

	try {
		const prompt = await getPrompt(id);
		if (!prompt) {
			throw error(404, 'Prompt not found');
		}

		const versions = await getVersionHistory(id);

		// Transform prompt data
		const transformedPrompt = {
			id: prompt.id,
			title: prompt.title,
			description: prompt.description,
			purpose: prompt.purpose,
			tags: prompt.tags ? JSON.parse(prompt.tags) : [],
			llmProviders: prompt.llm_providers ? JSON.parse(prompt.llm_providers) : [],
			llm_providers: prompt.llm_providers, // Keep original for reference
			createdAt: prompt.createdAt,
			updatedAt: prompt.updatedAt,
			latestVersionId: prompt.latestVersionId,
			deletedAt: prompt.deletedAt
		};

		// Get current version (first in the sorted list, which is newest first)
		const currentVersion = versions.length > 0 ? versions[0] : null;

		return {
			prompt: transformedPrompt,
			currentVersion,
			meta: {
				title: `Edit: ${prompt.title}`,
				description: `Edit prompt: ${prompt.title}`
			}
		};
	} catch (err) {
		console.error('Failed to fetch prompt for edit:', err);
		if (err instanceof error) {
			throw err;
		}
		throw error(500, 'Failed to fetch prompt');
	}
};
