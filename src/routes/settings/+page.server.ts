import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/client';
import { adminSettings, opencodeConnection, prompts, councilAgents } from '$lib/server/db/schema';
import { eq, asc, isNull } from 'drizzle-orm';
import {
	getAllProviders,
	getProviderCatalog,
	type ProviderInfo
} from '$lib/server/services/opencode.service';
import { getFunctionDefaults } from '$lib/server/services/function-defaults.service';
import { error, json } from '@sveltejs/kit';

const SETTINGS_KEY = 'function_defaults';
const SETTINGS_CATEGORY = 'opencode';

interface FunctionDefault {
	type: 'executor' | 'judge' | 'improve';
	modelId: string | null;
	modelName?: string;
	modelProvider?: string;
	providerId?: string;
	temperature: number;
	maxTokens: number;
	promptId?: number;
	modelVariant?: string | null;
}

interface CouncilAgent {
	id: string;
	name: string;
	modelId: string | null;
	modelName?: string;
	modelProvider?: string;
	providerId?: string;
	temperature: number;
	maxTokens: number;
	systemPrompt?: string;
	modelLogo?: string;
	promptTemplate?: string;
	promptLinkId?: number;
	modelVariant?: string | null;
}

interface FunctionDefaultsSettings {
	executor: FunctionDefault;
	judge: FunctionDefault;
	improve: FunctionDefault;
	councilAgents: CouncilAgent[];
	opencode_allowed_models?: string[];
}

const DEFAULT_SETTINGS: FunctionDefaultsSettings = {
	executor: { type: 'executor', modelId: null, temperature: 0.7, maxTokens: 4096 },
	judge: { type: 'judge', modelId: null, temperature: 0.3, maxTokens: 2048 },
	improve: { type: 'improve', modelId: null, temperature: 0.5, maxTokens: 4096 },
	councilAgents: []
};

