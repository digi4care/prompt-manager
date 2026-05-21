/**
 * Connection settings API and types.
 * Extracted from connection-settings.svelte.
 */

export interface PortRange {
	min: number;
	max: number;
}

export interface LocalSettings {
	hostname?: string;
	portRange?: PortRange;
}

export interface RemoteSettings {
	protocol?: 'http' | 'https';
	host?: string;
	port?: number;
	basePath?: string;
	baseUrl?: string;
	username?: string;
	password?: string;
}

export interface ConnectionSettings {
	mode: 'local' | 'remote';
	local?: LocalSettings;
	remote?: RemoteSettings;
}

export interface ConnectionStatus {
	mode: 'local' | 'remote';
	settings: ConnectionSettings;
	baseUrl: string;
	port: number | null;
	startedLocalServer: boolean;
	hasPassword: boolean;
	connected: boolean;
	healthy: boolean;
	version: string | null;
	lastConnected: string | null;
}

/**
 * Parse error message from API response payload.
 */
export function parseErrorMessage(payload: unknown, fallback: string): string {
	if (typeof payload === 'string') {
		try {
			const parsed = JSON.parse(payload) as { message?: string };
			return parsed.message || payload;
		} catch {
			return payload;
		}
	}

	if (payload && typeof payload === 'object' && 'message' in payload) {
		const message = (payload as { message?: unknown }).message;
		if (typeof message === 'string' && message.length > 0) {
			return message;
		}
	}

	return fallback;
}

/**
 * Fetch current connection status from the API.
 */
export async function fetchConnectionStatus(): Promise<ConnectionStatus> {
	const res = await fetch('/api/admin/opencode-connection');
	if (!res.ok) {
		const payload = await res.text();
		throw new Error(parseErrorMessage(payload, 'Failed to load connection status'));
	}
	const data = (await res.json()) as { data: ConnectionStatus };
	return data.data;
}

/**
 * Save connection settings via the API. Returns updated status.
 */
export async function saveConnectionSettings(
	settings: ConnectionSettings
): Promise<ConnectionStatus> {
	const res = await fetch('/api/admin/opencode-connection', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ settings })
	});
	if (!res.ok) {
		const payload = await res.text();
		throw new Error(parseErrorMessage(payload, 'Failed to save settings'));
	}
	const data = (await res.json()) as { data: ConnectionStatus };
	return data.data;
}
