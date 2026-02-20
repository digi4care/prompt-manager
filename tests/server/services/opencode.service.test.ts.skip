import { describe, it, expect } from 'vitest';

// TDD: this file defines the contract we want from the OpenCode adapter.
// The implementation will be introduced in later beads.

describe('opencode.service contract', () => {
	it('exports improvePrompt and judgePrompt functions', async () => {
		const mod = await import('$lib/server/services/opencode.service');
		expect(typeof (mod as any).improvePrompt).toBe('function');
		expect(typeof (mod as any).judgePrompt).toBe('function');
	});

	it('exports a health check helper (optional but recommended)', async () => {
		const mod = await import('$lib/server/services/opencode.service');
		expect(typeof (mod as any).checkOpencodeHealth).toBe('function');
	});
});
