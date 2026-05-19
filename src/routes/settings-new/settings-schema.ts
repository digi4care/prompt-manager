/**
 * Settings Schema Registry Instantiation
 * 
 * This file creates and configures the SettingsSchemaRegistry instance
 * for the application settings page.
 */

import {
	SettingsSchemaRegistry,
	connectionBlock,
	providersBlock,
	modelsBlock,
	policyBlock,
	defaultsBlock
} from '$lib/settings';
import type { SettingsBlock, SettingDefinition } from '$lib/settings';
import { z } from 'zod';

// Create registry instance
export const settingsRegistry = new SettingsSchemaRegistry({
	strict: false,
	checkCycles: true,
	enableSideEffects: true
});

// Register core blocks
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

// Export configured registry
export default settingsRegistry;

// Export helper functions
export function getAllBlocks() {
	return settingsRegistry.getAllBlocks();
}

export function getBlock(id: string) {
	return settingsRegistry.getBlock(id);
}

export function getSetting(key: string) {
	return settingsRegistry.getSetting(key);
}

export function getDefaultValues() {
	return settingsRegistry.getDefaultValues();
}

export function validateSetting(key: string, value: unknown) {
	return settingsRegistry.validateSetting(key, value);
}

export function validateAll(values: Record<string, unknown>) {
	return settingsRegistry.validateAll(values);
}

export function validateVisible(values: Record<string, unknown>) {
	return settingsRegistry.validateVisible(values);
}

export function getVisibleBlocks(values: Record<string, unknown>) {
	return settingsRegistry.getVisibleBlocks(values);
}

export function getImpactAnalysis(key: string) {
	return settingsRegistry.getImpactAnalysis(key);
}

// Re-export types
export type { SettingsBlock, SettingDefinition };


// Re-export createSettingsStore for convenience
export { createSettingsStore } from '$lib/stores/settings.svelte';