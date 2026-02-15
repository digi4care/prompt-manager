import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/opencode.service', () => ({
	executeAgentWithSession: vi.fn()
}));

vi.mock('$lib/server/services/admin-settings.service', () => ({
	getOpenCodePolicy: vi.fn().mockResolvedValue({
		allowedModels: [],
		improveDefaultModel: 'MiniMax-M2.1',
		judgeDefaultModel: 'MiniMax-M2.1',
		improveTemperature: 0.7,
		judgeTemperature: 0.0
	}),
	isModelAllowed: vi.fn().mockReturnValue(true)
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

describe('judge.service (OpenCode adapter)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('evaluatePrompt calls prompt-judge agent and maps criteria to legacy JudgeResponse fields', async () => {
		const oc = await import('$lib/server/services/opencode.service');
		(oc.executeAgentWithSession as any).mockResolvedValue({
			data: {
				score: 80,
				criteria: { clarity: 90, specificity: 70, structure: 60, constraints: 50 },
				gaps: ['Missing output format'],
				recommendations: ['Add explicit output format'],
				summary: 'ok'
			}
		});

		const svc = await import('$lib/server/services/judge.service');
		const version = {
			id: 1,
			promptId: 1,
			version: '1.0.0',
			content: 'Hello',
			metadata: null,
			parentVersionId: null,
			changeType: 'major',
			changeNotes: 'init',
			createdAt: new Date(),
			createdBy: 'user'
		} as any;

		const result = await svc.evaluatePrompt(version);
		// Verify session.prompt was called with model selection (ara.12 spike result)
		expect(oc.executeAgentWithSession).toHaveBeenCalledWith({
			model: { providerID: 'minimax', modelID: 'MiniMax-M2.1' },
			agent: 'prompt-judge',
			parts: [{ type: 'text', text: JSON.stringify({ prompt: 'Hello' }) }],
			temperature: 0.0
		});
		expect(result.thinking).toBeNull();
		expect(result.response).toEqual({
			clarity: 90,
			completeness: 60,
			specificity: 70,
			gaps: ['Missing output format'],
			recommendations: ['Add explicit output format']
		});
		// Verify model parameters are captured for provenance (ara.14)
		expect(result.providerId).toBe('minimax');
		expect(result.modelId).toBe('MiniMax-M2.1');
		expect(result.temperature).toBe(0.0);
	});
});
