/**
 * OpenCode Test Double
 *
 * This module provides deterministic mock implementations of OpenCode services
 * for testing without requiring a live OpenCode server or LLM calls.
 *
 * Safety: All test doubles are gated by environment checks to prevent
 * accidental use in production.
 */

import { vi } from 'vitest';

// ============================================================================
// Test Mode Detection
// ============================================================================

export function isTestMode(): boolean {
	return process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';
}

/**
 * Guard to prevent test doubles from being used in production
 */
export function requireTestMode(operation: string): void {
	if (!isTestMode()) {
		throw new Error(
			`[SECURITY] Attempted to use test double "${operation}" in non-test mode. ` +
				'This is a safety violation. Test doubles should only be used in test mode.'
		);
	}
}

// ============================================================================
// Mock Response Types
// ============================================================================

export type MockAgentResponse = {
	data: {
		content?: Array<{
			type: 'text';
			text: string;
		}>;
	};
};

// ============================================================================
// Pre-configured Test Responses
// ============================================================================

export const MOCK_PROVIDERS_RESPONSE = {
	data: {
		providers: [
			{
				id: 'anthropic',
				name: 'Anthropic',
				source: 'env' as const,
				env: ['ANTHROPIC_API_KEY'],
				models: {
					'claude-3-opus': {
						id: 'claude-3-opus',
						providerID: 'anthropic',
						name: 'Claude 3 Opus',
						api: {
							id: 'anthropic',
							url: 'https://api.anthropic.com',
							npm: '@anthropic-ai/sdk'
						},
						capabilities: {
							temperature: true,
							reasoning: true,
							attachment: true,
							toolcall: true,
							input: {
								text: true,
								audio: false,
								image: true,
								video: false,
								pdf: true
							},
							output: {
								text: true,
								audio: false,
								image: false,
								video: false,
								pdf: false
							}
						},
						cost: {
							input: 15,
							output: 75,
							cache: {
								read: 0.3,
								write: 1.5
							}
						},
						limit: {
							context: 200000,
							output: 4096
						},
						status: 'active' as const
					},
					'claude-3-sonnet': {
						id: 'claude-3-sonnet',
						providerID: 'anthropic',
						name: 'Claude 3 Sonnet',
						api: {
							id: 'anthropic',
							url: 'https://api.anthropic.com',
							npm: '@anthropic-ai/sdk'
						},
						capabilities: {
							temperature: true,
							reasoning: true,
							attachment: true,
							toolcall: true,
							input: {
								text: true,
								audio: false,
								image: true,
								video: false,
								pdf: true
							},
							output: {
								text: true,
								audio: false,
								image: false,
								video: false,
								pdf: false
							}
						},
						cost: {
							input: 3,
							output: 15,
							cache: {
								read: 0.3,
								write: 1.5
							}
						},
						limit: {
							context: 200000,
							output: 4096
						},
						status: 'active' as const
					}
				}
			},
			{
				id: 'openai',
				name: 'OpenAI',
				source: 'env' as const,
				env: ['OPENAI_API_KEY'],
				models: {
					'gpt-4-turbo': {
						id: 'gpt-4-turbo',
						providerID: 'openai',
						name: 'GPT-4 Turbo',
						api: {
							id: 'openai',
							url: 'https://api.openai.com',
							npm: 'openai'
						},
						capabilities: {
							temperature: true,
							reasoning: true,
							attachment: false,
							toolcall: true,
							input: {
								text: true,
								audio: false,
								image: false,
								video: false,
								pdf: false
							},
							output: {
								text: true,
								audio: false,
								image: false,
								video: false,
								pdf: false
							}
						},
						cost: {
							input: 10,
							output: 30,
							cache: {
								read: 0.3,
								write: 1.5
							}
						},
						limit: {
							context: 128000,
							output: 4096
						},
						status: 'active' as const
					}
				}
			}
		]
	}
};

// ============================================================================
// OpenCode Client Mock (Partial Implementation)
// ============================================================================

export class MockOpencodeClient {
	private responses: Map<string, MockAgentResponse> = new Map();

