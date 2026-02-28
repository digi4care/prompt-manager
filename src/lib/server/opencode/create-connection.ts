import { createOpencode, createOpencodeClient } from '@opencode-ai/sdk';
import getPort, { portNumbers } from 'get-port';
import type { OpenCodeConnection, OpenCodeConnectionSettings } from './types';
import { buildRemoteUrl } from './build-remote-url';
import {
	DEFAULT_LOCAL_HOSTNAME,
	DEFAULT_LOCAL_PORT_RANGE,
	validateSettings
} from './validate-settings';

// ============================================================================
// AUTO-DISCOVERY PATTERN
// ============================================================================
// Discovers existing OpenCode servers instead of always spawning new ones.
// This ensures all AI features (execution, council, debate) use the same
// connection with configured providers.

/** Discovery probe result */
interface DiscoveryResult {
	found: boolean;
	baseUrl?: string;
	port?: number;
}

/** Default ports to scan for existing OpenCode servers */
const DISCOVERY_PORTS = [
	// Common explicit ports
	4096,
	4097,
	4098,
	4099,
	4100,
	// opencode serve defaults
	10000,
	10001,
	10002,
	10003,
	10004,
	10005,
	// Extended range
	...Array.from({ length: 10 }, (_, i) => 4101 + i)
];

/** Timeout for discovery probes (ms) */
const DISCOVERY_TIMEOUT_MS = 2000;

/**
 * Probe a single port to check if an OpenCode API server is running.
 * Returns true if the server responds with valid JSON to /providers.
 */
async function probePort(hostname: string, port: number): Promise<boolean> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);

	try {
		const response = await fetch(`http://${hostname}:${port}/providers`, {
			method: 'GET',
			signal: controller.signal,
			headers: {
				Accept: 'application/json'
			}
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			return false;
		}

		// Verify it's actually an OpenCode API (returns JSON with providers)
		const contentType = response.headers.get('content-type');
		if (!contentType?.includes('application/json')) {
			return false;
		}

		const data = await response.json();
		// OpenCode /providers returns { providers: [...] } or similar
		return typeof data === 'object' && data !== null;
	} catch {
		clearTimeout(timeoutId);
		return false;
	}
}

/**
 * Discover existing OpenCode servers by probing known ports.
 * Returns the first responding server, or null if none found.
 */
async function discoverOpenCodeServer(
	hostname: string = DEFAULT_LOCAL_HOSTNAME,
	additionalPorts?: number[]
): Promise<DiscoveryResult> {
	const portsToScan = [...DISCOVERY_PORTS, ...(additionalPorts ?? [])];

	// Scan ports in parallel (batches of 5 to avoid overwhelming network)
	const batchSize = 5;
	for (let i = 0; i < portsToScan.length; i += batchSize) {
		const batch = portsToScan.slice(i, i + batchSize);
		const results = await Promise.all(
			batch.map(async (port) => ({
				port,
				found: await probePort(hostname, port)
			}))
		);

		const found = results.find((r) => r.found);
		if (found) {
			console.log(`[OpenCode Discovery] Found existing server at ${hostname}:${found.port}`);
			return {
				found: true,
				baseUrl: `http://${hostname}:${found.port}`,
				port: found.port
			};
		}
	}

	console.log('[OpenCode Discovery] No existing server found, will spawn new one');
	return { found: false };
}

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

		// AUTO-DISCOVERY: First try to find an existing OpenCode server
		const discovery = await discoverOpenCodeServer(hostname, [
			// Also check the configured port range
			...Array.from({ length: portRange.max - portRange.min + 1 }, (_, i) => portRange.min + i)
		]);

		if (discovery.found && discovery.baseUrl && discovery.port) {
			// Use existing server - create client only
			console.log(`[OpenCode] Connecting to existing server at ${discovery.baseUrl}`);
			const client = createOpencodeClient({ baseUrl: discovery.baseUrl });

			return {
				client,
				close: async () => {
					// Don't close server we didn't start
				},
				meta: {
					mode: 'local',
					baseUrl: discovery.baseUrl,
					port: discovery.port,
					startedLocalServer: false // Using discovered server
				},
				rawRequest: async (path, init) => {
					const url =
						path.startsWith('http://') || path.startsWith('https://')
							? path
							: `${discovery.baseUrl}${path}`;
					return fetch(url, init);
				}
			};
		}

		// No existing server found - spawn new one (fallback)
		console.log('[OpenCode] Spawning new server...');
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
