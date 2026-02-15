/**
 * Tests for OpenCode Providers API Endpoint
 *
 * Validates that:
 * - GET /api/opencode/providers returns catalog
 * - Cache headers are set correctly
 * - Refresh query parameter forces cache refresh
 * - Error handling works correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { MOCK_PROVIDERS_RESPONSE } from '../../mocks/opencode.test-double';

// Mock the opencode service module
vi.mock('$lib/server/services/opencode.service', () => ({
	getProviderCatalog: vi.fn(),
	refreshProviderCatalog: vi.fn()
}));

describe('OpenCode Providers API', () => {
	let getProviderCatalogMock: any;
	let refreshProviderCatalogMock: any;

	beforeEach(async () => {
		process.env.TEST_MODE = 'true';
		vi.clearAllMocks();

		// Get the mock functions
		const serviceModule = await import('$lib/server/services/opencode.service');
		getProviderCatalogMock = serviceModule.getProviderCatalog;
		refreshProviderCatalogMock = serviceModule.refreshProviderCatalog;

		// Setup default mock behavior
		getProviderCatalogMock.mockResolvedValue({
			providers: MOCK_PROVIDERS_RESPONSE.data.providers,
			cachedAt: new Date().toISOString(),
			ttlSeconds: 300
		});
	});

	it('returns 200 and catalog on successful fetch', async () => {
		const { GET } = await import('$lib/../routes/api/opencode/providers/+server');
		const request = new Request('http://localhost/api/opencode/providers', { method: 'GET' });
		const url = new URL('http://localhost/api/opencode/providers');
		const event = { request, params: {}, url } as unknown as RequestEvent<any, any>;

		const res = await GET(event);

		expect(res.status).toBe(200);

		const data = await res.json();
		expect(data.providers).toBeDefined();
		expect(Array.isArray(data.providers)).toBe(true);
		expect(data.cachedAt).toBeDefined();
		expect(data.ttlSeconds).toBe(300);
	});

	it('sets Cache-Control header', async () => {
		const { GET } = await import('$lib/../routes/api/opencode/providers/+server');
		const request = new Request('http://localhost/api/opencode/providers', { method: 'GET' });
		const url = new URL(request.url);
		const event = { request, params: {}, url } as unknown as RequestEvent<any, any>;

		const res = await GET(event);

		expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
	});

	it('uses cached data when refresh=false', async () => {
		const { GET } = await import('$lib/../routes/api/opencode/providers/+server');
		const request = new Request('http://localhost/api/opencode/providers', { method: 'GET' });
		const url = new URL(request.url);
		const event = { request, params: {}, url } as unknown as RequestEvent<any, any>;

		await GET(event);

		expect(getProviderCatalogMock).toHaveBeenCalledWith(false);
	});

	it('forces refresh when refresh=true', async () => {
		const { GET } = await import('$lib/../routes/api/opencode/providers/+server');
		const request = new Request('http://localhost/api/opencode/providers?refresh=true', {
			method: 'GET'
		});
		const url = new URL(request.url);
		const event = { request, params: {}, url } as unknown as RequestEvent<any, any>;

		await GET(event);

		// refreshProviderCatalog should be called when refresh=true
		expect(refreshProviderCatalogMock).toHaveBeenCalled();
		expect(getProviderCatalogMock).not.toHaveBeenCalled();
	});

	it('does not force refresh when refresh=false', async () => {
		const { GET } = await import('$lib/../routes/api/opencode/providers/+server');
		const request = new Request('http://localhost/api/opencode/providers?refresh=false', {
			method: 'GET'
		});
		const url = new URL(request.url);
		const event = { request, params: {}, url } as unknown as RequestEvent<any, any>;

		await GET(event);

		expect(getProviderCatalogMock).toHaveBeenCalledWith(false);
	});

	it('returns 503 on error', async () => {
		getProviderCatalogMock.mockRejectedValue(new Error('Connection failed'));

		const { GET } = await import('$lib/../routes/api/opencode/providers/+server');
		const request = new Request('http://localhost/api/opencode/providers', { method: 'GET' });
		const url = new URL(request.url);
		const event = { request, params: {}, url } as unknown as RequestEvent<any, any>;

		const res = await GET(event);

		expect(res.status).toBe(503);

		const data = await res.json();
		expect(data.error).toBeDefined();
		expect(data.message).toBeDefined();
	});

	it('returns proper provider and model structure', async () => {
		const { GET } = await import('$lib/../routes/api/opencode/providers/+server');
		const request = new Request('http://localhost/api/opencode/providers', { method: 'GET' });
		const url = new URL(request.url);
		const event = { request, params: {}, url } as unknown as RequestEvent<any, any>;

		const res = await GET(event);
		const data = await res.json();

		expect(data.providers.length).toBeGreaterThan(0);

		const provider = data.providers[0];
		expect(provider.id).toBeDefined();
		expect(provider.name).toBeDefined();
		expect(provider.source).toBeDefined();
		expect(provider.models).toBeDefined();

		const modelKey = Object.keys(provider.models)[0];
		const model = provider.models[modelKey];
		expect(model.id).toBeDefined();
		expect(model.name).toBeDefined();
		expect(model.capabilities).toBeDefined();
		expect(model.cost).toBeDefined();
		expect(model.limit).toBeDefined();
	});

	it('does not expose actual secrets in response', async () => {
		const { GET } = await import('$lib/../routes/api/opencode/providers/+server');
		const request = new Request('http://localhost/api/opencode/providers', { method: 'GET' });
		const url = new URL(request.url);
		const event = { request, params: {}, url } as unknown as RequestEvent<any, any>;

		const res = await GET(event);
		const data = await res.json();

		// Check that providers don't have actual secret values
		for (const provider of data.providers) {
			// Verify that the 'key' field (if present) doesn't contain actual secret values
			if ('key' in provider && provider.key) {
				// Key should not match actual API key patterns
				expect(provider.key).not.toMatch(/^sk-/);
				expect(provider.key).not.toMatch(/^gpt_/);
				expect(provider.key).not.toMatch(/^[a-f0-9]{32,}$/);
			}

			// Verify options don't contain secrets
			if (provider.options) {
				const optionsJson = JSON.stringify(provider.options);
				expect(optionsJson).not.toMatch(/^sk-/);
				expect(optionsJson).not.toMatch(/^gpt_/);
			}
		}
	});
});
