import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db/client';
import { adminSettings, opencodeConnection } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getAllProviders, getProviderCatalog } from '$lib/server/services/opencode.service';
import { error, json } from '@sveltejs/kit';

const SETTINGS_KEY = 'function_defaults';
const SETTINGS_CATEGORY = 'opencode';

interface FunctionDefault {
	type: 'executor' | 'judge' | 'improve';
	modelId: string | null;
	modelName?: string;
	providerId?: string;
	temperature: number;
	maxTokens: number;
	promptId?: string;
}

interface CouncilAgent {
	id: string;
	name: string;
	modelId: string | null;
	modelName?: string;
	providerId?: string;
	temperature: number;
	maxTokens: number;
	systemPrompt?: string;
}

interface FunctionDefaultsSettings {
	executor: FunctionDefault;
	judge: FunctionDefault;
	improve: FunctionDefault;
	councilAgents: CouncilAgent[];
}

const DEFAULT_SETTINGS: FunctionDefaultsSettings = {
	executor: { type: 'executor', modelId: null, temperature: 0.7, maxTokens: 4096 },
	judge: { type: 'judge', modelId: null, temperature: 0.3, maxTokens: 2048 },
	improve: { type: 'improve', modelId: null, temperature: 0.5, maxTokens: 4096 },
	councilAgents: []
};

export const load: PageServerLoad = async () => {
	// Load function defaults
	const settingsRow = await db
		.select()
		.from(adminSettings)
		.where(eq(adminSettings.key, SETTINGS_KEY))
		.limit(1);

	let settings = DEFAULT_SETTINGS;
	if (settingsRow.length > 0) {
		try {
			const parsed = JSON.parse(settingsRow[0].value) as unknown;
			if (parsed && typeof parsed === 'object') {
				settings = { ...DEFAULT_SETTINGS, ...parsed } as FunctionDefaultsSettings;
			}
		} catch {
			// Use defaults if parse fails
		}
	}

	// Load connection status
	const connectionRow = await db
		.select()
		.from(opencodeConnection)
		.where(eq(opencodeConnection.id, 1))
		.limit(1);

	const connection = connectionRow[0] ?? null;

	// Load all providers directly from OpenCode server
	let models: unknown[] = [];
	let allProviders: unknown[] = [];
	let connectedProviderIds: string[] = [];
	try {
		console.log('[Settings] Loading all providers from OpenCode...');
		const opencodeUrl = connection?.baseUrl ?? 'http://127.0.0.1:10000';
		const response = await fetch(`${opencodeUrl}/provider`);
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		const catalog = await response.json();
		console.log('[Settings] All providers loaded:', catalog.all?.length ?? 0);
		// Store all providers
		allProviders = catalog.all ?? [];
		connectedProviderIds = catalog.connected ?? [];
		// Flatten providers to get all models
		if (catalog.all && Array.isArray(catalog.all)) {
			models = catalog.all.flatMap((p: unknown) => {
				const provider = p as Record<string, unknown>;
				const providerModels = (provider.models as unknown[]) ?? [];
				return providerModels.map((m: unknown) => ({
					...(m as Record<string, unknown>),
					provider: provider.id
				}));
			});
		}
	} catch (err) {
		console.error('[Settings] FAILED to load all providers:', err);
	}

	return {
		settings,
		connection,
		models,
		allProviders,
		connectedProviderIds
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
