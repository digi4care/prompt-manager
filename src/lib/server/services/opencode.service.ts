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
			const errorMsg =
				typeof result.error === 'object' && result.error && 'message' in result.error
					? String((result.error as { message?: unknown }).message)
					: 'Failed to get providers';
			return {
				healthy: false,
				connected: false,
				baseUrl: config.baseUrl || 'http://127.0.0.1:4096',
				error: errorMsg
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
		const errorMsg =
			typeof result.error === 'object' && result.error && 'message' in result.error
				? String((result.error as { message?: unknown }).message)
				: 'Unknown error';
		throw new Error(`Failed to get providers: ${errorMsg}`);
	}

	return result.data;
}

// In-memory catalog cache
let catalogCache: {
	data: unknown;
	timestamp: number;
	ttlSeconds: number;
} | null = null;

const DEFAULT_CATALOG_TTL_SECONDS = 300; // 5 minutes

/**
 * Get the provider/model catalog (with in-memory TTL cache)
 */
export async function getProviderCatalog(forceRefresh = false): Promise<{
	providers: unknown[];
	default?: { model?: string };
	ttlSeconds: number;
	cached: boolean;
}> {
	const now = Date.now();

	// Return cached if valid and not forcing refresh
	if (!forceRefresh && catalogCache) {
		const age = (now - catalogCache.timestamp) / 1000;
		if (age < catalogCache.ttlSeconds) {
			const data = catalogCache.data as {
				providers?: unknown[];
				default?: { model?: string };
			};
			return {
				providers: data.providers || [],
				default: data.default,
				ttlSeconds: catalogCache.ttlSeconds,
				cached: true
			};
		}
	}

	// Fetch fresh data
	const data = await getProviders();

	catalogCache = {
		data,
		timestamp: now,
		ttlSeconds: DEFAULT_CATALOG_TTL_SECONDS
	};

	return {
		providers: (data as { providers?: unknown[] }).providers || [],
		default: (data as { default?: { model?: string } }).default,
		ttlSeconds: DEFAULT_CATALOG_TTL_SECONDS,
		cached: false
	};
}

/**
 * Force refresh the provider catalog
 */
export async function refreshProviderCatalog(): Promise<{
	providers: unknown[];
	default?: { model?: string };
	ttlSeconds: number;
	cached: boolean;
}> {
	return getProviderCatalog(true);
}

/**
 * Clear the catalog cache (call when connection settings change)
 */
export function clearCatalogCache(): void {
	catalogCache = null;
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
