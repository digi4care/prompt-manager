import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock auth helper
vi.mock('$lib/server/auth.helper', () => ({
	authenticateRequest: vi.fn().mockReturnValue({
		userId: 'test-user',
		email: 'test@example.com',
		role: 'admin'
	}),
	requireAdmin: vi.fn().mockReturnValue({
		userId: 'test-user',
		email: 'test@example.com',
		role: 'admin'
	})
}));

// Mock database with complete chain
vi.mock('$lib/server/db/client', () => {
	const mockSelectChain = {
		from: vi.fn(() => ({
			leftJoin: vi.fn(() => ({
				where: vi.fn(() => ({
					orderBy: vi.fn().mockResolvedValue([])
				}))
			})),
			where: vi.fn(() => ({
				orderBy: vi.fn().mockResolvedValue([])
			})),
			orderBy: vi.fn().mockResolvedValue([])
		}))
	};

	return {
		db: {
			select: vi.fn(() => mockSelectChain),
			insert: vi.fn(() => ({
				values: vi.fn(() => ({
					returning: vi
						.fn()
						.mockResolvedValue([{ id: 1, modelId: 'openai/gpt-4o-mini', modelVariant: 'low' }])
				}))
			})),
			update: vi.fn(() => ({
				set: vi.fn(() => ({
					where: vi.fn(() => ({
						returning: vi
							.fn()
							.mockResolvedValue([{ id: 1, modelId: 'openai/gpt-4o-mini', modelVariant: 'high' }])
					}))
				}))
			})),
			delete: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi.fn().mockResolvedValue([{ id: 1 }])
				}))
			}))
		},
		getRawClient: vi.fn(() => ({
			execute: vi.fn().mockResolvedValue({
				rows: [
					{
						id: 1,
						parent_type: 'function_defaults',
						parent_id: 0,
						agent_order: 1,
						model_id: 'openai/gpt-4o-mini',
						model_variant: 'low',
						temperature: 0.7,
						max_tokens: 4096,
						prompt_link_id: null,
						created_at: Math.floor(Date.now() / 1000),
						updated_at: Math.floor(Date.now() / 1000)
					}
				],
				rowsAffected: 1
			})
		}))
	};
});

// Mock services
vi.mock('$lib/server/services/admin-settings.service', () => ({
	getOpenCodePolicy: vi.fn()
}));

vi.mock('$lib/server/services/opencode.service', () => ({
	getProviderCatalog: vi.fn()
}));

vi.mock('$lib/server/validators/model-variant.validator', () => ({
	validateModelVariantScope: vi.fn()
}));

import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { getProviderCatalog } from '$lib/server/services/opencode.service';
import { validateModelVariantScope } from '$lib/server/validators/model-variant.validator';

const mockCatalog = {
	providers: [
		{
			id: 'openai',
			name: 'OpenAI',
			models: {
				'gpt-4o-mini': {
					id: 'gpt-4o-mini',
					name: 'GPT-4o mini'
				}
			}
		}
	]
};

