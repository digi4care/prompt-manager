import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/server/services/opencode.service', () => ({
	checkOpencodeHealth: vi.fn()
}));

describe('OpenCode Health API', () => {
	it('returns 200 when healthy', async () => {
		const svc = await import('$lib/server/services/opencode.service');
		(svc.checkOpencodeHealth as any).mockResolvedValue({ healthy: true, version: '1.2.3' });

		const { GET } = await import('$lib/../routes/api/opencode/health/+server');
		const request = new Request('http://localhost/api/opencode/health', { method: 'GET' });
		const event = { request, params: {} } as unknown as RequestEvent<any, any>;

		const res = await GET(event);
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ healthy: true, version: '1.2.3' });
	});

	it('returns 503 when not healthy', async () => {
		const svc = await import('$lib/server/services/opencode.service');
		(svc.checkOpencodeHealth as any).mockResolvedValue({ healthy: false });

		const { GET } = await import('$lib/../routes/api/opencode/health/+server');
		const request = new Request('http://localhost/api/opencode/health', { method: 'GET' });
		const event = { request, params: {} } as unknown as RequestEvent<any, any>;

		const res = await GET(event);
		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toEqual({ healthy: false });
	});
});
