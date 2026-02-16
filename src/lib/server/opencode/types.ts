import type { OpencodeClient } from '@opencode-ai/sdk';

export type OpenCodeMode = 'local' | 'remote';

export interface LocalPortRange {
	min: number;
	max: number;
}

export interface OpenCodeLocalSettings {
	hostname?: string;
	portRange?: LocalPortRange;
}

export interface OpenCodeRemoteSettings {
	protocol?: 'http' | 'https';
	host?: string;
	port?: number;
	basePath?: string;
	baseUrl?: string;
	username?: string;
	password?: string;
}

export interface OpenCodeConnectionSettings {
	mode: OpenCodeMode;
	local?: OpenCodeLocalSettings;
	remote?: OpenCodeRemoteSettings;
}

export interface OpenCodeConnectionMeta {
	mode: OpenCodeMode;
	baseUrl: string;
	port: number | null;
	startedLocalServer: boolean;
}

export interface OpenCodeConnection {
	client: OpencodeClient;
	close: () => Promise<void>;
	meta: OpenCodeConnectionMeta;
	rawRequest: (path: string, init?: RequestInit) => Promise<Response>;
}

export interface OpenCodeHealthResult {
	healthy: boolean;
	connected: boolean;
	version?: string;
	baseUrl?: string;
	port?: number | null;
	mode?: OpenCodeMode;
	startedLocalServer?: boolean;
	error?: string;
}
