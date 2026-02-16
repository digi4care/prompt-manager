import type { OpenCodeConnection, OpenCodeHealthResult } from './types';

function getVersionValue(data: unknown): string | undefined {
	if (!data || typeof data !== 'object') {
		return undefined;
	}

	const record = data as Record<string, unknown>;
	if (typeof record.version === 'string' && record.version.length > 0) {
		return record.version;
	}

	if (typeof record.status === 'string' && record.status.length > 0) {
		return record.status;
	}

	return undefined;
}

function extractMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (typeof error === 'string' && error.length > 0) {
		return error;
	}

	return 'Unknown error';
}

async function tryEndpointHealth(
	connection: OpenCodeConnection
): Promise<OpenCodeHealthResult | null> {
	try {
		const healthResponse = await connection.rawRequest('/global/health');
		if (healthResponse.ok) {
			const data = (await healthResponse.json()) as unknown;
			const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
			const healthy = typeof record.healthy === 'boolean' ? record.healthy : true;

			return {
				healthy,
				connected: healthy,
				mode: connection.meta.mode,
				baseUrl: connection.meta.baseUrl,
				port: connection.meta.port,
				startedLocalServer: connection.meta.startedLocalServer,
				version: getVersionValue(data)
			};
		}
	} catch {
		// Ignore and try providers endpoint fallback next.
	}

	try {
		const providersResponse = await connection.rawRequest('/config/providers');
		if (providersResponse.ok) {
			return {
				healthy: true,
				connected: true,
				mode: connection.meta.mode,
				baseUrl: connection.meta.baseUrl,
				port: connection.meta.port,
				startedLocalServer: connection.meta.startedLocalServer,
				version: 'endpoint-providers-fallback'
			};
		}
	} catch {
		// Ignore and return null so caller can surface SDK error.
	}

	return null;
}

export async function healthCheck(connection: OpenCodeConnection): Promise<OpenCodeHealthResult> {
	let sdkErrorMessage: string | null = null;

	try {
		const globalClient = connection.client.global as unknown as {
			health?: () => Promise<{ data?: unknown; error?: { message?: string } }>;
		};
		const configClient = connection.client.config as unknown as {
			providers?: () => Promise<{ data?: unknown; error?: { message?: string } }>;
		};

		if (typeof globalClient.health !== 'function') {
			if (typeof configClient.providers === 'function') {
				try {
					const providersResult = await configClient.providers();
					if (!providersResult.error) {
						return {
							healthy: true,
							connected: true,
							mode: connection.meta.mode,
							baseUrl: connection.meta.baseUrl,
							port: connection.meta.port,
							startedLocalServer: connection.meta.startedLocalServer,
							version: 'providers-fallback'
						};
					}

					sdkErrorMessage =
						providersResult.error?.message || 'OpenCode SDK providers() fallback returned an error';
				} catch (error) {
					sdkErrorMessage = extractMessage(error);
				}
			} else {
				sdkErrorMessage = 'OpenCode SDK client does not expose global.health()';
			}

			const endpointFallback = await tryEndpointHealth(connection);
			if (endpointFallback) {
				return endpointFallback;
			}

			return {
				healthy: false,
				connected: false,
				mode: connection.meta.mode,
				baseUrl: connection.meta.baseUrl,
				port: connection.meta.port,
				startedLocalServer: connection.meta.startedLocalServer,
				error: sdkErrorMessage || 'OpenCode SDK client does not expose global.health()'
			};
		}

		const result = await globalClient.health();

		if (result.error) {
			sdkErrorMessage = result.error.message || 'Health check failed';

			const endpointFallback = await tryEndpointHealth(connection);
			if (endpointFallback) {
				return endpointFallback;
			}

			return {
				healthy: false,
				connected: false,
				mode: connection.meta.mode,
				baseUrl: connection.meta.baseUrl,
				port: connection.meta.port,
				startedLocalServer: connection.meta.startedLocalServer,
				error: sdkErrorMessage
			};
		}

		return {
			healthy: true,
			connected: true,
			mode: connection.meta.mode,
			baseUrl: connection.meta.baseUrl,
			port: connection.meta.port,
			startedLocalServer: connection.meta.startedLocalServer,
			version: getVersionValue(result.data)
		};
	} catch (error) {
		sdkErrorMessage = extractMessage(error);

		const endpointFallback = await tryEndpointHealth(connection);
		if (endpointFallback) {
			return endpointFallback;
		}

		return {
			healthy: false,
			connected: false,
			mode: connection.meta.mode,
			baseUrl: connection.meta.baseUrl,
			port: connection.meta.port,
			startedLocalServer: connection.meta.startedLocalServer,
			error: sdkErrorMessage
		};
	}
}
