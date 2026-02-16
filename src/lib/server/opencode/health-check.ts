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

export async function healthCheck(connection: OpenCodeConnection): Promise<OpenCodeHealthResult> {
	try {
		const globalClient = connection.client.global as unknown as {
			health?: () => Promise<{ data?: unknown; error?: { message?: string } }>;
		};
		const configClient = connection.client.config as unknown as {
			providers?: () => Promise<{ data?: unknown; error?: { message?: string } }>;
		};

		if (typeof globalClient.health !== 'function') {
			if (typeof configClient.providers === 'function') {
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
			}

			return {
				healthy: false,
				connected: false,
				mode: connection.meta.mode,
				baseUrl: connection.meta.baseUrl,
				port: connection.meta.port,
				startedLocalServer: connection.meta.startedLocalServer,
				error: 'OpenCode SDK client does not expose global.health()'
			};
		}

		const result = await globalClient.health();

		if (result.error) {
			return {
				healthy: false,
				connected: false,
				mode: connection.meta.mode,
				baseUrl: connection.meta.baseUrl,
				port: connection.meta.port,
				startedLocalServer: connection.meta.startedLocalServer,
				error: result.error.message || 'Health check failed'
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
		return {
			healthy: false,
			connected: false,
			mode: connection.meta.mode,
			baseUrl: connection.meta.baseUrl,
			port: connection.meta.port,
			startedLocalServer: connection.meta.startedLocalServer,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}
