import { z } from 'zod';
import type { SettingsBlock } from '../types';
import { providerValidators } from '../validators';

/**
 * Providers settings block
 *
 * Manages AI provider connections and selection
 */
export const providersBlock: SettingsBlock = {
	id: 'providers',
	label: 'Providers',
	description: 'Configure AI model providers',
	order: 2,
	visibleWhen: (values) => values['connection.status'] === 'connected',
	settings: [
		{
			key: 'selected',
			type: 'array',
			label: 'Selected Providers',
			description: 'AI providers to use for model access',
			defaultValue: [],
			schema: providerValidators.selectedProviders,
			requires: ['connection.status'],
			visibleWhen: (values) => values['connection.status'] === 'connected',
			impactedFeatures: ['providers', 'catalog'],
			order: 1
		},
		{
			key: 'openai.apiKey',
			type: 'string',
			label: 'OpenAI API Key',
			description: 'API key for OpenAI services',
			defaultValue: '',
			schema: z.string().min(1).optional(),
			requires: ['selected'],
			visibleWhen: (values) =>
				Array.isArray(values['providers.selected']) &&
				values['providers.selected'].includes('openai'),
			impactedFeatures: ['providers'],
			order: 2,
			category: 'OpenAI'
		},
		{
			key: 'anthropic.apiKey',
			type: 'string',
			label: 'Anthropic API Key',
			description: 'API key for Anthropic Claude',
			defaultValue: '',
			schema: z.string().min(1).optional(),
			requires: ['selected'],
			visibleWhen: (values) =>
				Array.isArray(values['providers.selected']) &&
				values['providers.selected'].includes('anthropic'),
			impactedFeatures: ['providers'],
			order: 3,
			category: 'Anthropic'
		},
		{
			key: 'ollama.url',
			type: 'string',
			label: 'Ollama URL',
			description: 'URL for local Ollama instance',
			defaultValue: 'http://localhost:11434',
			schema: z.string().url(),
			requires: ['selected'],
			visibleWhen: (values) =>
				Array.isArray(values['providers.selected']) &&
				values['providers.selected'].includes('ollama'),
			impactedFeatures: ['providers'],
			order: 4,
			category: 'Ollama'
		}
	]
};

export default providersBlock;
