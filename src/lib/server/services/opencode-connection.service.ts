import { db } from '../db/client';
import {
	adminSettings,
	opencodeConnection,
	type AdminSetting,
	type NewAdminSetting,
	type OpencodeConnection,
	type NewOpencodeConnection
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { buildRemoteUrl } from '../opencode/build-remote-url';
import { createOpenCodeConnection } from '../opencode/create-connection';
import { healthCheck } from '../opencode/health-check';
import type {
	OpenCodeConnection,
	OpenCodeConnectionSettings,
	OpenCodeHealthResult,
	OpenCodeRemoteSettings
} from '../opencode/types';
import {
	DEFAULT_LOCAL_HOSTNAME,
	DEFAULT_LOCAL_PORT_RANGE,
	validateSettings
} from '../opencode/validate-settings';

// Connection mode type (local = zelf server starten, remote = externe server met password)
export type ConnectionMode = 'local' | 'remote';

// Connection status response
export interface ConnectionStatus {
	mode: ConnectionMode;
	settings: OpenCodeConnectionSettings;
	baseUrl: string | null;
	port: number | null;
	startedLocalServer: boolean;
	hasPassword: boolean;
	connected: boolean;
	healthy: boolean;
	version: string | null;
	lastConnected: string | null;
	error?: string;
}

const SETTINGS_KEY = 'opencode_connection_settings';
const SETTINGS_CATEGORY = 'opencode';
const SETTINGS_UPDATED_BY = 'admin';

const DEFAULT_CONNECTION_SETTINGS: OpenCodeConnectionSettings = {
	mode: 'local',
	local: {
		hostname: DEFAULT_LOCAL_HOSTNAME,
		portRange: DEFAULT_LOCAL_PORT_RANGE
	}
};

let cachedConnection: OpenCodeConnection | null = null;
let cachedSettingsKey: string | null = null;

function getSettingsKey(settings: OpenCodeConnectionSettings): string {
	return JSON.stringify(settings);
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (typeof error === 'string' && error.length > 0) {
		return error;
	}

	return 'Unknown error';
}

function getDefaultConnectionSettings(): OpenCodeConnectionSettings {
	return validateSettings(DEFAULT_CONNECTION_SETTINGS);
}

function parseRemotePort(baseUrl: string | null): number | null {
	if (!baseUrl) {
		return null;
	}

	try {
		const url = new URL(baseUrl);
		if (url.port) {
			return Number(url.port);
		}

		return url.protocol === 'https:' ? 443 : 80;
	} catch {
		return null;
	}
}

function deriveRemoteBaseUrl(settings: OpenCodeConnectionSettings): string | null {
	if (settings.mode !== 'remote' || !settings.remote) {
		return null;
	}

	try {
		return buildRemoteUrl(settings.remote);
	} catch {
		return null;
	}
}

function settingsFromLegacy(config: OpencodeConnection): OpenCodeConnectionSettings {
	if (config.mode === 'remote') {
		const remote: OpenCodeRemoteSettings = {};
		if (config.baseUrl) {
			remote.baseUrl = config.baseUrl;
		}
		if (config.password) {
			remote.password = config.password;
		}

		return validateSettings({ mode: 'remote', remote });
	}

	return getDefaultConnectionSettings();
}

async function getStoredSettingsRow(): Promise<AdminSetting | null> {
	const result = await db
		.select()
		.from(adminSettings)
		.where(eq(adminSettings.key, SETTINGS_KEY))
		.limit(1);

	return result[0] ?? null;
}

async function persistSettings(settings: OpenCodeConnectionSettings): Promise<void> {
	const serialized = JSON.stringify(settings);
	const existing = await getStoredSettingsRow();

	if (existing) {
		await db
			.update(adminSettings)
			.set({
				category: SETTINGS_CATEGORY,
				key: SETTINGS_KEY,
				value: serialized,
				updatedAt: new Date(),
				updatedBy: SETTINGS_UPDATED_BY
			})
			.where(eq(adminSettings.id, existing.id));

		return;
	}

	const insertValue: NewAdminSetting = {
		category: SETTINGS_CATEGORY,
		key: SETTINGS_KEY,
		value: serialized,
		updatedBy: SETTINGS_UPDATED_BY
	};

	await db.insert(adminSettings).values(insertValue);
}

async function getOrCreateLegacyConfig(): Promise<OpencodeConnection> {
	const result = await db
		.select()
		.from(opencodeConnection)
		.where(eq(opencodeConnection.id, 1))
		.limit(1);

	if (result.length > 0) {
		return result[0];
	}

	const defaultConfig: NewOpencodeConnection = {
		id: 1,
		mode: 'local',
		baseUrl: null,
		password: null,
		lastConnected: null
	};

	const inserted = await db.insert(opencodeConnection).values(defaultConfig).returning();
	return inserted[0];
}

async function syncLegacyConfig(
	settings: OpenCodeConnectionSettings,
	lastConnected?: Date | null
): Promise<OpencodeConnection> {
	await getOrCreateLegacyConfig();

	const nextBaseUrl = deriveRemoteBaseUrl(settings);
	const nextPassword = settings.mode === 'remote' ? (settings.remote?.password ?? null) : null;

	const updatePayload: Partial<NewOpencodeConnection> = {
		mode: settings.mode,
		baseUrl: settings.mode === 'remote' ? nextBaseUrl : null,
		password: nextPassword,
		updatedAt: new Date()
	};

	if (lastConnected !== undefined) {
		updatePayload.lastConnected = lastConnected;
	}

	const updated = await db
		.update(opencodeConnection)
		.set(updatePayload)
		.where(eq(opencodeConnection.id, 1))
		.returning();

	if (updated.length === 0) {
		throw new Error('Failed to sync OpenCode connection config');
	}

	return updated[0];
}

export async function resetCachedConnection(): Promise<void> {
	if (cachedConnection) {
		try {
			await cachedConnection.close();
		} catch (error) {
			console.error('Failed to close cached OpenCode connection:', error);
		}
	}

	cachedConnection = null;
	cachedSettingsKey = null;
}

// Graceful cleanup on process exit
async function gracefulShutdown() {
	await resetCachedConnection();
	process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export async function getConnection(
	settings: OpenCodeConnectionSettings
): Promise<OpenCodeConnection> {
	const nextKey = getSettingsKey(settings);

	if (cachedConnection && cachedSettingsKey === nextKey) {
		return cachedConnection;
	}

	await resetCachedConnection();

	cachedConnection = await createOpenCodeConnection(settings);
	cachedSettingsKey = nextKey;

	return cachedConnection;
}

export async function getOpencodeConnectionSettings(): Promise<OpenCodeConnectionSettings> {
	const stored = await getStoredSettingsRow();

	if (stored) {
		try {
			const parsed = JSON.parse(stored.value) as unknown;
			return validateSettings(parsed);
		} catch (error) {
			console.error('Failed to parse stored OpenCode settings, falling back:', error);
		}
	}

	const legacyConfig = await getOrCreateLegacyConfig();

	try {
		const migrated = settingsFromLegacy(legacyConfig);
		await persistSettings(migrated);
		return migrated;
	} catch (error) {
		console.error('Failed to migrate legacy OpenCode settings, using defaults:', error);
	}

	const defaults = getDefaultConnectionSettings();
	await persistSettings(defaults);
	await syncLegacyConfig(defaults, legacyConfig.lastConnected ?? null);
	return defaults;
}

/**
 * Get the OpenCode connection config (singleton, id=1)
 * Creates default row if not exists
 */
export async function getOpencodeConnectionConfig(): Promise<OpencodeConnection> {
	const settings = await getOpencodeConnectionSettings();
	return syncLegacyConfig(settings);
}

export async function updateOpencodeConnectionSettings(
	rawSettings: unknown
): Promise<OpenCodeConnectionSettings> {
	const settings = validateSettings(rawSettings);
	await persistSettings(settings);
	await syncLegacyConfig(settings);

	const nextKey = getSettingsKey(settings);
	if (cachedSettingsKey && cachedSettingsKey !== nextKey) {
		await resetCachedConnection();
	}

	return settings;
}

/**
 * Update the OpenCode connection settings
 */
export async function updateOpencodeConnection(
	mode: ConnectionMode,
	baseUrl?: string | null,
	password?: string | null
): Promise<OpencodeConnection> {
	if (mode === 'remote') {
		const remotePayload: Record<string, unknown> = {
			baseUrl: baseUrl ?? undefined,
			password: password ?? undefined
		};

		await updateOpencodeConnectionSettings({
			mode: 'remote',
			remote: remotePayload
		});
	} else {
		await updateOpencodeConnectionSettings({
			mode: 'local',
			local: DEFAULT_CONNECTION_SETTINGS.local
		});
	}

	return getOpencodeConnectionConfig();
}

/**
 * Get the effective base URL based on connection mode
 */
export function getEffectiveBaseUrl(config: OpencodeConnection): string {
	if (config.mode === 'remote' && config.baseUrl) {
		return config.baseUrl;
	}
	// Local mode uses environment variable or default
	return process.env.OPENCODE_URL || 'http://localhost:4096';
}

/**
 * Get auth headers for OpenCode requests
 * Uses HTTP Basic Auth (username: opencode, password: from config)
 */
export function getAuthHeaders(config: OpencodeConnection): Record<string, string> {
	// Both local and remote can have password auth
	if (config.password) {
		// HTTP Basic Auth: base64(username:password)
		// Username defaults to 'opencode' per OpenCode docs
		const username = process.env.OPENCODE_SERVER_USERNAME || 'opencode';
		const credentials = Buffer.from(`${username}:${config.password}`).toString('base64');
		return {
			Authorization: `Basic ${credentials}`
		};
	}
	return {};
}

/**
 * Get connection status with health check
 */
export async function getOpencodeConnectionStatus(): Promise<ConnectionStatus> {
	const settings = await getOpencodeConnectionSettings();

	let healthResult: OpenCodeHealthResult;

	try {
		const connection = await getConnection(settings);
		healthResult = await healthCheck(connection);
	} catch (error) {
		healthResult = {
			healthy: false,
			connected: false,
			mode: settings.mode,
			baseUrl: deriveRemoteBaseUrl(settings) ?? undefined,
			port: parseRemotePort(deriveRemoteBaseUrl(settings)),
			startedLocalServer: false,
			error: getErrorMessage(error)
		};
	}

	const connected = Boolean(healthResult.connected);
	const healthy = Boolean(healthResult.healthy);

	const syncedConfig = await syncLegacyConfig(
		settings,
		connected && healthy ? new Date() : undefined
	);

	const fallbackBaseUrl =
		settings.mode === 'remote' ? deriveRemoteBaseUrl(settings) : process.env.OPENCODE_URL || null;
	const resolvedBaseUrl = healthResult.baseUrl || fallbackBaseUrl;
	const resolvedPort =
		typeof healthResult.port === 'number' ? healthResult.port : parseRemotePort(resolvedBaseUrl);

	return {
		mode: settings.mode,
		settings,
		baseUrl: resolvedBaseUrl,
		port: resolvedPort,
		startedLocalServer: Boolean(healthResult.startedLocalServer),
		hasPassword: Boolean(settings.remote?.password),
		connected,
		healthy,
		version: healthResult.version ?? null,
		lastConnected: syncedConfig.lastConnected ? syncedConfig.lastConnected.toISOString() : null,
		error: healthResult.error
	};
}

/**
 * Validate connection mode value
 */
export function validateConnectionMode(mode: unknown): { valid: boolean; error?: string } {
	if (mode !== 'local' && mode !== 'remote') {
		return { valid: false, error: 'Mode must be "local" or "remote"' };
	}
	return { valid: true };
}

/**
 * Validate base URL format
 */
export function validateBaseUrl(baseUrl: unknown): { valid: boolean; error?: string } {
	if (!baseUrl || typeof baseUrl !== 'string') {
		return { valid: false, error: 'Base URL is required for remote mode' };
	}

	try {
		const url = new URL(baseUrl);
		if (!url.protocol.startsWith('http')) {
			return { valid: false, error: 'Base URL must use HTTP or HTTPS protocol' };
		}
		return { valid: true };
	} catch {
		return { valid: false, error: 'Invalid URL format' };
	}
}