export const load: PageServerLoad = async ({ url }) => {
	// Check for force refresh parameter
	const forceRefresh = url.searchParams.get('refresh') === 'true';
	if (forceRefresh) {
		console.log('[Settings] Force refresh requested');
	}

	// Load function defaults from the function_defaults table
	const functionDefaultsList = await getFunctionDefaults();

	// Convert array to object keyed by functionType
	// modelId format is 'providerID/modelID' - we'll extract providerId from it
	const settings: FunctionDefaultsSettings = { ...DEFAULT_SETTINGS };
	for (const def of functionDefaultsList) {
		if (
			def.functionType === 'executor' ||
			def.functionType === 'judge' ||
			def.functionType === 'improve'
		) {
			const modelParts = def.modelId.split('/');
			const providerId = modelParts.length > 1 ? modelParts[0] : undefined;
			const modelId = modelParts.length > 1 ? modelParts.slice(1).join('/') : def.modelId;

			settings[def.functionType] = {
				type: def.functionType,
				modelId: modelId,
				modelProvider: providerId,
				providerId: providerId,
				temperature: def.temperature,
				maxTokens: def.maxTokens,
				promptId: def.promptId ?? undefined,
				modelVariant: def.modelVariant ?? undefined
			};
		}
	}

	// Load AI Policy settings to get allowed models
	const policySettingsRow = await db
		.select()
		.from(adminSettings)
		.where(eq(adminSettings.key, 'opencode_allowed_models'))
		.limit(1);

	let allowedModels: string[] = [];
	if (policySettingsRow.length > 0) {
		try {
			const parsed = JSON.parse(policySettingsRow[0].value);
			allowedModels = Array.isArray(parsed) ? parsed : [];
			console.log('[Settings] Whitelist loaded:', allowedModels);
		} catch (e) {
			console.error('[Settings] Failed to parse policy settings:', e);
		}
	}
	console.log('[Settings] Final allowedModels count:', allowedModels.length);

	// Load connection status
	const connectionRow = await db
		.select()
		.from(opencodeConnection)
		.where(eq(opencodeConnection.id, 1))
		.limit(1);

	const connection = connectionRow[0] ?? null;

	// Load prompts for the dropdown (exclude deleted)
	const promptsList = await db
		.select({ id: prompts.id, title: prompts.title })
		.from(prompts)
		.where(isNull(prompts.deletedAt))
		.orderBy(asc(prompts.title));

	// Load all providers using cached service
	let models: unknown[] = [];
	let allProviders: unknown[] = [];
	let connectedProviderIds: string[] = [];
	try {
		console.log('[Settings] Loading all providers from OpenCode...');
		const catalog = await getAllProviders(forceRefresh);
		console.log('[Settings] All providers loaded:', catalog.all?.length ?? 0);
		// Store all providers
		allProviders = catalog.all ?? [];
		connectedProviderIds = catalog.connected ?? [];
		// Flatten providers to get all models
		if (catalog.all && Array.isArray(catalog.all)) {
			// Get selected provider IDs (connected ones)
			const connectedIds = (catalog.connected ?? []).map((p: string) => p.toLowerCase());

			const allProviderModels = catalog.all.flatMap((p: unknown) => {
				const provider = p as ProviderInfo;
				const providerModels = Object.values(provider.models ?? {});
				return providerModels;
			});
			const totalModels = allProviderModels.length;

			models = catalog.all.flatMap((p: unknown) => {
				const provider = p as ProviderInfo;

				// Only include models from selected/connected providers
				if (!connectedIds.includes(provider.id.toLowerCase())) {
					return [];
				}

				const providerModels = Object.values(provider.models ?? {});

				// If whitelist exists, filter models by provider/model format
				let filteredModels = providerModels;
				if (allowedModels.length > 0) {
					filteredModels = providerModels.filter((m) => {
						// Use provider/model format for exact matching
						const providerModelId = `${provider.id}/${m.id}`.toLowerCase();
						const modelIdLower = m.id.toLowerCase();
						return allowedModels.some((wl) => {
							const wlLower = wl.toLowerCase();
							// Match provider/model format (e.g., "openrouter/glm-4")
							if (wlLower.includes('/')) {
								return providerModelId === wlLower || providerModelId.startsWith(wlLower + '/');
							}
							// Legacy support: match just model ID for backward compatibility
							return (
								modelIdLower === wlLower ||
								(wlLower.length >= 7 && modelIdLower.startsWith(wlLower))
							);
						});
					});
				}

				return filteredModels.map((m) => ({
					...m,
					provider: provider.id
				}));
			});

			console.log(
				`[Settings] Filtered models: ${models.length} from ${totalModels} | whitelist:`,
				allowedModels
			);
		}
	} catch (err) {
		console.error('[Settings] FAILED to load all providers:', err);
	}

	// Second pass: fill in modelProvider from models list for function defaults
	// This is needed because database might store modelId without provider prefix
	for (const type of ['executor', 'judge', 'improve'] as const) {
		const config = settings[type];
		if (config && !config.modelProvider) {
			const model = models.find((m: unknown) => {
				const typedModel = m as { id: string; provider: string };
				return typedModel.id === config.modelId;
			}) as { id: string; provider: string } | undefined;
			if (model?.provider) {
				settings[type] = {
					...config,
					modelProvider: model.provider,
					providerId: model.provider
				};
				console.log(
					`[Settings] Filled provider for ${type}: ${model.provider} (from model lookup)`
				);
			}
		}
	}

	// Load council agents
	console.log('[Settings] Loading council agents...');
	let councilAgentsList: CouncilAgent[] = [];
	try {
		// Get all council agents from the database
		const result = await db.select().from(councilAgents).all();
		console.log('[Settings] Raw council agents query result:', result.length);

		// Enrich with model info - look up model details from the models list
		councilAgentsList = result.map((agent) => {
			// Try to find model name from the models list (fallback)
			const model = models.find((m: unknown) => (m as { id: string }).id === agent.modelId) as
				| { id: string; name: string; provider: string; logo?: string }
				| undefined;

			// Extract provider from modelId format (provider/model) or use model's provider
			let providerId: string | undefined;
			let modelIdOnly = agent.modelId;
			if (agent.modelId.includes('/')) {
				const parts = agent.modelId.split('/');
				providerId = parts[0];
				modelIdOnly = parts.slice(1).join('/');
			} else if (model?.provider) {
				providerId = model.provider;
			}

			// Use stored values from database first, then fallback to models list lookup
			const resolvedModelName = agent.modelName || model?.name || agent.modelId;
			return {
				id: String(agent.id),
				name: resolvedModelName, // Required field - use resolved model name
				modelId: agent.modelName ? modelIdOnly : agent.modelId, // Store just the model ID part
				modelName: resolvedModelName,
				providerId: agent.modelProvider || providerId,
				modelProvider: agent.modelProvider || model?.provider || providerId,
				modelLogo: agent.modelLogo || model?.logo,
				temperature: agent.temperature,
				maxTokens: agent.maxTokens,
				promptLinkId: agent.promptLinkId || undefined,
				modelVariant: agent.modelVariant ?? undefined,
				createdAt: agent.createdAt?.toISOString(),
				updatedAt: agent.updatedAt?.toISOString()
			};
		});

		console.log('[Settings] Council agents loaded:', councilAgentsList.length);
	} catch (err) {
		console.error('[Settings] Error loading council agents:', err);
	}

	return {
		settings,
		connection,
		models,
		allProviders,
		connectedProviderIds,
		allowedModels,
		prompts: promptsList,
		councilAgents: councilAgentsList
	};
};

export const actions: Actions = {
	saveDefaults: async ({ request }) => {
		const data = await request.json();

		// TODO: Add Zod validation

		await db
			.insert(adminSettings)
			.values({
				key: SETTINGS_KEY,
				category: SETTINGS_CATEGORY,
				value: JSON.stringify(data),
				updatedBy: 'admin'
			})
			.onConflictDoUpdate({
				target: adminSettings.key,
				set: {
					value: JSON.stringify(data),
					updatedAt: new Date(),
					updatedBy: 'admin'
				}
			});

		return json({ success: true });
	}
};
