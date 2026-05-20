import type { RequestHandler } from './$types';
import { listPrompts, createPrompt } from '$lib/server/services/prompts.service';
import { createVersion } from '$lib/server/services/versions.service';
import { z } from 'zod';
import {
	authenticateRequest,
	optionalAuthenticateRequest
} from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiCreated, apiPaginated, apiFail } from '$lib/server/utils/api-response';

const createPromptSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	purpose: z.string().optional(),
	tags: z.array(z.string()).optional(),
	llmProviders: z.array(z.string()).optional(),
	content: z.string().min(1).max(50000),
	isPublic: z.boolean().optional().default(false)
});

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500);
	const offset = parseInt(url.searchParams.get('offset') || '0');
	const search = url.searchParams.get('search') || undefined;

	// Optional authentication - public prompts accessible without auth
	const user = optionalAuthenticateRequest(event);

	try {
		const { prompts: promptsList, totalCount } = await listPrompts(limit, offset, search);
		return apiPaginated(
			{
				prompts: promptsList,
				meta: { authenticated: !!user }
			},
			{ limit, offset, total: totalCount }
		);
	} catch (err) {
		console.error('Failed to fetch prompts:', err);
		apiFail('Failed to fetch prompts', 500);
	}
};

export const POST: RequestHandler = async (event) => {
	// Require authentication for creating prompts
	const user = authenticateRequest(event);
	const data = await validateRequest(event, createPromptSchema);

	const { content, tags, llmProviders, ...promptData } = data;

	try {
		// Log the authenticated user for audit purposes
		console.log(`[AUDIT] User ${user.userId} (${user.email}) created prompt: ${promptData.title}`);

		const prompt = await createPrompt({
			...promptData,
			tags: tags ? JSON.stringify(tags) : null,
			llm_providers:
				llmProviders && llmProviders.length > 0 ? JSON.stringify(llmProviders) : null
		});

		// Use authenticated user ID for version creation
		const version = await createVersion(
			prompt.id,
			content,
			'major',
			'Initial version',
			String(user.userId)
		);

		return apiCreated({ ...prompt, latestVersion: version });
	} catch (err) {
		console.error('Failed to create prompt:', err);
		apiFail('Failed to create prompt', 500);
	}
};
