import type { RequestHandler } from './$types';
import { getPrompt, updatePrompt, deletePrompt } from '$lib/server/services/prompts.service';
import { getVersionHistory } from '$lib/server/services/versions.service';
import { authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
import { z } from 'zod';

const updatePromptSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().optional(),
	purpose: z.string().optional(),
	tags: z.array(z.string()).optional(),
	llmProviders: z.array(z.string()).optional()
});

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);

	try {
		const prompt = await getPrompt(id);
		if (!prompt) apiFail('Prompt not found', 404);

		const versions = await getVersionHistory(id);

		return apiSuccess({
			...prompt,
			tags: prompt.tags ? JSON.parse(prompt.tags) : [],
			llmProviders: prompt.llm_providers ? JSON.parse(prompt.llm_providers) : [],
			versions
		});
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch prompt:', err);
		apiFail('Failed to fetch prompt', 500);
	}
};

export const PATCH: RequestHandler = async (event) => {
	authenticateRequest(event);
	const id = parseInt(event.params.id);

	const parsed = await validateRequest(event, updatePromptSchema);

	try {
		const existing = await getPrompt(id);
		if (!existing) apiFail('Prompt not found', 404);

		const { tags, llmProviders, ...rest } = parsed;
		const updated = await updatePrompt(id, {
			...rest,
			tags: tags ? JSON.stringify(tags) : undefined,
			llm_providers: llmProviders ? JSON.stringify(llmProviders) : undefined
		});

		return apiSuccess(updated);
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to update prompt:', err);
		apiFail('Failed to update prompt', 500);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);

	try {
		const existing = await getPrompt(id);
		if (!existing) apiFail('Prompt not found', 404);

		await deletePrompt(id);
		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to delete prompt:', err);
		apiFail('Failed to delete prompt', 500);
	}
};
