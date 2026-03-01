import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { councilAgents } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { getProviderCatalog, type ProviderInfo } from '$lib/server/services/opencode.service';
import {
	validateModelVariantScope,
	type PolicyScope,
	type PolicyData,
	type CatalogData
} from '$lib/server/validators/model-variant.validator';

// GET: Get single council agent
export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid ID', code: 'INVALID_ID' }));
	}

	const [agent] = await db.select().from(councilAgents).where(eq(councilAgents.id, id));

	if (!agent) {
		throw error(404, JSON.stringify({ message: 'Council agent not found', code: 'NOT_FOUND' }));
	}

	return json({ data: agent });
};

// PUT: Update council agent (full replacement)
export const PUT: RequestHandler = async ({ params, request }) => {
	return handleUpdate(params, request);
};

// PATCH: Update council agent (partial update)
export const PATCH: RequestHandler = async ({ params, request }) => {
	return handleUpdate(params, request);
};

async function handleUpdate(params: { id: string }, request: Request): Promise<Response> {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid ID', code: 'INVALID_ID' }));
	}

	const body = await request.json();
	const {
		modelId,
		modelVariant,
		modelName,
		modelProvider,
		modelLogo,
		temperature,
		maxTokens,
		promptLinkId,
		agentOrder
	} = body;

	const updateData: Record<string, unknown> = {};
	if (modelId !== undefined) updateData.modelId = modelId;
	if (modelVariant !== undefined) updateData.modelVariant = modelVariant;
	if (modelName !== undefined) updateData.modelName = modelName;
	if (modelProvider !== undefined) updateData.modelProvider = modelProvider;
	if (modelLogo !== undefined) updateData.modelLogo = modelLogo;
	if (temperature !== undefined) updateData.temperature = temperature;
	if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
	if (promptLinkId !== undefined) updateData.promptLinkId = promptLinkId;
	if (agentOrder !== undefined) updateData.agentOrder = agentOrder;

	// Validate model+variant if modelId or modelVariant is being updated (SPEC-14 AIC-008)
	if (modelId !== undefined || modelVariant !== undefined) {
		try {
			// Get current agent for fallback values
			const [currentAgent] = await db.select().from(councilAgents).where(eq(councilAgents.id, id));
			if (!currentAgent) {
				throw error(404, JSON.stringify({ message: 'Council agent not found', code: 'NOT_FOUND' }));
			}

			const effectiveModelId = modelId ?? currentAgent.modelId;
			const effectiveVariant = modelVariant ?? currentAgent.modelVariant;

			const [policy, catalog] = await Promise.all([getOpenCodePolicy(), getProviderCatalog()]);

			const scope: PolicyScope = 'council';

			const policyData: PolicyData = {
				allowedModels: policy.allowedModels || [],
				allowedVariants: policy.allowedVariants || {}
			};

			const rawProviders = (catalog.providers || []) as ProviderInfo[];
			const providers: CatalogData['providers'] = rawProviders.map((p) => ({
				id: p.id,
				name: p.name,
				connected: true,
				models: Object.entries(p.models || {}).map(([mid, m]) => ({
					id: mid,
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
				modelId: effectiveModelId,
				modelVariant: effectiveVariant,
				scope,
				policy: policyData,
				catalog: catalogData,
				requireConnected: true
			});

			// Log validation result for debugging but don't fail on MODEL_NOT_FOUND
			// The frontend may show models that aren't in the catalog yet
			if (!variantValidation.valid) {
				const errorCode = variantValidation.error?.code || 'MODEL_NOT_FOUND';
				if (errorCode === 'MODEL_NOT_FOUND') {
					console.warn(
						`[Council Agent] Model "${effectiveModelId}" not found in catalog, allowing update anyway`
					);
					// Continue with update - model may be available in frontend but not yet in catalog
				} else {
					// Only fail for other validation errors (PROVIDER_NOT_CONNECTED, MODEL_NOT_ALLOWED, VARIANT_REQUIRED)
					const httpStatus = errorCode === 'VARIANT_REQUIRED' ? 400 : 422;
					throw error(
						httpStatus,
						JSON.stringify({
							message: variantValidation.error?.message || 'Model/variant validation failed',
							code: errorCode
						})
					);
				}
			}
		} catch (err) {
			// Re-throw SvelteKit HttpError (has status property)
			if (err && typeof err === 'object' && 'status' in err) {
				throw err;
			}
			console.error('Council agent update validation error:', err);
			throw error(
				500,
				JSON.stringify({
					message: 'Council agent validation failed',
					errors: err instanceof Error ? err.message : null
				})
			);
		}
	}

	const [agent] = await db
		.update(councilAgents)
		.set(updateData)
		.where(eq(councilAgents.id, id))
		.returning();

	if (!agent) {
		throw error(404, JSON.stringify({ message: 'Council agent not found', code: 'NOT_FOUND' }));
	}

	return json({ data: agent });
}

// DELETE: Remove council agent
export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	if (isNaN(id)) {
		throw error(400, JSON.stringify({ message: 'Invalid ID', code: 'INVALID_ID' }));
	}

	const [agent] = await db.delete(councilAgents).where(eq(councilAgents.id, id)).returning();

	if (!agent) {
		throw error(404, JSON.stringify({ message: 'Council agent not found', code: 'NOT_FOUND' }));
	}

	return json({ data: agent });
};
