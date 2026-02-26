import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock services
vi.mock('$lib/server/services/function-defaults.service', () => ({
	getFunctionDefaults: vi.fn(),
	getFunctionDefault: vi.fn(),
	updateFunctionDefaultByType: vi.fn()
}));

vi.mock('$lib/server/services/admin-settings.service', () => ({
	getOpenCodePolicy: vi.fn()
}));

vi.mock('$lib/server/services/opencode.service', () => ({
	getProviders: vi.fn(),
	getProviderCatalog: vi.fn()
}));

vi.mock('$lib/server/validators/model-variant.validator', () => ({
	validateModelVariantScope: vi.fn()
}));

// Mock auth
vi.mock('@opencode-ai/sdk', () => ({}));

import {
	getFunctionDefaults,
	getFunctionDefault,
	updateFunctionDefaultByType
} from '$lib/server/services/function-defaults.service';
import { getOpenCodePolicy } from '$lib/server/services/admin-settings.service';
import { getProviderCatalog } from '$lib/server/services/opencode.service';
import { validateModelVariantScope } from '$lib/server/validators/model-variant.validator';

const mockAuth = (userId: string = 'test-user', email: string = 'test@example.com') => ({
	session: { userId },
	user: { id: userId, email }
});

const mockCatalog = {
	providers: [
		{
			id: 'openai',
			name: 'OpenAI',
			models: [
				{
					id: 'gpt-4o-mini',
					name: 'GPT-4o mini',
					variants: [{ id: 'low' }, { id: 'high' }]
				}
			]
		}
	]
};

describe('function-defaults API routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/admin/function-defaults', () => {
		it('returns all function defaults when authenticated', async () => {
			const mockDefaults = [
				{
					id: 1,
					functionType: 'executor',
					modelId: 'openai/gpt-4o-mini',
					temperature: 0.7,
					maxTokens: 4096,
					promptId: null,
					modelVariant: 'low'
				}
			];

			(getFunctionDefaults as ReturnType<typeof vi.fn>).mockResolvedValue(mockDefaults);

			const { GET } = await import('../../../../src/routes/api/admin/function-defaults/+server');

			const event = {
				locals: { auth: mockAuth() },
				url: new URL('http://localhost/api/admin/function-defaults')
			} as unknown as RequestEvent;

			const response = await GET(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data).toEqual(mockDefaults);
		});
	});

	describe('GET /api/admin/function-defaults/[type]', () => {
		it('returns specific default for valid type', async () => {
			const mockDefault = {
				id: 1,
				functionType: 'executor',
				modelId: 'openai/gpt-4o-mini',
				temperature: 0.7,
				maxTokens: 4096,
				promptId: null,
				modelVariant: null
			};

			(getFunctionDefault as ReturnType<typeof vi.fn>).mockResolvedValue(mockDefault);

			const { GET } =
				await import('../../../../src/routes/api/admin/function-defaults/[type]/+server');

			const event = {
				locals: { auth: mockAuth() },
				params: { type: 'executor' },
				url: new URL('http://localhost/api/admin/function-defaults/executor')
			} as unknown as RequestEvent;

			const response = await GET(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data).toEqual(mockDefault);
			expect(getFunctionDefault).toHaveBeenCalledWith('executor');
		});

		it('returns 404 for invalid function type', async () => {
			const { GET } =
				await import('../../../../src/routes/api/admin/function-defaults/[type]/+server');

			const event = {
				locals: { auth: mockAuth() },
				params: { type: 'invalid-type' },
				url: new URL('http://localhost/api/admin/function-defaults/invalid-type')
			} as unknown as RequestEvent;

			try {
				await GET(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(404);
			}
		});
	});

	describe('PUT /api/admin/function-defaults/[type]', () => {
		it('updates default with valid model and variant', async () => {
			const mockUpdated = {
				id: 1,
				functionType: 'executor',
				modelId: 'openai/gpt-4o-mini',
				temperature: 0.7,
				maxTokens: 4096,
				promptId: null,
				modelVariant: 'low'
			};

			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: { 'openai/gpt-4o-mini': ['low', 'high'] }
			});

			(getProviderCatalog as ReturnType<typeof vi.fn>).mockResolvedValue(mockCatalog);

			(validateModelVariantScope as ReturnType<typeof vi.fn>).mockReturnValue({
				valid: true,
				resolved: { variantId: 'low' }
			});

			(updateFunctionDefaultByType as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdated);

			const { PUT } =
				await import('../../../../src/routes/api/admin/function-defaults/[type]/+server');

			const body = JSON.stringify({
				modelProvider: 'openai',
				modelId: 'gpt-4o-mini',
				modelVariant: 'low',
				temperature: 0.7,
				maxTokens: 4096
			});

			const event = {
				locals: { auth: mockAuth() },
				params: { type: 'executor' },
				request: new Request('http://localhost/api/admin/function-defaults/executor', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body
				}),
				url: new URL('http://localhost/api/admin/function-defaults/executor')
			} as unknown as RequestEvent;

			const response = await PUT(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.data).toEqual(mockUpdated);
		});

		it('returns 400 when VARIANT_REQUIRED but no variant provided', async () => {
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

			const { PUT } =
				await import('../../../../src/routes/api/admin/function-defaults/[type]/+server');

			const body = JSON.stringify({
				modelProvider: 'openai',
				modelId: 'gpt-4o-mini',
				temperature: 0.7,
				maxTokens: 4096
			});

			const event = {
				locals: { auth: mockAuth() },
				params: { type: 'executor' },
				request: new Request('http://localhost/api/admin/function-defaults/executor', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body
				}),
				url: new URL('http://localhost/api/admin/function-defaults/executor')
			} as unknown as RequestEvent;

			try {
				await PUT(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(400);
				const responseBody = JSON.parse((err as { body: { message: string } }).body.message);
				expect(responseBody.code).toBe('VARIANT_REQUIRED');
				expect(responseBody.errors.modelVariant).toBeDefined();
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
					message: 'Variant "high" is not allowed for this model'
				}
			});

			const { PUT } =
				await import('../../../../src/routes/api/admin/function-defaults/[type]/+server');

			const body = JSON.stringify({
				modelProvider: 'openai',
				modelId: 'gpt-4o-mini',
				modelVariant: 'high',
				temperature: 0.7,
				maxTokens: 4096
			});

			const event = {
				locals: { auth: mockAuth() },
				params: { type: 'executor' },
				request: new Request('http://localhost/api/admin/function-defaults/executor', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body
				}),
				url: new URL('http://localhost/api/admin/function-defaults/executor')
			} as unknown as RequestEvent;

			try {
				await PUT(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(422);
				const responseBody = JSON.parse((err as { body: { message: string } }).body.message);
				expect(responseBody.code).toBe('VARIANT_NOT_ALLOWED');
				expect(responseBody.errors.modelVariant).toBeDefined();
			}
		});
	});
});
