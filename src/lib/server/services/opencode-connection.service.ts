import { db } from '../db/client';
import {
	opencodeConnection,
	type OpencodeConnection,
	type NewOpencodeConnection
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { checkOpencodeHealth, type HealthCheckResult } from './opencode.service';

// Connection mode type (local = zelf server starten, remote = externe server met password)
export type ConnectionMode = 'local' | 'remote';

// Connection status response
export interface ConnectionStatus {
	mode: ConnectionMode;
	baseUrl: string | null;
	hasPassword: boolean;
	connected: boolean;
	healthy: boolean;
	version: string | null;
	lastConnected: string | null;
}

/**
 * Get the OpenCode connection config (singleton, id=1)
 * Creates default row if not exists
 */
export async function getOpencodeConnectionConfig(): Promise<OpencodeConnection> {
	const result = await db
		.select()
		.from(opencodeConnection)
		.where(eq(opencodeConnection.id, 1))
		.limit(1);

	if (result.length > 0) {
		return result[0];
	}

	// Create default connection config (local mode)
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

/**
 * Update the OpenCode connection settings
 */
export async function updateOpencodeConnection(
	mode: ConnectionMode,
	baseUrl?: string | null,
	password?: string | null
): Promise<OpencodeConnection> {
	// Validate: remote mode requires baseUrl
	if (mode === 'remote' && !baseUrl) {
		throw new Error('Remote mode requires a base URL');
	}

	// Ensure the config exists
	await getOpencodeConnectionConfig();

	// Update the config
	const updated = await db
		.update(opencodeConnection)
		.set({
			mode,
			baseUrl: mode === 'remote' ? baseUrl : null,
			password: mode === 'remote' ? password : null,
			updatedAt: new Date()
		})
		.where(eq(opencodeConnection.id, 1))
		.returning();

	if (updated.length === 0) {
		throw new Error('Failed to update OpenCode connection config');
	}

	return updated[0];
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
	// Get the config
	const config = await getOpencodeConnectionConfig();

	// Run health check
	const healthResult: HealthCheckResult = await checkOpencodeHealth();

	// Build status response
	const status: ConnectionStatus = {
		mode: config.mode,
		baseUrl: config.mode === 'remote' ? config.baseUrl : null,
		hasPassword: !!config.password,
		connected: healthResult.connected ?? false,
		healthy: healthResult.healthy,
		version: healthResult.version ?? null,
		lastConnected: config.lastConnected ? config.lastConnected.toISOString() : null
	};

	// Update lastConnected if healthy
	if (healthResult.healthy && healthResult.connected) {
		await db
			.update(opencodeConnection)
			.set({ lastConnected: new Date() })
			.where(eq(opencodeConnection.id, 1));
	}

	return status;
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
