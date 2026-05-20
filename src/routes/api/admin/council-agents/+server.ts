import type { RequestHandler } from './$types';
import { apiSuccess, apiCreated, apiFail } from '$lib/server/utils/api-response';
import { requireAdmin } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { getProviderCatalog, type ProviderInfo } from '$lib/server/services/opencode.service';
import {
	validateModelVariantScope,
	type PolicyScope,
	type PolicyData,
	type CatalogData
} from '$lib/server/validators/model-variant.validator';
import {
	getCouncilAgents,
	createCouncilAgentWithOrder
} from '$lib/server/services/council-agents.service';
import type { ParentType } from '$lib/server/db/schema';
import { z } from 'zod';

const createAgentSchema = z.object({
	parentType: z.string().default('function_defaults'),
	parentId: z.number().default(0),
	modelId: z.string().min(1, 'Je moet een model selecteren'),
	modelVariant: z.string().nullable().optional(),
	temperature: z.number().default(0.7),
	maxTokens: z.number().default(4096),
	thinkingLevel: z.string().nullable().optional(),
	promptLinkId: z.number().nullable().optional()
});

// GET: List all council agents for function_defaults with prompt names
export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	const parentType = (event.url.searchParams.get('parentType') ?? 'function_defaults') as ParentType;
	const agents = await getCouncilAgents(parentType);
	return apiSuccess(agents);
};

// POST: Create new council agent with variant validation
export const POST: RequestHandler = async (event) => {
	requireAdmin(event);
	const data = await validateRequest(event, createAgentSchema);

	// Validate model+variant against policy (SPEC-14 AIC-008)
	try {
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

		const variantValidation = validateModelVariantScope({
			modelId: data.modelId,
			modelVariant: data.modelVariant ?? null,
			scope: 'council' as PolicyScope,
			policy: policyData,
			catalog: catalogData,
			requireConnected: true
		});

		if (!variantValidation.valid) {
			const errorCode = variantValidation.error?.code || 'MODEL_NOT_FOUND';
			const httpStatus = errorCode === 'VARIANT_REQUIRED' ? 400 : 422;
			apiFail(
				variantValidation.error?.message || 'Model/variant validation failed',
				httpStatus
			);
		}
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) throw err;
		console.error('Council agent validation error:', err);
		apiFail('Council agent validation failed', 500);
	}

	const agent = await createCouncilAgentWithOrder({
		parentType: data.parentType,
		parentId: data.parentId,
		modelId: data.modelId,
		modelVariant: data.modelVariant ?? null,
		temperature: data.temperature,
		maxTokens: data.maxTokens,
		promptLinkId: data.promptLinkId ?? null
	});

	return apiCreated(agent);
};
