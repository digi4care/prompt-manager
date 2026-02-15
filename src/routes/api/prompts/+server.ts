import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listPrompts, createPrompt } from '$lib/server/services/prompts.service';
import { createVersion } from '$lib/server/services/versions.service';
import { z } from 'zod';
import { optionalAuthenticateRequest, authenticateRequest } from '$lib/server/auth/jwt';

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
	const showPublicOnly = url.searchParams.get('public') === 'true';

	// Optional authentication - public prompts accessible without auth
	const user = optionalAuthenticateRequest(event);

	try {
		// Note: In a full implementation, filter by user ownership and isPublic flag
		// For now, all prompts are visible but creation requires auth
		const { prompts: promptsList, totalCount } = await listPrompts(limit, offset, search);
		return json({
			data: { prompts: promptsList, totalCount },
			pagination: { limit, offset, hasMore: promptsList.length === limit },
			meta: { authenticated: !!user }
		});
	} catch (err) {
		console.error('Failed to fetch prompts:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch prompts', errors: null }));
	}
};

export const POST: RequestHandler = async (event) => {
	const { request } = event;
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	// Require authentication for creating prompts
	const user = authenticateRequest(event);

	const parsed = createPromptSchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	const { content, tags, llmProviders, ...promptData } = parsed.data;

	try {
		// Log the authenticated user for audit purposes
		console.log(`[AUDIT] User ${user.userId} (${user.email}) created prompt: ${promptData.title}`);

		const prompt = await createPrompt({
			...promptData,
			tags: tags ? JSON.stringify(tags) : null,
			llm_providers: llmProviders && llmProviders.length > 0 ? JSON.stringify(llmProviders) : null
		});

		// Use authenticated user ID for version creation
		const version = await createVersion(
			prompt.id,
			content,
			'major',
			'Initial version',
			user.userId
		);

		return json({ ...prompt, latestVersion: version }, { status: 201 });
	} catch (err) {
		console.error('Failed to create prompt:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create prompts', errors: null }));
	}
};
