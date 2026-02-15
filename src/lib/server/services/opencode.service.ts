// OpenCode adapter service (TDD: minimal contract first)
// This boundary layer centralizes all OpenCode SDK interactions
// with typed errors and dependency injection for testability

import { getOpencodeClient } from '$lib/server/opencode/client';
import type { OpencodeClient } from '@opencode-ai/sdk';

// ============================================================================
// Domain-specific error types for stable error handling
// ============================================================================

export class OpenCodeError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'OpenCodeError';
	}
}

export class OpenCodeConnectionError extends OpenCodeError {
	constructor(message: string, originalError?: Error) {
		super(message, 'CONNECTION_ERROR', originalError);
		this.name = 'OpenCodeConnectionError';
	}
}

export class OpenCodeAuthenticationError extends OpenCodeError {
	constructor(message: string, originalError?: Error) {
		super(message, 'AUTHENTICATION_ERROR', originalError);
		this.name = 'OpenCodeAuthenticationError';
	}
}

export class OpenCodeValidationError extends OpenCodeError {
	constructor(message: string, originalError?: Error) {
		super(message, 'VALIDATION_ERROR', originalError);
		this.name = 'OpenCodeValidationError';
	}
}

export class OpenCodeExecutionError extends OpenCodeError {
	constructor(message: string, originalError?: Error) {
		super(message, 'EXECUTION_ERROR', originalError);
		this.name = 'OpenCodeExecutionError';
	}
}

// ============================================================================
// Health check with diagnostics
// ============================================================================

export type HealthCheckResult = {
	healthy: boolean;
	version?: string;
	connected?: boolean;
	diagnostics?: {
		baseUrl: string;
		timestamp: string;
		error?: string;
	};
};

export async function checkOpencodeHealth(): Promise<HealthCheckResult> {
	const baseUrl = process.env.OPENCODE_URL || 'http://localhost:4096';
	const diagnostics: HealthCheckResult['diagnostics'] = {
		baseUrl,
		timestamp: new Date().toISOString()
	};

	try {
		const client = getOpencodeClient();
		// Type-safe access to health endpoint
		const healthMethod = (client as any).global?.health;
		if (!healthMethod) {
			throw new OpenCodeError('Health check method not available', 'HEALTH_CHECK_UNAVAILABLE');
		}

		const res: any = await healthMethod.call(client);
		return {
			healthy: true,
			version: res?.data?.version,
			connected: true,
			diagnostics
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		diagnostics.error = message;

		// Classify the health check failure
		if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|fetch failed/i.test(message)) {
			return {
				healthy: false,
				connected: false,
				diagnostics
			};
		}

		return {
			healthy: false,
			connected: true,
			diagnostics
		};
	}
}

// ============================================================================
// Error mapping utilities
// ============================================================================

/**
 * Maps raw errors from OpenCode SDK to stable domain errors.
 * This provides a consistent error handling interface across the application.
 */
function mapOpenCodeError(err: unknown): never {
	if (err instanceof OpenCodeError) {
		throw err; // Re-throw already mapped errors
	}

	const message = err instanceof Error ? err.message : String(err);
	const originalError = err instanceof Error ? err : undefined;

	// Connection/Network errors
	if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|fetch failed|network/i.test(message)) {
		throw new OpenCodeConnectionError(
			'Unable to connect to OpenCode server. Please check your connection and try again.',
			originalError
		);
	}

	// Authentication errors
	if (/401|403|unauthorized|forbidden|authentication/i.test(message)) {
		throw new OpenCodeAuthenticationError(
			'Authentication failed. Please verify your credentials.',
			originalError
		);
	}

	// Validation errors
	if (/400|validation|invalid/i.test(message)) {
		throw new OpenCodeValidationError(
			'Invalid request parameters. Please check your input.',
			originalError
		);
	}

	// Rate limiting
	if (/429|rate limit|too many requests/i.test(message)) {
		throw new OpenCodeExecutionError('Too many requests. Please try again later.', originalError);
	}

	// Server errors (5xx)
	if (/50[0-9]|server error|internal server error/i.test(message)) {
		throw new OpenCodeExecutionError(
			'OpenCode server encountered an error. Please try again later.',
			originalError
		);
	}

	// Unknown/other errors - wrap in generic execution error
	throw new OpenCodeExecutionError(
		message || 'An unexpected error occurred while communicating with OpenCode.',
		originalError
	);
}

