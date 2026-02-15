import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrompt } from '$lib/server/services/prompts.service';
import { getVersionHistory, createVersion } from '$lib/server/services/versions.service';
import { computeDiff } from '$lib/server/utils/diff';
import { validateFrontmatter } from '$lib/server/opencode/frontmatter';
import { z } from 'zod';

const createVersionSchema = z.object({
	content: z.string().min(1).max(50000),
	changeType: z.enum(['major', 'minor', 'patch']),
	changeNotes: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).optional(),
	frontmatterYaml: z.string().max(50000).optional()
});

export const GET: RequestHandler = async ({ params, url }) => {
	const promptId = parseInt(params.id);
	if (isNaN(promptId)) {
		throw error(400, JSON.stringify({ message: 'Invalid prompt ID', errors: null }));
	}

	const includeDiff = url.searchParams.get('diff') === 'true';

	try {
		const prompt = await getPrompt(promptId);
		if (!prompt) {
			throw error(404, JSON.stringify({ message: 'Prompt not found', errors: null }));
		}

		const versions = await getVersionHistory(promptId);

		if (includeDiff && versions.length > 1) {
			const versionsWithDiff = versions.map((version, index) => {
				if (index === versions.length - 1) {
					return { ...version, diff: null };
				}
				const previousVersion = versions[index + 1];
				const diffResult = computeDiff(previousVersion.content, version.content);
				// Return diff result for display on frontend
				const diffDisplay = {
					added: diffResult.added,
					removed: diffResult.removed,
					summary: `+${diffResult.added} -${diffResult.removed}`
				};
				return { ...version, diff: diffDisplay };
			});
			return json({ data: { versions: versionsWithDiff } });
		}

		return json({ data: { versions } });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch versions:', err);
		throw error(500, JSON.stringify({ message: 'Failed to fetch versions', errors: null }));
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const promptId = parseInt(params.id);
	if (isNaN(promptId)) {
		throw error(400, JSON.stringify({ message: 'Invalid prompt ID', errors: null }));
	}

	let data: unknown;
	try {
		data = await request.json();
	} catch {
		throw error(400, JSON.stringify({ message: 'Invalid JSON body', errors: null }));
	}

	const parsed = createVersionSchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	try {
		const prompt = await getPrompt(promptId);
		if (!prompt) {
			throw error(404, JSON.stringify({ message: 'Prompt not found', errors: null }));
		}

		const frontmatterYaml = (parsed.data.frontmatterYaml ?? '').trim();
		if (frontmatterYaml) {
			const frontmatterResult = validateFrontmatter(frontmatterYaml);
			if (!frontmatterResult.ok) {
				throw error(
					400,
					JSON.stringify({
						message: 'Frontmatter YAML validation failed',
						errors: { frontmatterYaml: frontmatterResult.errors }
					})
				);
			}
		}

		const version = await createVersion(
			promptId,
			parsed.data.content,
			parsed.data.changeType,
			parsed.data.changeNotes,
			'user', // TODO: Replace with authenticated user ID (Phase 1C)
			parsed.data.metadata,
			frontmatterYaml || null
		);

		return json({ data: version }, { status: 201 });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to create version:', err);
		throw error(500, JSON.stringify({ message: 'Failed to create version', errors: null }));
	}
};
