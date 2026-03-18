import { z } from 'zod';
import type { SettingsBlock } from '../types';

/**
 * AI Policy settings block
 *
 * Manages allowed models and usage policies
 */
export const policyBlock: SettingsBlock = {
	id: 'policy',
	label: 'AI Policy',
	description: 'Configure AI usage policies and restrictions',
	order: 4,
	settings: [
		{
			key: 'allowedModels',
			type: 'array',
			label: 'Allowed Models',
			description: 'Whitelist of models that can be used',
			defaultValue: [],
			schema: z.array(z.string()),
			requires: ['models.catalog'],
			order: 1
		},
		{
			key: 'blockedModels',
			type: 'array',
			label: 'Blocked Models',
			description: 'Models explicitly blocked from use',
			defaultValue: [],
			schema: z.array(z.string()),
			order: 2
		},
		{
			key: 'requireApproval',
			type: 'boolean',
			label: 'Require Approval',
			description: 'Require approval for certain operations',
			defaultValue: false,
			schema: z.boolean(),
			order: 3,
			advanced: true
		},
		{
			key: 'maxTokens',
			type: 'number',
			label: 'Maximum Tokens',
			description: 'Maximum tokens allowed per request',
			defaultValue: 4096,
			schema: z.number().int().positive(),
			order: 4,
			advanced: true
		}
	]
};

export default policyBlock;
