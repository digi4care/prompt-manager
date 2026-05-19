import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { settingsRegistry, getDefaultValues } from '$lib/settings/settings-schema';
import { updateSetting, getSetting } from '$lib/server/services/admin-settings.service';

const REGISTRY_SETTINGS_KEY = 'registry_settings';

/**
 * Load persisted registry settings from database
 */
async function loadPersistedSettings(): Promise<Record<string, unknown>> {
	try {
		const stored = await getSetting(REGISTRY_SETTINGS_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (err) {
		console.error('[API Settings] Error loading persisted settings:', err);
	}
	return {};
}

/**
 * GET /api/settings
 *
 * Returns all settings with their current values, defaults, and metadata.
 * Query parameters:
 * - ?new=true - Return settings in registry format
 * - ?schema=true - Return full schema definition
 * - ?impact=key - Return impact analysis for a setting
 */
export const GET: RequestHandler = async ({ url }) => {
	const useNewFormat = url.searchParams.has('new');
	const returnSchema = url.searchParams.has('schema');
	const impactKey = url.searchParams.get('impact');

	// Return impact analysis if requested
	if (impactKey) {
		const impact = settingsRegistry.getImpactAnalysis(impactKey);
		return json({
			setting: impactKey,
			impact: {
				directlyAffected: impact.directlyAffected,
				transitivelyAffected: impact.transitivelyAffected,
				blocksToRevalidate: impact.blocksToRevalidate,
				visibilityChanges: impact.visibilityChanges
			}
		});
	}

	// Return full schema if requested
	if (returnSchema) {
		const blocks = settingsRegistry.getAllBlocks();
		const graph = settingsRegistry.getDependencyGraph();

		return json({
			version: '1.0.0',
			blocks: blocks.map((block) => ({
				id: block.id,
				label: block.label,
				description: block.description,
				order: block.order,
				settings: block.settings.map((s) => ({
					key: s.key,
					type: s.type,
					label: s.label,
					description: s.description,
					defaultValue: s.defaultValue,
					requires: s.requires,
					affects: s.affects,
					category: s.category,
					order: s.order,
					advanced: s.advanced
				}))
			})),
			dependencies: graph.toJSON(),
			stats: settingsRegistry.getStats()
		});
	}

	// Load persisted settings and merge with defaults
	const persisted = await loadPersistedSettings();
	const defaults = getDefaultValues();
	const merged = { ...defaults, ...persisted };

	// Return settings in registry format
	if (useNewFormat) {
		const blocks = settingsRegistry.getAllBlocks();

		return json({
			blocks: blocks.map((block) => ({
				id: block.id,
				label: block.label,
				description: block.description,
				order: block.order,
				settings: block.settings.map((setting) => ({
					key: `${block.id}.${setting.key}`,
					type: setting.type,
					label: setting.label,
					description: setting.description,
					defaultValue: setting.defaultValue,
					category: setting.category,
					advanced: setting.advanced,
					options: setting.options
				}))
			})),
			defaults: merged,
			stats: settingsRegistry.getStats()
		});
	}

	// Legacy format - return flat settings object with merged values
	return json({
		settings: merged
	});
};

/**
 * POST /api/settings
 *
 * Save settings. Validates against registry schema.
 * Body: { validate?: boolean, settings: Record<string, unknown> }
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();
		const validateOnly = data.validate === true;

		// Validate visible settings only
		const errors = settingsRegistry.validateVisible(data.settings ?? data);
		const errorList = Object.entries(errors).filter(([, error]) => error);

		if (errorList.length > 0) {
			return json(
				{
					success: false,
					errors: Object.fromEntries(errorList)
				},
				{ status: 400 }
			);
		}

		// If validate only, return success without saving
		if (validateOnly) {
			return json({
				valid: true,
				message: 'Validation passed'
			});
		}

		// Persist settings to database
		const settingsToSave = data.settings ?? data;
		await updateSetting({
			key: REGISTRY_SETTINGS_KEY,
			value: JSON.stringify(settingsToSave),
			updatedBy: 'registry-api'
		});

		return json({
			success: true,
			message: 'Settings saved successfully',
			saved: Object.keys(settingsToSave)
		});
	} catch (err) {
		console.error('[API Settings] Error saving settings:', err);
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/settings
 *
 * Reset settings to defaults by clearing persisted registry settings.
 */
export const DELETE: RequestHandler = async () => {
	try {
		await updateSetting({
			key: REGISTRY_SETTINGS_KEY,
			value: '{}',
			updatedBy: 'registry-api'
		});

		return json({
			success: true,
			message: 'Settings reset to defaults'
		});
	} catch (err) {
		console.error('[API Settings] Error resetting settings:', err);
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
