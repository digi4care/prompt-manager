import { SettingsSchemaRegistry } from './schema-registry';
import {
	connectionBlock,
	providersBlock,
	modelsBlock,
	policyBlock,
	defaultsBlock
} from './blocks';
import type { SettingsBlock } from './types';
import { z } from 'zod';

/**
 * Global settings registry instance with all blocks registered.
 */
export const settingsRegistry = new SettingsSchemaRegistry();

// Register all core settings blocks
settingsRegistry.registerBlock(connectionBlock);
settingsRegistry.registerBlock(providersBlock);
settingsRegistry.registerBlock(modelsBlock);
settingsRegistry.registerBlock(policyBlock);
settingsRegistry.registerBlock(defaultsBlock);

// Additional blocks for advanced features

/**
 * LLM Council settings block
 */
export const councilBlock: SettingsBlock = {
	id: 'council',
	label: 'LLM Council',
	description: 'Configure council members for consensus decision making',
	order: 6,
	settings: [
		{
			key: 'enabled',
			type: 'boolean',
			label: 'Enable Council',
			description: 'Use multiple models for consensus decisions',
			defaultValue: false,
			schema: z.boolean(),
			order: 1
		},
		{
			key: 'members',
			type: 'array',
			label: 'Council Members',
			description: 'Models to include in council decisions',
			defaultValue: [],
			schema: z.array(z.string()),
			requires: ['enabled'],
			visibleWhen: (values) => values['council.enabled'] === true,
			order: 2
		},
		{
			key: 'consensusThreshold',
			type: 'number',
			label: 'Consensus Threshold',
			description: 'Percentage of agreement required for consensus',
			defaultValue: 0.7,
			schema: z.number().min(0).max(1),
			requires: ['enabled'],
			visibleWhen: (values) => values['council.enabled'] === true,
			order: 3,
			advanced: true
		}
	]
};

/**
 * Review settings block
 */
export const reviewBlock: SettingsBlock = {
	id: 'review',
	label: 'Review Settings',
	description: 'Configure human review requirements',
	order: 7,
	settings: [
		{
			key: 'requireApproval',
			type: 'boolean',
			label: 'Require Approval',
			description: 'Require manual approval for AI-generated changes',
			defaultValue: false,
			schema: z.boolean(),
			order: 1
		},
		{
			key: 'autoReview',
			type: 'boolean',
			label: 'Auto Review',
			description: 'Automatically flag changes for review',
			defaultValue: true,
			schema: z.boolean(),
			order: 2
		}
	]
};

// Register additional blocks
settingsRegistry.registerBlock(councilBlock);
settingsRegistry.registerBlock(reviewBlock);

/**
 * Get the default values for all registered settings.
 */
export function getDefaultValues() {
	return settingsRegistry.getDefaultValues();
}
