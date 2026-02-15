import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/opencode.service', () => ({
	executeAgent: vi.fn()
}));

// Prevent loading the real libsql client in this unit test
vi.mock('$lib/server/db/client', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

describe('improvement.service (OpenCode adapter)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('generateVariants calls prompt-improve agent and returns improvement prompts', async () => {
		const oc = await import('$lib/server/services/opencode.service');
		(oc.executeAgent as any).mockResolvedValue({
			data: {
				improvements: [
					{ version: '2.0', changes: 'x', prompt: 'Variant 1' },
					{ version: '3.0', changes: 'y', prompt: 'Variant 2' },
					{ version: '4.0', changes: 'z', prompt: 'Variant 3' }
				]
			}
		});

		const svc = await import('$lib/server/services/improvement.service');
		const baseVersion = { content: 'Base' } as any;
		const judgeResponse = {
			gaps: ['g1'],
			recommendations: ['r1'],
			clarity: 1,
			completeness: 1,
			specificity: 1
		} as any;

		const variants = await svc.generateVariants(baseVersion, judgeResponse, 2);
		expect(oc.executeAgent).toHaveBeenCalledWith('prompt-improve', {
			prompt: 'Base',
			count: 2,
			gaps: ['g1'],
			recommendations: ['r1']
		});
		expect(variants).toEqual(['Variant 1', 'Variant 2']);
	});

	it('startImprovementLoop saves model parameters when provided', async () => {
		const db = await import('$lib/server/db/client');
		const mockInsert = vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: 123 }])
			})
		});
		(db.db as any).insert = mockInsert;

		const svc = await import('$lib/server/services/improvement.service');

		const loopId = await svc.startImprovementLoop(1, 2, 3, {
			providerId: 'anthropic',
			modelId: 'claude-3-5-sonnet-20241022',
			temperature: 0.7,
			maxTokens: 4096
		});

		expect(loopId).toBe(123);
		expect(mockInsert).toHaveBeenCalled();
	});

	it('startImprovementLoop works without model parameters (backward compatibility)', async () => {
		const db = await import('$lib/server/db/client');
		const mockInsert = vi.fn().mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: 456 }])
			})
		});
		(db.db as any).insert = mockInsert;

		const svc = await import('$lib/server/services/improvement.service');

		const loopId = await svc.startImprovementLoop(1, 2, 3);

		expect(loopId).toBe(456);
		expect(mockInsert).toHaveBeenCalled();
	});
});