	agent: any;
	session: any;
	global: any;
	config: any;

	constructor() {
		requireTestMode('MockOpencodeClient');

		// Mock agent.execute
		this.agent = {
			execute: vi.fn(async ({ agent }: { agent: string; input: unknown }) => {
				const response = this.responses.get(agent);
				if (!response) {
					throw new Error(`No mock response registered for agent: ${agent}`);
				}
				return response;
			})
		};

		// Mock session behavior
		this.session = {
			create: vi.fn(async () => ({
				data: { id: 'mock-session-id' }
			})),

			prompt: vi.fn(async ({ agent, model }: { agent?: string; model?: any }) => {
				if (agent) {
					const response = this.responses.get(agent);
					if (response) {
						return response;
					}
				}

				// Default mock response
				return {
					data: {
						content: [
							{
								type: 'text',
								text: JSON.stringify({
									variants: [
										{
											prompt: 'Improved version of prompt',
											changes: 'Changes made',
											version: '1.0'
										}
									]
								})
							}
						]
					}
				};
			}),

			message: vi.fn(),
			messages: vi.fn(),
			status: vi.fn()
		};

		// Mock global health
		this.global = {
			health: vi.fn(async () => ({
				data: { version: '0.0.0-test', status: 'ok' }
			}))
		};

		// Mock config
		this.config = {
			get: vi.fn(async () => ({
				data: { models: {} }
			})),
			update: vi.fn(),
			providers: vi.fn(async () => MOCK_PROVIDERS_RESPONSE)
		};
	}

	/**
	 * Register a mock response for an agent
	 */
	setAgentResponse(agent: string, response: MockAgentResponse): void {
		this.responses.set(agent, response);
	}

	/**
	 * Get a mock response for an agent
	 */
	getAgentResponse(agent: string): MockAgentResponse | undefined {
		return this.responses.get(agent);
	}
}

// ============================================================================
// Pre-configured Test Responses
// ============================================================================

export const MOCK_IMPROVE_RESPONSE: MockAgentResponse = {
	data: {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					variants: [
						{
							prompt:
								'This is an improved version of your prompt with better clarity and structure.',
							changes: 'Enhanced clarity, improved structure, added examples',
							version: '2.0'
						},
						{
							prompt: 'Alternative improved version focusing on brevity.',
							changes: 'Condensed content, removed redundancy',
							version: '2.0'
						},
						{
							prompt: 'Third variant emphasizing specificity.',
							changes: 'Added specific constraints, detailed requirements',
							version: '2.0'
						}
					]
				})
			}
		]
	}
};

export const MOCK_JUDGE_RESPONSE: MockAgentResponse = {
	data: {
		content: [
			{
				type: 'text',
				text: JSON.stringify({
					score: 85,
					gaps: [
						'Could benefit from more specific examples',
						'Missing clear success criteria',
						'Could be more concise'
					],
					recommendations: [
						'Add 2-3 concrete examples of input/output',
						'Define what "success" looks like for the prompt',
						'Reduce word count by ~30% while maintaining clarity'
					],
					summary:
						'The prompt is well-structured and clear but could benefit from more specific guidance and examples. Overall quality is good with room for improvement in conciseness and specificity.'
				})
			}
		]
	}
};

// ============================================================================
// Test Double Factory
// ============================================================================

export function createMockOpencodeClient(): MockOpencodeClient {
	const client = new MockOpencodeClient();

	// Set up default responses
	client.setAgentResponse('prompt-improve', MOCK_IMPROVE_RESPONSE);
	client.setAgentResponse('prompt-judge', MOCK_JUDGE_RESPONSE);

	return client;
}

// ============================================================================
// Test Double Self-Test
// ============================================================================

export function testMockClientSelf(): boolean {
	const client = createMockOpencodeClient();

	try {
		const improveResp = client.getAgentResponse('prompt-improve');
		const judgeResp = client.getAgentResponse('prompt-judge');

		return !!improveResp && !!judgeResp;
	} catch (err) {
		return false;
	}
}
