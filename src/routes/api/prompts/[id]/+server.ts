import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrompt, updatePrompt, deletePrompt } from '$lib/server/services/prompts.service';
import { getVersionHistory } from '$lib/server/services/versions.service';
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
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid prompt ID', errors: null }));
	}

	try {
		const prompt = await getPrompt(id);
		if (!prompt) {
			throw error(404, JSON.stringify({ message: 'Prompt not found', errors: null }));
		}

		const versions = await getVersionHistory(id);

		return json({
			data: {
				...prompt,
				tags: prompt.tags ? JSON.parse(prompt.tags) : [],
				llmProviders: prompt.llm_providers ? JSON.parse(prompt.llm_providers) : [],
				versions
			}
		});
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch prompt:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch prompt', errors: null }));
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid prompt ID', errors: null }));
	}

	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	const parsed = updatePromptSchema.safeParse(data);
	if (!parsed.success) {
		throw error(400, JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() }));
	}

	try {
		const existing = await getPrompt(id);
		if (!existing) {
			throw error(404, JSON.stringify({ message: 'Prompt not found', errors: null }));
		}

		const { tags, llmProviders, ...rest } = parsed.data;
		const updated = await updatePrompt(id, {
			...rest,
			tags: tags ? JSON.stringify(tags) : undefined,
			llm_providers: llmProviders ? JSON.stringify(llmProviders) : undefined
		});

		return json({ data: updated });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to update prompt:', err);
		throw error(500, JSON.stringify({ message: 'Failed to update prompt', errors: null }));
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid prompt ID', errors: null }));
	}

	try {
		const existing = await getPrompt(id);
		if (!existing) {
			throw error(404, JSON.stringify({ message: 'Prompt not found', errors: null }));
		}

		await deletePrompt(id);
		return new Response(null, { status: 204 });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to delete prompt:', err);
		throw error(500, JSON.stringify({ message: 'Failed to delete prompt', errors: null }));
	}
};
