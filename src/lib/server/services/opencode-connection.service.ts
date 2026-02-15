import { db } from '../db/client';
import {
	opencodeConnection,
	type OpencodeConnection,
	type NewOpencodeConnection
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { checkOpencodeHealth, type HealthCheckResult } from './opencode.service';

// Connection mode type
export type ConnectionMode = 'auto' | 'custom';

// Connection status response
export interface ConnectionStatus {
	mode: ConnectionMode;
	baseUrl: string | null;
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

	// Create default connection config
	const defaultConfig: NewOpencodeConnection = {
		id: 1,
		mode: 'auto',
		baseUrl: null,
		lastConnected: null
	};

	const inserted = await db.insert(opencodeConnection).values(defaultConfig).returning();
	return inserted[0];
}

/**
 * Update the OpenCode connection mode
 */
export async function updateOpencodeConnectionMode(
	mode: ConnectionMode,
	baseUrl?: string
): Promise<OpencodeConnection> {
	// Validate: custom mode requires baseUrl
	if (mode === 'custom' && !baseUrl) {
		throw new Error('Custom mode requires a base URL');
	}

	// Ensure the config exists
	await getOpencodeConnectionConfig();

	// Update the config
	const updated = await db
		.update(opencodeConnection)
		.set({
			mode,
			baseUrl: mode === 'custom' ? baseUrl : null,
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
	if (config.mode === 'custom' && config.baseUrl) {
		return config.baseUrl;
	}
	// Auto mode uses environment variable or default
	return process.env.OPENCODE_URL || 'http://localhost:4096';
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
		baseUrl: config.mode === 'custom' ? config.baseUrl : null,
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
	if (mode !== 'auto' && mode !== 'custom') {
		return { valid: false, error: 'Mode must be "auto" or "custom"' };
	}
	return { valid: true };
}

/**
 * Validate base URL format
 */
export function validateBaseUrl(baseUrl: unknown): { valid: boolean; error?: string } {
	if (!baseUrl || typeof baseUrl !== 'string') {
		return { valid: false, error: 'Base URL is required for custom mode' };
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
