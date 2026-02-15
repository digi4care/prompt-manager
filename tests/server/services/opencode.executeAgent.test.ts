import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/server/opencode/client', () => ({
	getOpencodeClient: vi.fn()
}));

describe('opencode.service executeAgent', () => {
	it('calls client.agent.execute with agent and input', async () => {
		const clientMod = await import('$lib/server/opencode/client');
		const agentExecute = vi.fn().mockResolvedValue({ data: { ok: true } });
		(clientMod.getOpencodeClient as any).mockReturnValue({ agent: { execute: agentExecute } });

		const svc = await import('$lib/server/services/opencode.service');
		const res = await (svc as any).executeAgent('prompt-improve', { prompt: 'hi' });

		expect(agentExecute).toHaveBeenCalledTimes(1);
		expect(agentExecute).toHaveBeenCalledWith({ agent: 'prompt-improve', input: { prompt: 'hi' } });
		expect(res).toEqual({ data: { ok: true } });
	});

	it('maps connection errors to a friendly error', async () => {
		const clientMod = await import('$lib/server/opencode/client');
		const agentExecute = vi
			.fn()
			.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:4096'));
		(clientMod.getOpencodeClient as any).mockReturnValue({ agent: { execute: agentExecute } });

		const svc = await import('$lib/server/services/opencode.service');
		await expect((svc as any).executeAgent('prompt-judge', { prompt: 'hi' })).rejects.toThrow(
			/Unable to connect to OpenCode server/
		);
	});
});
