import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/client';
import { adminSettings, opencodeConnection, prompts, councilAgents } from '$lib/server/db/schema';
import { eq, asc, isNull } from 'drizzle-orm';
import {
	getAllProviders,
	type ProviderInfo
} from '$lib/server/services/opencode.service';
import { getFunctionDefaults } from '$lib/server/services/function-defaults.service';

// New Settings Schema Registry
import { settingsRegistry, getDefaultValues } from './settings-schema';
import { legacyToRegistry } from '$lib/settings/compat';

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
	thinkingLevel?: string | null;
}

interface CouncilAgent {
	id: string;
	name: string;
	modelId: string;
	temperature: number;
	maxTokens: number;
	promptLinkId?: number | null;
}

export const load: PageServerLoad = async ({ url }) => {
	// Load function defaults from the function_defaults table
	const functionDefaultsList = await getFunctionDefaults();

	// Convert array to object keyed by functionType
	const settings: Record<string, FunctionDefault> = {};
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
		} catch (e) {
			console.error('[Settings] Failed to parse policy settings:', e);
		}
	}

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
		const catalog = await getAllProviders();
		allProviders = catalog.all ?? [];
		connectedProviderIds = catalog.connected ?? [];

		if (catalog.all && Array.isArray(catalog.all)) {
			const connectedIds = (catalog.connected ?? []).map((p: string) => p.toLowerCase());

			models = catalog.all.flatMap((p: unknown) => {
				const provider = p as ProviderInfo;

				if (!connectedIds.includes(provider.id.toLowerCase())) {
					return [];
				}

				return Object.values(provider.models ?? {}).map((model) => ({
					...model,
					provider: provider.id
				}));
			});
		}
	} catch (err) {
		console.error('[Settings] Error loading providers:', err);
	}

	// Load council agents
	let councilAgentsList: CouncilAgent[] = [];
	try {
		const agents = await db
			.select()
			.from(councilAgents);

		councilAgentsList = agents.map((agent) => {
			const modelParts = agent.modelId.split('/');
			const providerId = modelParts.length > 1 ? modelParts[0] : undefined;
			const modelId = modelParts.length > 1 ? modelParts.slice(1).join('/') : agent.modelId;

		const model = (models as { id: string; name: string; logo?: string }[]).find((m) => m.id === agent.modelId);

			return {
				id: String(agent.id),
				name: agent.modelName || '',
				modelId: modelId,
				modelProvider: providerId,
				modelLogo: agent.modelLogo || model?.logo,
				temperature: agent.temperature,
				maxTokens: agent.maxTokens,
				promptLinkId: agent.promptLinkId || undefined,
				modelVariant: agent.modelVariant ?? undefined
			};
		});
	} catch (err) {
		console.error('[Settings] Error loading council agents:', err);
	}

	// Serialize registry blocks for new settings system
	const allBlocks = settingsRegistry.getAllBlocks();
	const serializableBlocks = allBlocks.map(block => ({
		id: block.id,
		label: block.label,
		description: block.description,
		order: block.order,
		settings: block.settings.map(setting => ({
			key: setting.key,
			type: setting.type,
			label: setting.label,
			description: setting.description,
			defaultValue: setting.defaultValue,
			category: setting.category,
			order: setting.order,
			advanced: setting.advanced,
			options: setting.options
		}))
	}));

	const registrySettings = legacyToRegistry({ defaults: settings });
	const defaultValues = getDefaultValues();
	const mergedRegistrySettings = { ...defaultValues, ...registrySettings };

	return {
		// Legacy data (backward compatibility)
		settings,
		connection,
		models,
		allProviders,
		connectedProviderIds,
		allowedModels,
		prompts: promptsList,
		councilAgents: councilAgentsList,
		// New registry data
		registrySettings: mergedRegistrySettings,
		registryBlocks: serializableBlocks
	};
};
