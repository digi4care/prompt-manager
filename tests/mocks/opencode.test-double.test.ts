/**
 * Tests for OpenCode Test Double
 *
 * Validates that the test double:
 * - Prevents accidental use in production
 * - Provides deterministic responses
 * - Matches expected interface
 * - Can be easily swapped with real client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	MockOpencodeClient,
	createMockOpencodeClient,
	MOCK_IMPROVE_RESPONSE,
	MOCK_JUDGE_RESPONSE,
	isTestMode,
	requireTestMode,
	testMockClientSelf
} from '../mocks/opencode.test-double';

describe('OpenCode Test Double - Safety', () => {
	let originalTestMode: string | undefined;
	let originalNodeEnv: string | undefined;

	beforeEach(() => {
		originalTestMode = process.env.TEST_MODE;
		originalNodeEnv = process.env.NODE_ENV;
	});

	afterEach(() => {
		process.env.TEST_MODE = originalTestMode;
		process.env.NODE_ENV = originalNodeEnv;
	});

	describe('isTestMode()', () => {
		it('returns true when TEST_MODE is true', () => {
			process.env.TEST_MODE = 'true';
			expect(isTestMode()).toBe(true);
		});

		it('returns true when NODE_ENV is test', () => {
			process.env.NODE_ENV = 'test';
			expect(isTestMode()).toBe(true);
		});

		it('returns false when neither env is set', () => {
			delete process.env.TEST_MODE;
			process.env.NODE_ENV = 'development';
			expect(isTestMode()).toBe(false);
		});
	});

	describe('requireTestMode()', () => {
		it('does not throw when in test mode', () => {
			process.env.TEST_MODE = 'true';
			expect(() => requireTestMode('test-operation')).not.toThrow();
		});

		it('throws when not in test mode', () => {
			delete process.env.TEST_MODE;
			process.env.NODE_ENV = 'production';

			expect(() => requireTestMode('dangerous-operation')).toThrow(/SECURITY.*test double/);
		});

		it('includes operation name in error message', () => {
			delete process.env.TEST_MODE;
			process.env.NODE_ENV = 'development';

			expect(() => requireTestMode('my-test-operation')).toThrow('my-test-operation');
		});
	});
});

describe('OpenCode Test Double - Functionality', () => {
	beforeEach(() => {
		process.env.TEST_MODE = 'true';
	});

	describe('MockOpencodeClient', () => {
		it('creates instance without errors in test mode', () => {
			expect(() => new MockOpencodeClient()).not.toThrow();
		});

		it('has agent.execute method', () => {
			const client = new MockOpencodeClient();
			expect(client.agent.execute).toBeDefined();
			expect(typeof client.agent.execute).toBe('function');
		});

		it('has session methods', () => {
			const client = new MockOpencodeClient();
			expect(client.session).toBeDefined();
			expect(client.session.create).toBeDefined();
			expect(client.session.prompt).toBeDefined();
		});

		it('has global.health method', () => {
			const client = new MockOpencodeClient();
			expect(client.global).toBeDefined();
			expect(client.global.health).toBeDefined();
		});
	});

	describe('setAgentResponse()', () => {
		it('stores mock response for agent', () => {
			const client = new MockOpencodeClient();
			const mockResp = { data: { content: [] } };

			client.setAgentResponse('test-agent', mockResp as any);

			expect(client.getAgentResponse('test-agent')).toEqual(mockResp);
		});

		it('can overwrite existing response', () => {
			const client = new MockOpencodeClient();
			const mockResp1 = { data: { content: [{ type: 'text', text: 'first' }] } };
			const mockResp2 = { data: { content: [{ type: 'text', text: 'second' }] } };

			client.setAgentResponse('test-agent', mockResp1 as any);
			client.setAgentResponse('test-agent', mockResp2 as any);

			expect(client.getAgentResponse('test-agent')).toEqual(mockResp2);
		});
	});

	describe('agent.execute()', () => {
		it('returns registered mock response', async () => {
			const client = new MockOpencodeClient();
			client.setAgentResponse('test-agent', MOCK_IMPROVE_RESPONSE);

			const result = await client.agent.execute({
				agent: 'test-agent',
				input: { test: 'input' }
			});

			expect(result).toEqual(MOCK_IMPROVE_RESPONSE);
		});

		it('throws when no response registered', async () => {
			const client = new MockOpencodeClient();

			await expect(
				client.agent.execute({
					agent: 'unregistered-agent',
					input: {}
				})
			).rejects.toThrow('No mock response registered for agent: unregistered-agent');
		});

		it('calls vi.fn mock', async () => {
			const client = new MockOpencodeClient();
			client.setAgentResponse('test-agent', MOCK_IMPROVE_RESPONSE);

			await client.agent.execute({
				agent: 'test-agent',
				input: {}
			});

			expect(client.agent.execute).toHaveBeenCalledTimes(1);
			expect(client.agent.execute).toHaveBeenCalledWith(
				expect.objectContaining({ agent: 'test-agent' })
			);
		});
	});

	describe('session.prompt()', () => {
		it('returns mock response for registered agent', async () => {
			const client = new MockOpencodeClient();
			client.setAgentResponse('test-agent', MOCK_JUDGE_RESPONSE);

			const result = await client.session.prompt({
				agent: 'test-agent',
				model: { providerID: 'anthropic', modelID: 'claude-3' }
			});

			expect(result).toEqual(MOCK_JUDGE_RESPONSE);
		});

		it('returns default response when no agent specified', async () => {
			const client = new MockOpencodeClient();

			const result = await client.session.prompt({
				model: { providerID: 'anthropic', modelID: 'claude-3' }
			});

			expect(result.data).toBeDefined();
			expect(result.data?.content).toBeDefined();
			expect(Array.isArray(result.data?.content)).toBe(true);
		});
	});

	describe('global.health()', () => {
		it('returns mock health response', async () => {
			const client = new MockOpencodeClient();

			const result = await client.global.health();

			expect(result.data).toBeDefined();
			expect(result.data?.status).toBe('ok');
			expect(result.data?.version).toContain('test');
		});

		it('calls vi.fn mock', async () => {
			const client = new MockOpencodeClient();

			await client.global.health();

			expect(client.global.health).toHaveBeenCalledTimes(1);
		});
	});
});

describe('OpenCode Test Double - Factory', () => {
	beforeEach(() => {
		process.env.TEST_MODE = 'true';
	});

	describe('createMockOpencodeClient()', () => {
		it('creates client with default responses', () => {
			const client = createMockOpencodeClient();

			expect(client.getAgentResponse('prompt-improve')).toEqual(MOCK_IMPROVE_RESPONSE);
			expect(client.getAgentResponse('prompt-judge')).toEqual(MOCK_JUDGE_RESPONSE);
		});

		it('returns MockOpencodeClient instance', () => {
			const client = createMockOpencodeClient();

			expect(client).toBeInstanceOf(MockOpencodeClient);
		});
	});
});

describe('OpenCode Test Double - Self-Test', () => {
	beforeEach(() => {
		process.env.TEST_MODE = 'true';
	});

	describe('testMockClientSelf()', () => {
		it('returns true when test double is functional', () => {
			expect(testMockClientSelf()).toBe(true);
		});
	});
});

describe('OpenCode Test Double - Pre-configured Responses', () => {
	beforeEach(() => {
		process.env.TEST_MODE = 'true';
	});

	describe('MOCK_IMPROVE_RESPONSE', () => {
		it('has correct structure', () => {
			expect(MOCK_IMPROVE_RESPONSE.data).toBeDefined();
			expect(MOCK_IMPROVE_RESPONSE.data.content).toBeDefined();
			expect(Array.isArray(MOCK_IMPROVE_RESPONSE.data.content)).toBe(true);
		});

		it('contains valid JSON in text field', () => {
			const content = MOCK_IMPROVE_RESPONSE.data.content?.[0];
			const parsed = JSON.parse(content?.text || '{}');

			expect(parsed.variants).toBeDefined();
			expect(Array.isArray(parsed.variants)).toBe(true);
			expect(parsed.variants.length).toBeGreaterThan(0);
		});
	});

	describe('MOCK_JUDGE_RESPONSE', () => {
		it('has correct structure', () => {
			expect(MOCK_JUDGE_RESPONSE.data).toBeDefined();
			expect(MOCK_JUDGE_RESPONSE.data.content).toBeDefined();
			expect(Array.isArray(MOCK_JUDGE_RESPONSE.data.content)).toBe(true);
		});

		it('contains valid JSON in text field', () => {
			const content = MOCK_JUDGE_RESPONSE.data.content?.[0];
			const parsed = JSON.parse(content?.text || '{}');

			expect(parsed.score).toBeDefined();
			expect(typeof parsed.score).toBe('number');
			expect(parsed.gaps).toBeDefined();
			expect(Array.isArray(parsed.gaps)).toBe(true);
			expect(parsed.recommendations).toBeDefined();
			expect(Array.isArray(parsed.recommendations)).toBe(true);
		});
	});
});
