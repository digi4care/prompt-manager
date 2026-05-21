import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
import { validateRequest } from '$lib/server/utils/validate-request';
import { authenticateRequest } from '$lib/server/auth.helper';
import { orchestrateImprovement } from '$lib/server/services/improvement.service';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const improveSchema = z.object({
	versionId: z.number().optional(),
	variantCount: z.number().min(1).max(5).default(3),
	autoSelect: z.boolean().default(false),
	instruction: z.string().optional(),
	preset: z.union([z.string(), z.number()]).optional(),
	providerId: z.string().optional(),
	modelId: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().positive().optional()
});

export const POST: RequestHandler = async (event) => {
	authenticateRequest(event);
	const promptId = parseInt(event.params.id, 10);
	const data = await validateRequest(event, improveSchema);
	try {
		const result = await orchestrateImprovement({
			promptId,
			versionId: data.versionId,
			variantCount: data.variantCount,
			autoSelect: data.autoSelect,
			improveOptions: {
				instruction: data.instruction,
				preset: data.preset,
				providerId: data.providerId,
				modelId: data.modelId,
				temperature: data.temperature,
				maxTokens: data.maxTokens
			}
		});
		return apiSuccess(result);
	} catch (err) {
		console.error('Improvement loop failed:', err);
		const e = err as { status?: number };
		if (e.status) throw err;
		apiFail('Improvement loop failed', 500);
	}
};
