import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('OpenCode agent files', () => {
	it('project defines prompt-improve and prompt-judge agents', () => {
		const improvePath = '.opencode/agents/prompt-improve.md';
		const judgePath = '.opencode/agents/prompt-judge.md';

		expect(fs.existsSync(improvePath)).toBe(true);
		expect(fs.existsSync(judgePath)).toBe(true);

		const improve = fs.readFileSync(improvePath, 'utf-8');
		const judge = fs.readFileSync(judgePath, 'utf-8');

		expect(improve).toContain('mode: subagent');
		expect(judge).toContain('mode: subagent');
		expect(improve).toMatch(/Respond with ONLY valid JSON/i);
		expect(judge).toMatch(/Respond with ONLY valid JSON/i);
	});
});
