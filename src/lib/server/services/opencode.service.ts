/**
 * OpenCode SDK Service
 *
 * Two connection modes:
 * - LOCAL: Uses createOpencode() - embedded server + client (NO separate server needed!)
 * - REMOTE: Uses createOpencodeClient() - connects to existing server with auth
 */
import { createOpencode, createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk';
import { getOpencodeConnectionConfig } from './opencode-connection.service.js';

// Singleton instances
let localInstance: Awaited<ReturnType<typeof createOpencode>> | null = null;
let remoteClient: OpencodeClient | null = null;
let currentMode: 'local' | 'remote' | null = null;

/**
 * Get or create the OpenCode client based on connection mode
 */
export async function getOpencodeClient(): Promise<OpencodeClient> {
	const config = await getOpencodeConnectionConfig();

	// Reset if mode changed
	if (currentMode && currentMode !== config.mode) {
		resetOpencodeClient();
	}
	currentMode = config.mode;

	if (config.mode === 'local') {
		// LOCAL mode: Use createOpencode() - starts embedded server automatically
		// NO need for user to run `opencode serve`!
		if (!localInstance) {
			console.log('[OpenCode] Starting embedded server...');
			localInstance = await createOpencode({
				hostname: '127.0.0.1',
				port: 4096
			});
			console.log('[OpenCode] Embedded server started at:', localInstance.server.url);
		}
		return localInstance.client;
	} else {
		// REMOTE mode: Use createOpencodeClient() with auth
		if (!remoteClient) {
			const baseUrl = config.baseUrl || 'http://localhost:4096';
			console.log('[OpenCode] Connecting to remote server:', baseUrl);

			remoteClient = createOpencodeClient({
				baseUrl,
				// Custom fetch with Basic Auth if password is set
				...(config.password && {
					fetch: (request: Request) => {
						const headers = new Headers(request.headers);
						headers.set('Authorization', `Basic ${btoa(`opencode:${config.password}`)}`);
						return fetch(new Request(request, { headers }));
					}
				})
			});
		}
		return remoteClient;
	}
}

/**
 * Reset clients (call when connection settings change)
 */
export function resetOpencodeClient(): void {
	if (localInstance) {
		console.log('[OpenCode] Closing embedded server...');
		localInstance.server.close();
		localInstance = null;
	}
	remoteClient = null;
	currentMode = null;
}

/**
 * Check OpenCode health by trying to get providers
 * (The SDK doesn't have a health() method despite docs saying so)
 */
export async function checkOpencodeHealth(): Promise<{
	healthy: boolean;
	connected: boolean;
	version?: string;
	baseUrl?: string;
	error?: string;
}> {
	try {
		const config = await getOpencodeConnectionConfig();
		const client = await getOpencodeClient();

		// Try to get providers as a health check
		const result = await client.config.providers();

		if (result.error) {
			return {
				healthy: false,
				connected: false,
				baseUrl: config.baseUrl || 'http://127.0.0.1:4096',
				error: result.error.message || 'Failed to get providers'
			};
		}

		return {
			healthy: true,
			connected: true,
			baseUrl: config.baseUrl || localInstance?.server.url || 'http://127.0.0.1:4096',
			version: result.data?.default?.model
				? `SDK (${result.data.providers?.length || 0} providers)`
				: 'Connected'
		};
	} catch (error) {
		const config = await getOpencodeConnectionConfig();
		return {
			healthy: false,
			connected: false,
			baseUrl: config.baseUrl || 'http://127.0.0.1:4096',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Get available providers from OpenCode
 */
export async function getProviders() {
	const client = await getOpencodeClient();
	const result = await client.config.providers();

	if (result.error) {
		throw new Error(`Failed to get providers: ${result.error.message}`);
	}

	return result.data;
}

// Types
export interface ProviderInfo {
	id: string;
	name: string;
	type: string;
	models?: ModelInfo[];
}

export interface ModelInfo {
	id: string;
	name: string;
	context_window?: number;
	supports_vision?: boolean;
}
