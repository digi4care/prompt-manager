import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';


// Mock database
// Mock auth helper
vi.mock('$lib/server/auth.helper', () => ({
	requireAdmin: vi.fn().mockReturnValue({
		userId: 'test-user',
		email: 'test@example.com',
		role: 'admin'
	}),
	authenticateRequest: vi.fn().mockReturnValue({
		userId: 'test-user',
		email: 'test@example.com',
		role: 'admin'
	})
}));
vi.mock('$lib/server/db/client', () => {
	const mockTx = {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				orderBy: vi.fn().mockResolvedValue([])
			}))
		})),
		insert: vi.fn(() => ({
			values: vi.fn(() => ({
				returning: vi
					.fn()
					.mockResolvedValue([
						{ id: 1, name: 'Test Preset', instruction: 'Test', modelVariant: 'low' }
					])
			}))
		})),
		update: vi.fn(() => ({
			set: vi.fn(() => ({
				where: vi.fn(() => ({
					returning: vi
						.fn()
						.mockResolvedValue([{ id: 1, name: 'Updated Preset', modelVariant: 'high' }])
				}))
			}))
		})),
		delete: vi.fn(() => ({
			where: vi.fn(() => ({
				returning: vi.fn().mockResolvedValue([{ id: 1 }])
			}))
		}))
	};

	const db = {
		...mockTx,
		transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
	};

	return { db };
});

// Mock services
vi.mock('$lib/server/services/admin-settings.service', () => ({
	getOpenCodePolicy: vi.fn(),
	isModelAllowed: vi.fn()
}));

import { getOpenCodePolicy, isModelAllowed } from '$lib/server/services/admin-settings.service';

const mockAuth = () => ({
	session: { userId: 'test-user' },
	user: { id: 'test-user', email: 'test@example.com', role: 'admin' }
});

const mockLocals = () => ({ auth: mockAuth() });

describe('improve-presets API routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('GET /api/admin/improve-presets', () => {
		it('returns list of improve presets', async () => {
			const { GET } = await import('../../../../src/routes/api/admin/improve-presets/+server');

			const response = await GET({ locals: mockLocals() } as any);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
			expect(json.data).toEqual([]);
		});
	});

	describe('POST /api/admin/improve-presets', () => {
		it('creates preset with valid model and variant', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: {}
			});

			(isModelAllowed as ReturnType<typeof vi.fn>).mockReturnValue(true);

			const { POST } = await import('../../../../src/routes/api/admin/improve-presets/+server');

			const body = JSON.stringify({
				name: 'Test Preset',
				instruction: 'Test instruction',
				model: 'openai/gpt-4o-mini',
				modelVariant: 'low',
				temperature: 0.7,
				isDefault: false
			});

			const event = {
				locals: mockLocals(),
				request: new Request('http://localhost/api/admin/improve-presets', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			} as any;

			const response = await POST(event);
			const json = await response.json();

			expect(response.status).toBe(201);
			expect(json.success).toBe(true);
			expect(json.data.name).toBe('Test Preset');
		});

		it('returns 400 when name is missing', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: [],
				allowedVariants: {}
			});

			(isModelAllowed as ReturnType<typeof vi.fn>).mockReturnValue(true);

			const { POST } = await import('../../../../src/routes/api/admin/improve-presets/+server');

			const body = JSON.stringify({
				instruction: 'Test instruction'
			});

			const event = {
				locals: mockLocals(),
				request: new Request('http://localhost/api/admin/improve-presets', {
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
				expect(responseBody.message).toContain('Missing required fields');
			}
		});

		it('returns 400 when model is not in allowed list', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['anthropic/claude-3-5-sonnet'],
				allowedVariants: {}
			});

			(isModelAllowed as ReturnType<typeof vi.fn>).mockReturnValue(false);

			const { POST } = await import('../../../../src/routes/api/admin/improve-presets/+server');

			const body = JSON.stringify({
				name: 'Test Preset',
				instruction: 'Test instruction',
				model: 'openai/gpt-4o-mini',
				modelVariant: 'low',
				temperature: 0.7
			});

			const event = {
				locals: mockLocals(),
				request: new Request('http://localhost/api/admin/improve-presets', {
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
				expect(responseBody.errors).toContain(
					'Model "openai/gpt-4o-mini" is not in the allowed list'
				);
			}
		});

		it('returns 400 when modelVariant is empty string', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: {}
			});

			(isModelAllowed as ReturnType<typeof vi.fn>).mockReturnValue(true);

			const { POST } = await import('../../../../src/routes/api/admin/improve-presets/+server');

			const body = JSON.stringify({
				name: 'Test Preset',
				instruction: 'Test instruction',
				model: 'openai/gpt-4o-mini',
				modelVariant: '',
				temperature: 0.7
			});

			const event = {
				locals: mockLocals(),
				request: new Request('http://localhost/api/admin/improve-presets', {
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
				expect(responseBody.errors).toContain('Model variant cannot be empty string');
			}
		});
	});

	describe('GET /api/admin/improve-presets/[id]', () => {
		it('returns 404 for non-existent preset', async () => {
			// Mock db to return empty for getImprovePreset
			const mockDb = await import('$lib/server/db/client');
			(mockDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						limit: vi.fn().mockResolvedValueOnce([])
					}))
				}))
			});

			const { GET } = await import('../../../../src/routes/api/admin/improve-presets/[id=int]/+server');

			const event = {
				locals: mockLocals(),
				params: { id: '999' }
			} as any;

			try {
				await GET(event);
				expect.fail('Expected HttpError to be thrown');
			} catch (err) {
				expect((err as { status: number }).status).toBe(404);
			}
		});
	});

	describe('PUT /api/admin/improve-presets/[id]', () => {
		it('updates preset with valid variant', async () => {
			(getOpenCodePolicy as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowedModels: ['openai/gpt-4o-mini'],
				allowedVariants: {}
			});

			(isModelAllowed as ReturnType<typeof vi.fn>).mockReturnValue(true);

			// Mock db to return existing preset for getImprovePreset
			const mockDb = await import('$lib/server/db/client');
			(mockDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi.fn().mockReturnValueOnce({
						limit: vi
							.fn()
							.mockResolvedValueOnce([{ id: 1, name: 'Existing Preset', instruction: 'Test' }])
					})
				}))
			});

			const { PUT } = await import('../../../../src/routes/api/admin/improve-presets/[id=int]/+server');

			const body = JSON.stringify({
				name: 'Updated Preset',
				instruction: 'Updated instruction',
				modelVariant: 'high'
			});

			const event = {
				locals: mockLocals(),
				params: { id: '1' },
				request: new Request('http://localhost/api/admin/improve-presets/1', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body
				})
			} as any;

			const response = await PUT(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
		});
	});

	describe('DELETE /api/admin/improve-presets/[id]', () => {
		it('deletes existing preset', async () => {
			// Mock db to return existing preset for getImprovePreset
			const mockDb = await import('$lib/server/db/client');
			(mockDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						limit: vi.fn().mockResolvedValueOnce([{ id: 1, name: 'To Delete' }])
					}))
				}))
			});

			const { DELETE } =
				await import('../../../../src/routes/api/admin/improve-presets/[id=int]/+server');

			const event = {
				locals: mockLocals(),
				params: { id: '1' }
			} as any;

			const response = await DELETE(event);
			const json = await response.json();

			expect(response.status).toBe(200);
			expect(json.success).toBe(true);
		});
	});
});
