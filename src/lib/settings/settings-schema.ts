import { SettingsSchemaRegistry } from './schema-registry';
import {
	connectionBlock,
	providersBlock,
	modelsBlock,
	policyBlock,
	defaultsBlock
} from './blocks';

/**
 * Global settings registry instance with all blocks registered.
 */
export const settingsRegistry = new SettingsSchemaRegistry();

// Register all settings blocks
settingsRegistry.registerBlock(connectionBlock);
settingsRegistry.registerBlock(providersBlock);
settingsRegistry.registerBlock(modelsBlock);
settingsRegistry.registerBlock(policyBlock);
settingsRegistry.registerBlock(defaultsBlock);

/**
 * Get the default values for all registered settings.
 */
export function getDefaultValues() {
	return settingsRegistry.getDefaultValues();
}
