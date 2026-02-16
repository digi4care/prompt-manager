import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';
import getPort, { portNumbers } from 'get-port';
import type { OpenCodeConnection, OpenCodeConnectionSettings } from './types';
import { buildRemoteUrl } from './build-remote-url';
import {
	DEFAULT_LOCAL_HOSTNAME,
	DEFAULT_LOCAL_PORT_RANGE,
	validateSettings
} from './validate-settings';

function parsePortFromBaseUrl(baseUrl: string): number {
	const parsed = new URL(baseUrl);
	if (parsed.port) {
		return Number(parsed.port);
	}
	return parsed.protocol === 'https:' ? 443 : 80;
}

function buildBasicAuthHeader(username: string, password: string): string {
	const credentials = Buffer.from(`${username}:${password}`).toString('base64');
	return `Basic ${credentials}`;
}

function mergeRequestInit(init?: RequestInit, authHeader?: string): RequestInit {
	if (!authHeader) {
		return init ?? {};
	}

	const headers = new Headers(init?.headers);
	headers.set('Authorization', authHeader);

	return {
		...init,
		headers
	};
}

export async function createOpenCodeConnection(
	rawSettings: OpenCodeConnectionSettings
): Promise<OpenCodeConnection> {
	const settings = validateSettings(rawSettings);

	if (settings.mode === 'local') {
		const hostname = settings.local?.hostname ?? DEFAULT_LOCAL_HOSTNAME;
		const portRange = settings.local?.portRange ?? DEFAULT_LOCAL_PORT_RANGE;

		const port = await getPort({
			host: hostname,
			port: portNumbers(portRange.min, portRange.max)
		});

		const instance = await createOpencode({ hostname, port });
		const baseUrl = instance.server.url;

		return {
			client: instance.client,
			close: async () => {
				await Promise.resolve(instance.server.close());
			},
			meta: {
				mode: 'local',
				baseUrl,
				port,
				startedLocalServer: true
			},
			rawRequest: async (path, init) => {
				const url =
					path.startsWith('http://') || path.startsWith('https://') ? path : `${baseUrl}${path}`;
				return fetch(url, init);
			}
		};
	}

	const remote = settings.remote ?? {};
	const baseUrl = buildRemoteUrl(remote);
	const authHeader =
		remote.password && remote.password.length > 0
			? buildBasicAuthHeader(
					remote.username && remote.username.trim().length > 0
						? remote.username.trim()
						: process.env.OPENCODE_SERVER_USERNAME || 'opencode',
					remote.password
				)
			: undefined;

	const client = createOpencodeClient({
		baseUrl,
		...(authHeader
			? {
					fetch: (input: RequestInfo | URL, init?: RequestInit) => {
						const request = new Request(input, init);
						const headers = new Headers(request.headers);
						headers.set('Authorization', authHeader);
						return fetch(new Request(request, { headers }));
					}
				}
			: {})
	});

	return {
		client,
		close: async () => {},
		meta: {
			mode: 'remote',
			baseUrl,
			port: parsePortFromBaseUrl(baseUrl),
			startedLocalServer: false
		},
		rawRequest: async (path, init) => {
			const endpoint =
				path.startsWith('http://') || path.startsWith('https://') ? path : `${baseUrl}${path}`;
			return fetch(endpoint, mergeRequestInit(init, authHeader));
		}
	};
}
