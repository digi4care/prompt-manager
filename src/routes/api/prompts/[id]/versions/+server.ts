import type { RequestHandler } from './$types';
import { getPrompt } from '$lib/server/services/prompts.service';
import { getVersionHistory, createVersion } from '$lib/server/services/versions.service';
import { computeDiff } from '$lib/server/utils/diff';
import { validateFrontmatter } from '$lib/server/opencode/frontmatter';
import { authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiCreated, apiFail } from '$lib/server/utils/api-response';
import { z } from 'zod';

const createVersionSchema = z.object({
	content: z.string().min(1).max(50000),
	changeType: z.enum(['major', 'minor', 'patch']),
	changeNotes: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).optional(),
	frontmatterYaml: z.string().max(50000).optional()
});

function parsePromptId(raw: string): number {
	const id = parseInt(raw);
	if (isNaN(id)) apiFail('Invalid prompt ID', 400);
	return id;
}

export const GET: RequestHandler = async ({ params, url }) => {
	const promptId = parsePromptId(params.id);
	const includeDiff = url.searchParams.get('diff') === 'true';

	try {
		const prompt = await getPrompt(promptId);
		if (!prompt) apiFail('Prompt not found', 404);

		const versions = await getVersionHistory(promptId);

		if (includeDiff && versions.length > 1) {
			const versionsWithDiff = versions.map((version, index) => {
				if (index === versions.length - 1) {
					return { ...version, diff: null };
				}
				const previousVersion = versions[index + 1];
				const diffResult = computeDiff(previousVersion.content, version.content);
				const diffDisplay = {
					added: diffResult.added,
					removed: diffResult.removed,
					summary: `+${diffResult.added} -${diffResult.removed}`
				};
				return { ...version, diff: diffDisplay };
			});
			return apiSuccess({ versions: versionsWithDiff });
		}

		return apiSuccess({ versions });
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to fetch versions:', err);
		apiFail('Failed to fetch versions', 500);
	}
};

export const POST: RequestHandler = async (event) => {
	const user = authenticateRequest(event);
	const promptId = parsePromptId(event.params.id);
	const parsed = await validateRequest(event, createVersionSchema);

	try {
		const prompt = await getPrompt(promptId);
		if (!prompt) apiFail('Prompt not found', 404);

		const frontmatterYaml = (parsed.frontmatterYaml ?? '').trim();
		if (frontmatterYaml) {
			const frontmatterResult = validateFrontmatter(frontmatterYaml);
			if (!frontmatterResult.ok) {
				apiFail('Frontmatter YAML validation failed', 400, {
					frontmatterYaml: frontmatterResult.errors
				});
			}
		}

		const version = await createVersion(
			promptId,
			parsed.content,
			parsed.changeType,
			parsed.changeNotes,
			String(user.userId),
			parsed.metadata,
			frontmatterYaml || null
		);

		return apiCreated(version);
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Failed to create version:', err);
		apiFail('Failed to create version', 500);
	}
};
