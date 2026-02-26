import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { councilAgents } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { getProviderCatalog, type ProviderInfo } from '$lib/server/services/opencode.service';
import {
	validateModelVariantScope,
	type PolicyScope,
	type PolicyData,
	type CatalogData
} from '$lib/server/validators/model-variant.validator';

type ParentType = 'function_defaults' | 'prompt_function_settings';

// GET: List all council agents for function_defaults
export const GET: RequestHandler = async ({ url }) => {
	const parentType = (url.searchParams.get('parentType') ?? 'function_defaults') as ParentType;

	const agents = await db
		.select()
		.from(councilAgents)
		.where(eq(councilAgents.parentType, parentType))
		.orderBy(asc(councilAgents.agentOrder));

	return json({ data: agents });
};

// POST: Create new council agent with variant validation
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	const {
		parentType = 'function_defaults',
		parentId = 0,
		modelId = '',
		modelVariant = null,
		temperature = 0.7,
		maxTokens = 4096,
		promptLinkId = null
	} = body;

	if (!modelId) {
		throw error(
			400,
			JSON.stringify({ message: 'Je moet een model selecteren', code: 'MODEL_REQUIRED' })
		);
	}

	// Validate model+variant against policy (SPEC-14 AIC-008)
	try {
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
			modelId,
			modelVariant,
			scope,
			policy: policyData,
			catalog: catalogData,
			requireConnected: true
		});

		if (!variantValidation.valid) {
			const errorCode = variantValidation.error?.code || 'MODEL_NOT_FOUND';
			const httpStatus = errorCode === 'VARIANT_REQUIRED' ? 400 : 422;
			throw error(
				httpStatus,
				JSON.stringify({
					message: variantValidation.error?.message || 'Model/variant validation failed',
					code: errorCode
				})
			);
		}
	} catch (err) {
		// Re-throw SvelteKit HttpError (has status property)
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		console.error('Council agent validation error:', err);
		throw error(
			500,
			JSON.stringify({
				message: 'Council agent validation failed',
				errors: err instanceof Error ? err.message : null
			})
		);
	}

	// Get next order
	const existing = await db
		.select({ agentOrder: councilAgents.agentOrder })
		.from(councilAgents)
		.where(eq(councilAgents.parentType, parentType as ParentType))
		.orderBy(asc(councilAgents.agentOrder));

	const nextOrder = existing.length > 0 ? Math.max(...existing.map((a) => a.agentOrder)) + 1 : 1;

	const [agent] = await db
		.insert(councilAgents)
		.values({
			parentType: parentType as ParentType,
			parentId,
			modelId,
			modelVariant,
			temperature,
			maxTokens,
			promptLinkId: promptLinkId ?? null,
			agentOrder: nextOrder
		})
		.returning();

	return json({ data: agent }, { status: 201 });
};
