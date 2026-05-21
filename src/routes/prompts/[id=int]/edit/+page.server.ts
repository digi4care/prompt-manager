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

		// Safe parse tags - supports both JSON arrays and comma-separated strings
		let parsedTags: string[] = [];
		if (prompt.tags) {
			if (typeof prompt.tags === 'string') {
				const tagStr = prompt.tags.trim();
				if (tagStr.startsWith('[')) {
					try {
						parsedTags = JSON.parse(tagStr);
					} catch {
						/* ignore */
					}
				} else if (tagStr.includes(',')) {
					parsedTags = tagStr
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean);
				} else {
					parsedTags = tagStr ? [tagStr] : [];
				}
			} else if (Array.isArray(prompt.tags)) {
				parsedTags = prompt.tags;
			}
		}

		// Safe parse llm_providers - supports 'all', JSON arrays, and comma-separated strings
		let parsedProviders: string[] = [];
		if (prompt.llm_providers) {
			if (typeof prompt.llm_providers === 'string') {
				const str = prompt.llm_providers.trim();
				if (str === 'all') {
					parsedProviders = ['all'];
				} else if (str.startsWith('[')) {
					try {
						parsedProviders = JSON.parse(str);
					} catch {
						/* ignore */
					}
				} else if (str.includes(',')) {
					parsedProviders = str
						.split(',')
						.map((t) => t.trim())
						.filter(Boolean);
				} else {
					parsedProviders = str ? [str] : [];
				}
			} else if (Array.isArray(prompt.llm_providers)) {
				parsedProviders = prompt.llm_providers;
			}
		}

		// Transform prompt data
		const transformedPrompt = {
			id: prompt.id,
			title: prompt.title,
			description: prompt.description,
			purpose: prompt.purpose,
			tags: parsedTags,
			llmProviders: parsedProviders,
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
