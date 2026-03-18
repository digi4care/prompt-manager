import { z } from 'zod';
import type { SettingsBlock } from '../types';
import { modelValidators } from '../validators';

/**
 * Models settings block
 *
 * Manages model catalog and selection
 */
export const modelsBlock: SettingsBlock = {
	id: 'models',
	label: 'Models',
	description: 'Manage available AI models',
	order: 3,
	visibleWhen: (values) =>
		values['connection.status'] === 'connected' &&
		Array.isArray(values['providers.selected']) &&
		values['providers.selected'].length > 0,
	settings: [
		{
			key: 'selected',
			type: 'string',
			label: 'Selected Model',
			description: 'Default model to use for AI operations',
			defaultValue: '',
			schema: modelValidators.modelId,
			requires: ['providers.selected'],
			visibleWhen: (values) =>
				Array.isArray(values['providers.selected']) &&
				values['providers.selected'].length > 0,
			order: 1
		},
		{
			key: 'catalog',
			type: 'object',
			label: 'Model Catalog',
			description: 'Available models from all providers',
			defaultValue: {},
			schema: modelValidators.catalog,
			requires: ['providers.selected'],
			order: 2,
			advanced: true
		},
		{
			key: 'favorites',
			type: 'array',
			label: 'Favorite Models',
			description: 'Quick access to frequently used models',
			defaultValue: [],
			schema: z.array(z.string()),
			requires: ['catalog'],
			order: 3,
			advanced: true
		}
	]
};

export default modelsBlock;