describe('council-agents API routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/admin/council-agents', () => {
		it('returns list of council agents', async () => {
			const { GET } = await import('../../../../src/routes/api/admin/council-agents/+server');

			const event = {
				url: new URL('http://localhost/api/admin/council-agents')
			} as any;

			const response = await GET(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data).toEqual([]);
		});
	});

	describe('POST /api/admin/council-agents', () => {
		it('creates council agent with valid model and variant', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: {}
			});

			(getProviderCatalog as ReturnType<typeof vi.fn>).mockResolvedValue(mockCatalog);

			(validateModelVariantScope as ReturnType<typeof vi.fn>).mockReturnValue({
				valid: true,
				resolved: { variantId: null }
			});

			const { POST } = await import('../../../../src/routes/api/admin/council-agents/+server');

			const body = JSON.stringify({
				modelId: 'openai/gpt-4o-mini',
				modelVariant: null,
				temperature: 0.7,
				maxTokens: 4096
			});

			const event = {
				request: new Request('http://localhost/api/admin/council-agents', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			} as any;

			const response = await POST(event);
			const json = await response.json();

			expect(response.status).toBe(201);
			expect(json.data.modelId).toBe('openai/gpt-4o-mini');
		});

		it('returns 400 when modelId is missing', async () => {
			const { POST } = await import('../../../../src/routes/api/admin/council-agents/+server');

			const body = JSON.stringify({
				modelId: '',
				temperature: 0.7
			});

			const event = {
				request: new Request('http://localhost/api/admin/council-agents', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			} as any;

			try {
				await POST(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(400);
				const responseBody = JSON.parse((err as { body: { message: string } }).body.message);
				expect(responseBody.message).toContain('Validation failed');
			}
		});

		it('returns 400 when VARIANT_REQUIRED', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: { 'openai/gpt-4o-mini': ['low', 'high'] }
			});

			(getProviderCatalog as ReturnType<typeof vi.fn>).mockResolvedValue(mockCatalog);

			(validateModelVariantScope as ReturnType<typeof vi.fn>).mockReturnValue({
				valid: false,
				error: {
					code: 'VARIANT_REQUIRED',
					message: 'Variant required for this model'
				},
				resolved: { availableVariants: ['low', 'high'] }
			});

			const { POST } = await import('../../../../src/routes/api/admin/council-agents/+server');

			const body = JSON.stringify({
				modelId: 'openai/gpt-4o-mini',
				modelVariant: null,
				temperature: 0.7
			});

			const event = {
				request: new Request('http://localhost/api/admin/council-agents', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			} as any;

			try {
				await POST(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(400);
				const responseBody = JSON.parse((err as { body: { message: string } }).body.message);
				expect(responseBody.message).toContain('Variant required');
			}
		});

		it('returns 422 when VARIANT_NOT_ALLOWED', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: { 'openai/gpt-4o-mini': ['low'] }
			});

			(getProviderCatalog as ReturnType<typeof vi.fn>).mockResolvedValue(mockCatalog);

			(validateModelVariantScope as ReturnType<typeof vi.fn>).mockReturnValue({
				valid: false,
				error: {
					code: 'VARIANT_NOT_ALLOWED',
					message: 'Variant "high" is not allowed'
				}
			});

			const { POST } = await import('../../../../src/routes/api/admin/council-agents/+server');

			const body = JSON.stringify({
				modelId: 'openai/gpt-4o-mini',
				modelVariant: 'high',
				temperature: 0.7
			});

			const event = {
				request: new Request('http://localhost/api/admin/council-agents', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			} as any;

			try {
				await POST(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(422);
				const responseBody = JSON.parse((err as { body: { message: string } }).body.message);
				expect(responseBody.message).toContain('not allowed');
			}
		});
	});

	describe('PUT /api/admin/council-agents/[id]', () => {
		it('updates council agent with valid variant', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: {}
			});

			(getProviderCatalog as ReturnType<typeof vi.fn>).mockResolvedValue(mockCatalog);

			(validateModelVariantScope as ReturnType<typeof vi.fn>).mockReturnValue({
				valid: true,
				resolved: { variantId: 'high' }
			});

			// Mock the db chain for the initial select in getCouncilAgent
			const mockDb = await import('$lib/server/db/client');
			// Override select to return a chain that resolves with the agent
			// Both initial getCouncilAgent and re-fetch after update use this mock
			(mockDb.db as any).select = vi.fn(() => ({
				from: vi.fn(() => ({
					leftJoin: vi.fn(() => ({
						where: vi.fn().mockResolvedValue([
							{ id: 1, modelId: 'openai/gpt-4o-mini', modelVariant: 'high' }
						])
					}))
				}))
			}));

			const { PUT } =
				await import('../../../../src/routes/api/admin/council-agents/[id=int]/+server');

			const body = JSON.stringify({
				modelVariant: 'high'
			});

			const event = {
				params: { id: '1' },
				request: new Request('http://localhost/api/admin/council-agents/1', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			} as any;

			const response = await PUT(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.modelVariant).toBe('high');
		});

		it('returns 404 for non-existent agent', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: {}
			});

			(getProviderCatalog as ReturnType<typeof vi.fn>).mockResolvedValue(mockCatalog);

			// Mock the db chain for the initial select - return empty to trigger 404
			const mockDb = await import('$lib/server/db/client');
			const leftJoinMock = vi.fn(() => ({
				where: vi.fn().mockResolvedValueOnce([])
			}));
			(mockDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
				from: vi.fn(() => ({
					leftJoin: leftJoinMock
				}))
			});

			const { PUT } =
				await import('../../../../src/routes/api/admin/council-agents/[id=int]/+server');

			const body = JSON.stringify({
				modelVariant: 'high'
			});

			const event = {
				params: { id: '999' },
				request: new Request('http://localhost/api/admin/council-agents/999', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			} as any;

			try {
				await PUT(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(404);
			}
		});
	});

	describe('DELETE /api/admin/council-agents/[id]', () => {
		it('deletes council agent', async () => {
			const { DELETE } =
				await import('../../../../src/routes/api/admin/council-agents/[id=int]/+server');

			const event = {
				params: { id: '1' }
			} as any;

			const response = await DELETE(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.deleted).toBe(true);
		});
	});
});
