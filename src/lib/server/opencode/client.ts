import { createOpencode, createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk';
import { OPENCODE_BASE_URL } from '$lib/server/config/opencode';

export interface OpencodeClientOptions {
	baseUrl?: string;
	password?: string | null;
}

// Singleton for embedded server mode
let embeddedInstance: {
	client: OpencodeClient;
	server: { url: string; close(): void };
} | null = null;

/**
 * Get OpenCode client for LOCAL mode
 * Uses createOpencode() which starts an embedded server automatically
 * No need to run `opencode serve` separately!
 */
export async function getLocalOpencodeClient(): Promise<OpencodeClient> {
	if (!embeddedInstance) {
		embeddedInstance = await createOpencode({
			hostname: '127.0.0.1',
			port: 4096
		});
	}
	return embeddedInstance.client;
}

/**
 * Get OpenCode client for REMOTE mode
 * Connects to existing server with optional Basic Auth
 */
export function getRemoteOpencodeClient(baseUrl: string, password?: string | null): OpencodeClient {
	if (password) {
		const username = process.env.OPENCODE_SERVER_USERNAME || 'opencode';
		const credentials = Buffer.from(`${username}:${password}`).toString('base64');

		return createOpencodeClient({
			baseUrl,
			fetch: (request: Request) => {
				const headers = new Headers(request.headers);
				headers.set('Authorization', `Basic ${credentials}`);
				return fetch(request.url, {
					method: request.method,
					headers,
					body: request.body,
					signal: request.signal
				});
			}
		});
	}

	return createOpencodeClient({ baseUrl });
}

/**
 * Close embedded server (call on app shutdown)
 */
export function closeEmbeddedServer(): void {
	if (embeddedInstance) {
		embeddedInstance.server.close();
		embeddedInstance = null;
	}
}
