import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { PromptVersion } from '$lib/stores/prompts.svelte';
import { evaluatePrompt, saveEvaluation } from '$lib/server/services/judge.service';
import { getVersion } from '$lib/server/services/versions.service';
import { z } from 'zod';
import { authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

const evaluateRequestSchema = z
	.object({
		versionId: z.number().optional(),
		content: z.string().optional(),
		allowedModels: z.array(z.string()).optional() // Optional prompt-specific allowed models subset
	})
	.refine((data) => data.versionId !== undefined || data.content !== undefined, {
		message: 'Must provide either versionId or content'
	});

export const POST: RequestHandler = async (event) => {
	// Require authentication for judge evaluation
	authenticateRequest(event);

	const parsed = await validateRequest(event, evaluateRequestSchema);

	try {
		let versionToEvaluate: PromptVersion | null = null;

		if (parsed.versionId) {
			versionToEvaluate = await getVersion(parsed.versionId);
			if (!versionToEvaluate) {
				throw error(404, JSON.stringify({ message: 'Version not found', errors: null }));
			}
		} else if (parsed.content) {
			// Create temporary version object for ad-hoc evaluation
			versionToEvaluate = {
				id: 0,
				promptId: 0,
				version: '0.0.0',
				content: parsed.content,
				metadata: null,
				frontmatterYaml: null,
				parentVersionId: null,
				changeType: 'patch' as const,
				changeNotes: 'Ad-hoc evaluation',
				createdAt: new Date(),
				createdBy: 'user'
			};
		}

		// Pass allowedModels to evaluatePrompt for model selection
		const result = await evaluatePrompt(
			{
				...versionToEvaluate!,
				createdAt: new Date(versionToEvaluate!.createdAt),
				frontmatterYaml: versionToEvaluate!.frontmatterYaml ?? null
			},
			parsed.allowedModels
		);

		// Only save evaluation if it's for an existing version
		let evaluationId = null;
		if (parsed.versionId) {
			evaluationId = await saveEvaluation(
				parsed.versionId,
				result.response,
				result.rawText,
				result.thinking,
				{
					providerId: result.providerId,
					modelId: result.modelId,
					temperature: result.temperature,
					maxTokens: result.maxTokens
				}
			);
		}

		const qualityScore =
			(result.response.clarity + result.response.completeness + result.response.specificity) / 3;

		return apiSuccess({
			evaluationId,
			scores: {
				clarity: result.response.clarity,
				completeness: result.response.completeness,
				specificity: result.response.specificity,
				overall: Math.round(qualityScore * 10) / 10
			},
			gaps: result.response.gaps,
			recommendations: result.response.recommendations,
			thinking: result.thinking,
			// Add metadata about model used (ara.14 provenance)
			metadata: {
				providerId: result.providerId,
				modelId: result.modelId,
				temperature: result.temperature,
				allowedModels: result.allowedModels
			}
		});
	} catch (err: unknown) {
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Judge evaluation failed:', err);
		apiFail('Judge evaluation failed', 500);
	}
};
