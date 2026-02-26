import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock database
vi.mock('$lib/server/db/client', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					orderBy: vi.fn().mockResolvedValue([])
				})),
				orderBy: vi.fn().mockResolvedValue([])
			}))
		})),
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
	}
}));

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
			} as unknown as RequestEvent;

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
			} as unknown as RequestEvent;

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
			} as unknown as RequestEvent;

			try {
				await POST(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(400);
				const responseBody = JSON.parse((err as { body: { message: string } }).body.message);
				expect(responseBody.code).toBe('MODEL_REQUIRED');
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
			} as unknown as RequestEvent;

			try {
				await POST(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(400);
				const responseBody = JSON.parse((err as { body: { message: string } }).body.message);
				expect(responseBody.code).toBe('VARIANT_REQUIRED');
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
			} as unknown as RequestEvent;

			try {
				await POST(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(422);
				const responseBody = JSON.parse((err as { body: { message: string } }).body.message);
				expect(responseBody.code).toBe('VARIANT_NOT_ALLOWED');
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

			// Mock the db chain for the initial select in handleUpdate
			const mockDb = await import('$lib/server/db/client');
			(mockDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi
						.fn()
						.mockResolvedValueOnce([{ id: 1, modelId: 'openai/gpt-4o-mini', modelVariant: 'low' }])
				}))
			});

			const { PUT } = await import('../../../../src/routes/api/admin/council-agents/[id]/+server');

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
			} as unknown as RequestEvent;

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
			(mockDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi.fn().mockResolvedValueOnce([])
				}))
			});

			const { PUT } = await import('../../../../src/routes/api/admin/council-agents/[id]/+server');

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
			} as unknown as RequestEvent;

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
				await import('../../../../src/routes/api/admin/council-agents/[id]/+server');

			const event = {
				params: { id: '1' }
			} as unknown as RequestEvent;

			const response = await DELETE(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data.id).toBe(1);
		});
	});
});
