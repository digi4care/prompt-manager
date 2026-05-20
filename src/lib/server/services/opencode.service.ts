/**
 * OpenCode SDK Service
 *
 * This service delegates to opencode-connection.service for client management.
 * The connection service handles:
 * - Local mode: embedded server on random port from portRange
 * - Remote mode: connects to external server with auth
 *
 * This file provides convenience wrappers for common operations.
 */
import {
	getOpencodeConnectionSettings,
	resetCachedConnection
} from './opencode-connection.service.js';
import { getConnection } from './opencode-connection.service.js';
import type { OpencodeClient } from '@opencode-ai/sdk';

// In-memory catalog cache
let catalogCache: {
	data: unknown;
	timestamp: number;
	ttlSeconds: number;
} | null = null;

const DEFAULT_CATALOG_TTL_SECONDS = 300; // 5 minutes

/**
 * Get the OpenCode client using the current connection settings
 * Delegates to opencode-connection.service which handles random ports
 */
export async function getOpencodeClient(): Promise<OpencodeClient> {
	const settings = await getOpencodeConnectionSettings();
	const connection = await getConnection(settings);
	return connection.client;
}

/**
 * Reset clients (call when connection settings change)
 */
export function resetOpencodeClient(): void {
	resetCachedConnection();
	clearCatalogCache();
}

/**
 * Check OpenCode health by trying to get providers
 */
