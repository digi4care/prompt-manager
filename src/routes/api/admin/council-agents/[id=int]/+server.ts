import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';
import {
	getCouncilAgent,
	updateCouncilAgent,
	deleteCouncilAgentById
} from '$lib/server/services/council-agents.service';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { getProviderCatalog, type ProviderInfo } from '$lib/server/services/opencode.service';
import {
	validateModelVariantScope,
	type PolicyScope,
	type PolicyData,
	type CatalogData
} from '$lib/server/validators/model-variant.validator';
import { z } from 'zod';

const updateAgentSchema = z.object({
	modelId: z.string().optional(),
	modelVariant: z.string().nullable().optional(),
	modelName: z.string().optional(),
	modelProvider: z.string().optional(),
	modelLogo: z.string().optional(),
	temperature: z.number().optional(),
	maxTokens: z.number().optional(),
	thinkingLevel: z.string().nullable().optional(),
	promptLinkId: z.number().nullable().optional(),
	agentOrder: z.number().optional()
});

function parseIntId(id: string): number {
	return parseInt(id, 10);
}

/** Validate model+variant against policy (SPEC-14 AIC-008) */
async function validateModelVariant(modelId: string, modelVariant: string | null) {
	const [policy, catalog] = await Promise.all([getOpenCodePolicy(), getProviderCatalog()]);

	const policyData: PolicyData = {
		allowedModels: policy.allowedModels || [],
		allowedVariants: policy.allowedVariants || {}
	};

	const rawProviders = (catalog.providers || []) as ProviderInfo[];
	const providers: CatalogData['providers'] = rawProviders.map((p) => ({
		id: p.id,
		name: p.name,
		connected: true,
		models: Object.entries(p.models || {}).map(([id, m]) => ({
			id,
			name: m.name,
			providerId: p.id,
			status: m.status,
			contextWindow: m.context_window,
			maxOutputTokens: m.limit?.output,
			variants: []
		}))
	}));

	const catalogData: CatalogData = {
		providers,
		connectedProviderIds: rawProviders.map((p) => p.id)
	};

	return validateModelVariantScope({
		modelId,
		modelVariant,
		scope: 'council' as PolicyScope,
		policy: policyData,
		catalog: catalogData,
		requireConnected: true
	});
}

// GET: Get single council agent
export const GET: RequestHandler = async ({ params }) => {
	const id = parseIntId(params.id);
	const agent = await getCouncilAgent(id);
	if (!agent) apiFail('Council agent not found', 404);
	return apiSuccess(agent);
};

// PUT: Update council agent (full replacement)
export const PUT: RequestHandler = async (event) => {
	authenticateRequest(event);
	const id = parseIntId(event.params.id);
	const body = await validateRequest(event, updateAgentSchema);

	const agent = await getCouncilAgent(id);
	if (!agent) apiFail('Council agent not found', 404);

	// Validate model+variant if being updated
	if (body.modelId !== undefined || body.modelVariant !== undefined) {
		const effectiveModelId = body.modelId ?? agent.modelId;
		const effectiveVariant = body.modelVariant ?? agent.modelVariant;
		const validation = await validateModelVariant(effectiveModelId, effectiveVariant);

		if (!validation.valid) {
			const errorCode = validation.error?.code || 'MODEL_NOT_FOUND';
			if (errorCode === 'MODEL_NOT_FOUND') {
				console.warn(
					`[Council Agent] Model "${effectiveModelId}" not found in catalog, allowing update anyway`
				);
			} else {
				const httpStatus = errorCode === 'VARIANT_REQUIRED' ? 400 : 422;
				apiFail(validation.error?.message || 'Model/variant validation failed', httpStatus);
			}
		}
	}

	const result = await updateCouncilAgent(id, body);
	if (!result) apiFail('Council agent not found', 404);
	return apiSuccess(result);
};

// PATCH: Update council agent (partial update)
export const PATCH: RequestHandler = async (event) => {
	return PUT(event);
};

// DELETE: Remove council agent
export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseIntId(params.id);
	const deleted = await deleteCouncilAgentById(id);
	if (!deleted) apiFail('Council agent not found', 404);
	return apiSuccess({ deleted: true });
};