// ============================================================================
// Agent execution
// ============================================================================

export async function executeAgent(agent: string, input: unknown): Promise<unknown> {
	try {
		const client = getOpencodeClient();
		const res = await (client as any).agent.execute({ agent, input });
		return res;
	} catch (err) {
		mapOpenCodeError(err);
	}
}

// ============================================================================
// Session-based execution with model selection (ara.12 spike result)
// ============================================================================

export type ModelSelection = {
	providerID: string;
	modelID: string;
};

export type SessionOptions = {
	model: ModelSelection;
	agent: string;
	parts: Array<{ type: 'text'; text: string }>;
	temperature?: number;
	maxTokens?: number;
};

/**
 * Execute agent using session.prompt with per-run model selection
 * This is the recommended approach for ara.5/ara.6 workflows
 */
export async function executeAgentWithSession(options: SessionOptions): Promise<unknown> {
	try {
		const client = getOpencodeClient();
		const session = await (client as any).session.create();

		const promptParams: any = {
			model: options.model,
			agent: options.agent,
			parts: options.parts
		};

		// Add optional parameters
		if (options.temperature !== undefined) {
			promptParams.temperature = options.temperature;
		}
		if (options.maxTokens !== undefined) {
			promptParams.maxTokens = options.maxTokens;
		}

		const res = await session.prompt(promptParams);
		return res;
	} catch (err) {
		mapOpenCodeError(err);
	}
}

// ============================================================================
// Improve/Judge placeholder functions (will be implemented in later tasks)
// ============================================================================

export type ImprovePromptResult = {
	variants: Array<{
		prompt: string;
		changes?: string;
		version?: string;
	}>;
};

export type JudgePromptResult = {
	score: number;
	gaps: string[];
	recommendations: string[];
	summary?: string;
};

