import { z } from 'zod';
import type { SettingsBlock } from '../types';
import { stringValidators, connectionValidators, numberValidators } from '../validators';

/**
 * Connection settings block
 *
 * Manages local/remote connection configuration
 */
export const connectionBlock: SettingsBlock = {
	id: 'connection',
	label: 'Connection',
	description: 'Configure how to connect to OpenCode',
	order: 1,
	settings: [
		{
			key: 'mode',
			type: 'enum',
			label: 'Connection Mode',
			description: 'Choose between local OpenCode instance or remote server',
			defaultValue: 'local',
			schema: connectionValidators.mode,
			options: [
				{ value: 'local', label: 'Local' },
				{ value: 'remote', label: 'Remote' }
			],
			impactedFeatures: ['connection'],
			order: 1
		},
		{
			key: 'local.hostname',
			type: 'string',
			label: 'Local Hostname',
			description: 'Hostname or IP address for local OpenCode instance',
			defaultValue: '127.0.0.1',
			schema: stringValidators.hostname,
			requires: ['mode'],
			visibleWhen: (values) => values['connection.mode'] === 'local',
			impactedFeatures: ['connection'],
			order: 2,
			category: 'Local Connection'
		},
		{
			key: 'local.port',
			type: 'number',
			label: 'Local Port',
			description: 'Port number for local OpenCode instance',
			defaultValue: 3000,
			schema: numberValidators.port,
			requires: ['mode'],
			visibleWhen: (values) => values['connection.mode'] === 'local',
			impactedFeatures: ['connection'],
			order: 3,
			category: 'Local Connection'
		},
		{
			key: 'remote.host',
			type: 'string',
			label: 'Remote Host',
			description: 'URL of the remote OpenCode server',
			defaultValue: '',
			schema: stringValidators.url,
			requires: ['mode'],
			visibleWhen: (values) => values['connection.mode'] === 'remote',
			impactedFeatures: ['connection'],
			order: 4,
			category: 'Remote Connection'
		},
		{
			key: 'remote.apiKey',
			type: 'string',
			label: 'API Key',
			description: 'API key for remote server authentication',
			defaultValue: '',
			schema: stringValidators.apiKey.optional(),
			requires: ['mode', 'remote.host'],
			visibleWhen: (values) => values['connection.mode'] === 'remote',
			order: 5,
			category: 'Remote Connection',
			impactedFeatures: ['connection'],
			advanced: true
		},
		{
			key: 'status',
			type: 'enum',
			label: 'Connection Status',
			description: 'Current connection status',
			defaultValue: 'disconnected',
			schema: connectionValidators.status,
			options: [
				{ value: 'disconnected', label: 'Disconnected' },
				{ value: 'connecting', label: 'Connecting' },
				{ value: 'connected', label: 'Connected' },
				{ value: 'error', label: 'Error' }
			],
			requires: ['mode'],
			impactedFeatures: ['connection', 'providers', 'catalog'],
			order: 6,
			affects: ['providers.selected', 'models.catalog']
		}
	]
};

export default connectionBlock;
