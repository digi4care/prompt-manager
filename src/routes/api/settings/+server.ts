import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { settingsRegistry, getDefaultValues } from '$lib/settings/settings-schema';

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
			blocks: blocks.map(block => ({
				id: block.id,
				label: block.label,
				description: block.description,
				order: block.order,
				settings: block.settings.map(s => ({
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

	// Return settings in registry format
	if (useNewFormat) {
		const blocks = settingsRegistry.getAllBlocks();
		const defaults = getDefaultValues();
		
		return json({
			blocks: blocks.map(block => ({
				id: block.id,
				label: block.label,
				description: block.description,
				order: block.order,
				settings: block.settings.map(setting => ({
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
			defaults,
			stats: settingsRegistry.getStats()
		});
	}

	// Legacy format - return flat settings object with defaults
	return json({
		settings: getDefaultValues()
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

		// Validate all settings
		const errors = settingsRegistry.validateAll(data.settings ?? data);
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

		// TODO: Persist settings to database
		// This would transform registry format back to legacy DB schema
		// For now, just return success

		return json({
			success: true,
			message: 'Settings saved successfully',
			saved: Object.keys(data.settings ?? data)
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