export async function improvePrompt(
	_prompt: string,
	_options?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<ImprovePromptResult> {
	// Placeholder: will execute OpenCode agent later.
	throw new Error('OpenCode improvePrompt not implemented yet');
}

export async function judgePrompt(
	_prompt: string,
	_options?: { model?: string; temperature?: number }
): Promise<JudgePromptResult> {
	// Placeholder: will execute OpenCode agent later.
	throw new Error('OpenCode judgePrompt not implemented yet');
}

// ============================================================================
// Provider/Model Catalog with TTL Cache
// ============================================================================

export type ModelInfo = {
	id: string;
	providerID: string;
	name: string;
	api: {
		id: string;
		url: string;
		npm: string;
	};
	capabilities: {
		temperature: boolean;
		reasoning: boolean;
		attachment: boolean;
		toolcall: boolean;
		input: {
			text: boolean;
			audio: boolean;
			image: boolean;
			video: boolean;
			pdf: boolean;
		};
		output: {
			text: boolean;
			audio: boolean;
			image: boolean;
			video: boolean;
			pdf: boolean;
		};
	};
	cost: {
		input: number;
		output: number;
		cache: {
			read: number;
			write: number;
		};
		experimentalOver200K?: {
			input: number;
			output: number;
			cache: {
				read: number;
				write: number;
			};
		};
	};
	limit: {
		context: number;
		output: number;
	};
	status: 'alpha' | 'beta' | 'deprecated' | 'active';
};

export type ProviderInfo = {
	id: string;
	name: string;
	source: 'env' | 'config' | 'custom' | 'api';
	env: string[];
	models: {
		[key: string]: ModelInfo;
	};
};

export type CatalogResponse = {
	providers: ProviderInfo[];
	cachedAt: string;
	ttlSeconds: number;
};

// Cache storage (in-memory, server-side)
let catalogCache: CatalogResponse | null = null;
let catalogCacheExpiry: number = 0;
const CATALOG_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch provider/model catalog from OpenCode SDK
 */
export async function fetchProviderCatalog(): Promise<CatalogResponse> {
	const client = getOpencodeClient();

	try {
		// Call client.config.providers()
		const providersResponse: any = await (client as any).config.providers();

		// Extract providers from response
		const providers = providersResponse?.data?.providers || [];

		return {
			providers,
			cachedAt: new Date().toISOString(),
			ttlSeconds: Math.floor(CATALOG_TTL_MS / 1000)
		};
	} catch (err) {
		mapOpenCodeError(err);
		throw err; // This line is never reached but TypeScript needs it
	}
}

/**
 * Get provider/model catalog with TTL cache
 */
export async function getProviderCatalog(forceRefresh = false): Promise<CatalogResponse> {
	const now = Date.now();

	// Check if cache is valid and we're not forcing refresh
	if (!forceRefresh && catalogCache && catalogCacheExpiry > now) {
		return catalogCache;
	}

	// Fetch fresh data
	const freshCatalog = await fetchProviderCatalog();

	// Update cache
	catalogCache = freshCatalog;
	catalogCacheExpiry = now + CATALOG_TTL_MS;

	return freshCatalog;
}

/**
 * Refresh the provider catalog cache
 */
export async function refreshProviderCatalog(): Promise<CatalogResponse> {
	return getProviderCatalog(true);
}

/**
 * Clear the provider catalog cache
 */
export function clearProviderCatalogCache(): void {
	catalogCache = null;
	catalogCacheExpiry = 0;
}

// ============================================================================
// Dependency injection for testability
// ============================================================================

/**
 * Creates an OpenCode service instance with injected client.
 * This allows mocking in unit tests while keeping the service pure.
 */
export function createOpenCodeService(client: OpencodeClient) {
	// Private cache for DI instance
	let diCatalogCache: CatalogResponse | null = null;
	let diCatalogCacheExpiry: number = 0;

	// Create the service object
	const service = {
		client,
		executeAgent: async (agent: string, input: unknown) => {
			try {
				const res = await (client as any).agent.execute({ agent, input });
				return res;
			} catch (err) {
				mapOpenCodeError(err);
			}
		},
		checkHealth: async () => {
			const baseUrl = process.env.OPENCODE_URL || 'http://localhost:4096';
			const diagnostics: HealthCheckResult['diagnostics'] = {
				baseUrl,
				timestamp: new Date().toISOString()
			};

			try {
				// Type-safe access to health endpoint
				const healthMethod = (client as any).global?.health;
				if (!healthMethod) {
					throw new OpenCodeError('Health check method not available', 'HEALTH_CHECK_UNAVAILABLE');
				}

				const res: any = await healthMethod.call(client);
				return {
					healthy: true,
					version: res?.data?.version,
					connected: true,
					diagnostics
				};
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				diagnostics.error = message;

				// Classify the health check failure
				if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|fetch failed/i.test(message)) {
					return {
						healthy: false,
						connected: false,
						diagnostics
					};
				}

				return {
					healthy: false,
					connected: true,
					diagnostics
				};
			}
		},
		improvePrompt: async (
			prompt: string,
			options?: { model?: string; temperature?: number; maxTokens?: number }
		) => {
			throw new Error('OpenCode improvePrompt not implemented yet');
		},
		judgePrompt: async (prompt: string, options?: { model?: string; temperature?: number }) => {
			throw new Error('OpenCode judgePrompt not implemented yet');
		},
		getCatalog: async (forceRefresh = false): Promise<CatalogResponse> => {
			const now = Date.now();

			// Check if cache is valid and we're not forcing refresh
			if (!forceRefresh && diCatalogCache && diCatalogCacheExpiry > now) {
				return diCatalogCache;
			}

			// Fetch fresh data
			const providersResponse: any = await (client as any).config.providers();
			const providers = providersResponse?.data?.providers || [];

			const freshCatalog: CatalogResponse = {
				providers,
				cachedAt: new Date().toISOString(),
				ttlSeconds: Math.floor(CATALOG_TTL_MS / 1000)
			};

			// Update cache
			diCatalogCache = freshCatalog;
			diCatalogCacheExpiry = now + CATALOG_TTL_MS;

			return freshCatalog;
		},
		refreshCatalog: async (): Promise<CatalogResponse> => {
			return await service.getCatalog(true);
		},
		clearCatalogCache: (): void => {
			diCatalogCache = null;
			diCatalogCacheExpiry = 0;
		}
	};

	return service;
}