export async function checkOpencodeHealth(): Promise<{
	healthy: boolean;
	connected: boolean;
	version?: string;
	baseUrl?: string;
	error?: string;
}> {
	try {
		const client = await getOpencodeClient();
		const result = await client.config.providers();

		if (result.error) {
			const errorMsg =
				typeof result.error === 'object' && result.error && 'message' in result.error
					? String((result.error as { message?: unknown }).message)
					: 'Failed to get providers';
			return {
				healthy: false,
				connected: false,
				error: errorMsg
			};
		}

		return {
			healthy: true,
			connected: true,
			version: result.data?.default?.model
				? `SDK (${result.data.providers?.length || 0} providers)`
				: 'Connected'
		};
	} catch (error) {
		return {
			healthy: false,
			connected: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

/**
 * Get available providers from OpenCode (SDK - configured providers only)
 */
export async function getProviders() {
	const client = await getOpencodeClient();
	const result = await client.config.providers();

	if (result.error) {
		const errorMsg =
			typeof result.error === 'object' && result.error && 'message' in result.error
				? String((result.error as { message?: unknown }).message)
				: 'Unknown error';
		throw new Error(`Failed to get providers: ${errorMsg}`);
	}

	return result.data;
}

/**
 * In-memory cache for ALL providers (similar to OpenCode's lazy pattern)
 */
let providersCache: {
	data: { all: ProviderInfo[]; connected: string[]; default?: { model?: string } } | null;
	timestamp: number;
	ttlSeconds: number;
} = {
	data: null,
	timestamp: 0,
	ttlSeconds: 86400 // 24 hours default, like OpenCode
};

/**
 * Clear the providers cache (called on disconnect/connect operations)
 */
export function clearProvidersCache(): void {
	providersCache.data = null;
	providersCache.timestamp = 0;
}

/**
 * Set providers cache TTL
 */
export function setProvidersCacheTTL(seconds: number): void {
	providersCache.ttlSeconds = seconds;
}

/**
 * Get ALL providers from OpenCode (with in-memory TTL cache)
 * Returns all available providers + connected provider IDs
 */
export async function getAllProviders(forceRefresh = false): Promise<{
	all: ProviderInfo[];
	connected: string[];
	default?: { model?: string };
}> {
	const now = Date.now();
	const cacheAge = now - providersCache.timestamp;
	const cacheValid =
		!forceRefresh && providersCache.data && cacheAge < providersCache.ttlSeconds * 1000;

	if (cacheValid) {
		return providersCache.data!;
	}

	const settings = await getOpencodeConnectionSettings();
	const connection = await getConnection(settings);

	const response = await connection.rawRequest('/provider', {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' }
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Failed to get all providers: ${errorText}`);
	}

	const data = (await response.json()) as {
		all?: ProviderInfo[];
		connected?: string[];
		default?: { model?: string };
	};

	const result = {
		all: data.all || [],
		connected: data.connected || [],
		default: data.default
	};

	// Cache the result
	providersCache.data = result;
	providersCache.timestamp = now;

	return result;
}

/**
 * Get the provider/model catalog (with in-memory TTL cache)
 */
export async function getProviderCatalog(forceRefresh = false): Promise<CatalogResponse> {
	const now = Date.now();

	// Return cached if valid and not forcing refresh
	if (!forceRefresh && catalogCache) {
		const age = (now - catalogCache.timestamp) / 1000;
		if (age < catalogCache.ttlSeconds) {
			const data = catalogCache.data as {
				providers?: ProviderInfo[];
				default?: { model?: string };
			};
			return {
				providers: data.providers || [],
				default: data.default,
				ttlSeconds: catalogCache.ttlSeconds,
				cached: true,
				cachedAt: catalogCache.timestamp
			};
		}
	}

	// Fetch fresh data
	const data = await getProviders();

	catalogCache = {
		data,
		timestamp: now,
		ttlSeconds: DEFAULT_CATALOG_TTL_SECONDS
	};

	return {
		providers: (data as unknown as { providers?: ProviderInfo[] }).providers || [],
		default: (data as { default?: { model?: string } }).default,
		ttlSeconds: DEFAULT_CATALOG_TTL_SECONDS,
		cached: false,
		cachedAt: now
	};
}

/**
 * Force refresh the provider catalog
 */
export async function refreshProviderCatalog(): Promise<CatalogResponse> {
	return getProviderCatalog(true);
}

/**
 * Clear the catalog cache (call when connection settings change)
 */
export function clearCatalogCache(): void {
	catalogCache = null;
}

/**
 * Clear all caches (called on disconnect/connect operations or shutdown)
 */
export function clearAllCaches(): void {
	clearCatalogCache();
	clearProvidersCache();
}

// Graceful cleanup on process exit
process.on('SIGTERM', () => { clearAllCaches(); process.exit(0); });
process.on('SIGINT', () => { clearAllCaches(); process.exit(0); });

// Types
export interface ProviderInfo {
	id: string;
	name: string;
	description?: string;
	source?: string;
	env?: string[];
	models?: Record<string, ModelInfo> | ModelInfo[];
}

export interface ModelInfo {
	id: string;
	name: string;
	provider: string;
	description?: string;
	context_window?: number;
	supports_vision?: boolean;
	supports_thinking?: boolean;
	status?: string;
	limit?: {
		context: number;
		output: number;
	};
	variants?: Array<{ id: string; label?: string; isDefault?: boolean }>;
}

export interface HealthCheckResult {
	healthy: boolean;
	connected?: boolean;
	version?: string;
	baseUrl?: string;
	error?: string;
	diagnostics?: {
		baseUrl?: string;
		error?: string;
	};
}

export interface CatalogResponse {
	providers: ProviderInfo[];
	default?: { model?: string };
	ttlSeconds: number;
	cached: boolean;
	cachedAt?: number;
}

/**
 * Model selection for agent execution
 */
export interface ModelSelection {
	providerID: string;
	modelID: string;
}

/**
 * Part of a message for agent execution
 */
export interface AgentPart {
	type: 'text' | 'image';
	text?: string;
	imageUrl?: string;
}

/**
 * Parameters for executeAgentWithSession
 */
export interface ExecuteAgentParams {
	model: ModelSelection;
	agent: string;
	parts: AgentPart[];
	temperature?: number;
	maxTokens?: number;
}

/**
 * Validation error for OpenCode operations
 */
export class OpenCodeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OpenCodeError';
	}
}

export class OpenCodeConnectionError extends OpenCodeError {
	constructor(message: string) {
		super(message);
		this.name = 'OpenCodeConnectionError';
	}
}

export class OpenCodeAuthenticationError extends OpenCodeError {
	constructor(message: string) {
		super(message);
		this.name = 'OpenCodeAuthenticationError';
	}
}

export class OpenCodeExecutionError extends OpenCodeError {
	constructor(message: string) {
		super(message);
		this.name = 'OpenCodeExecutionError';
	}
}

export class OpenCodeValidationError extends OpenCodeError {
	constructor(
		message: string,
		public readonly field?: string,
		public readonly value?: unknown
	) {
		super(message);
		this.name = 'OpenCodeValidationError';
	}
}

/**
 * Execute an agent with the given input
 */
export async function executeAgent<TInput, TOutput>(
	agentType: string,
	input: TInput,
	modelSelection?: ModelSelection
): Promise<{ data?: TOutput; error?: { message: string } }> {
	try {
		const client = await getOpencodeClient();

		// Use the agent API if available
		const agentClient = client as unknown as {
			agent?: {
				execute?: (params: {
					agentType: string;
					input: TInput;
					model?: ModelSelection;
				}) => Promise<{ data?: TOutput; error?: { message: string } }>;
			};
		};

		if (agentClient.agent?.execute) {
			return agentClient.agent.execute({
				agentType,
				input,
				model: modelSelection
			});
		}

		// Fallback: use rawRequest to /chat/completions endpoint
		const settings = await getOpencodeConnectionSettings();
		const connection = await getConnection(settings);

		const response = await connection.rawRequest('/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{
						role: 'system',
						content: `You are a ${agentType} agent. Process the input and respond appropriately.`
					},
					{ role: 'user', content: JSON.stringify(input) }
				],
				model: modelSelection?.modelID || 'default'
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			return { error: { message: errorText || 'Request failed' } };
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = data.choices?.[0]?.message?.content;
		return {
			data: content ? (JSON.parse(content) as TOutput) : (content as unknown as TOutput)
		};
	} catch (error) {
		return {
			error: { message: error instanceof Error ? error.message : 'Unknown error' }
		};
	}
}

/**
 * Execute an agent with session support for multi-turn conversations
 */
export async function executeAgentWithSession<TOutput>(
	params: ExecuteAgentParams
): Promise<{ data?: TOutput; error?: { message: string }; sessionId?: string }> {
	try {
		const client = await getOpencodeClient();

		// Use the agent API with session if available
		const agentClient = client as unknown as {
			agent?: {
				executeWithSession?: (p: {
					agent: string;
					parts: AgentPart[];
					model: ModelSelection;
					temperature?: number;
					maxTokens?: number;
				}) => Promise<{
					data?: TOutput;
					error?: { message: string };
					sessionId?: string;
				}>;
			};
		};

		if (agentClient.agent?.executeWithSession) {
			return agentClient.agent.executeWithSession(params);
		}

		// Fallback: use rawRequest to /chat/completions endpoint
		const settings = await getOpencodeConnectionSettings();
		const connection = await getConnection(settings);

		const sessionId = crypto.randomUUID();

		const response = await connection.rawRequest('/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				messages: [
					{
						role: 'system',
						content: `You are a ${params.agent} agent. Process the input and respond appropriately.`
					},
					...params.parts.map((p) => ({
						role: 'user' as const,
						content: p.text || ''
					}))
				],
				model: params.model?.modelID || 'default',
				temperature: params.temperature,
				max_tokens: params.maxTokens
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			return { error: { message: errorText || 'Request failed' }, sessionId };
		}

		const data = (await response.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = data.choices?.[0]?.message?.content;
		return {
			data: content ? (JSON.parse(content) as TOutput) : (content as unknown as TOutput),
			sessionId
		};
	} catch (error) {
		return {
			error: { message: error instanceof Error ? error.message : 'Unknown error' }
		};
	}
}
