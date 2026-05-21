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

		// Transform prompt data with safe tag parsing
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

		// Safe parse llm_providers - supports "all", JSON arrays, and comma-separated strings
		let parsedProviders: string[] = [];
		if (prompt.llm_providers) {
			const provStr = String(prompt.llm_providers).trim();
			if (provStr === 'all') {
				parsedProviders = ['all'];
			} else if (provStr.startsWith('[')) {
				try {
					parsedProviders = JSON.parse(provStr);
				} catch {
					/* ignore */
				}
			} else if (provStr.includes(',')) {
				parsedProviders = provStr
					.split(',')
					.map((p) => p.trim())
					.filter(Boolean);
			} else if (provStr) {
				parsedProviders = [provStr];
			}
		}

		const transformedPrompt = {
			...prompt,
			tags: parsedTags,
			llmProviders: parsedProviders
		};

		// Get current version (first in the sorted list, which is newest first)
		const currentVersion = versions.length > 0 ? versions[0] : null;

		return {
			prompt: transformedPrompt,
			versions,
			currentVersion,
			meta: {
				title: prompt.title,
				description: prompt.description || `Prompt: ${prompt.title}`
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
