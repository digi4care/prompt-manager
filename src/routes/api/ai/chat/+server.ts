import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
	executeAgentWithSession,
	type ModelSelection
} from '$lib/server/services/opencode.service';
import {
	OpenCodeError,
	OpenCodeConnectionError,
	OpenCodeAuthenticationError,
	OpenCodeValidationError,
	OpenCodeExecutionError
} from '$lib/server/services/opencode.service';
import { authenticateRequest } from '$lib/server/auth/jwt';

const chatRequestSchema = z.object({
	message: z.string().min(1).max(10000),
	model: z.string().default('claude-3-5-sonnet-20241022')
});

/**
 * Parse model ID into providerID and modelID
 * Accepts formats: "provider/model" or just "model" (defaults to Anthropic for Claude models)
 */
function parseModelId(modelId: string): ModelSelection {
	// Check if modelId contains provider separator
	const separatorIndex = modelId.indexOf('/');

	if (separatorIndex !== -1) {
		// Format: "provider/model"
		return {
			providerID: modelId.substring(0, separatorIndex),
			modelID: modelId.substring(separatorIndex + 1)
		};
	}

	// Format: just "model" - infer provider from common patterns
	const providerMapping: Record<string, string> = {
		claude: 'anthropic',
		gpt: 'openai',
		gemini: 'google'
	};

	for (const [prefix, provider] of Object.entries(providerMapping)) {
		if (modelId.startsWith(prefix)) {
			return { providerID: provider, modelID: modelId };
		}
	}

	// Default: assume Claude model if no provider specified
	return { providerID: 'anthropic', modelID: modelId };
}

/**
 * Map OpenCode errors to appropriate HTTP responses
 */
function mapOpenCodeErrorToHTTP(err: unknown): { status: number; message: string } {
	if (err instanceof OpenCodeConnectionError) {
		return { status: 503, message: 'Service unavailable. Please try again later.' };
	}
	if (err instanceof OpenCodeAuthenticationError) {
		return { status: 401, message: 'Authentication failed. Please verify your credentials.' };
	}
	if (err instanceof OpenCodeValidationError) {
		return { status: 400, message: 'Invalid request parameters. Please check your input.' };
	}
	if (err instanceof OpenCodeExecutionError) {
		return { status: 500, message: 'AI request failed. Please try again.' };
	}
	if (err instanceof OpenCodeError) {
		return { status: 500, message: err.message };
	}

	// Unknown error
	return { status: 500, message: 'An unexpected error occurred.' };
}

export const POST: RequestHandler = async (event) => {
	// Require authentication for AI chat
	const user = authenticateRequest(event);

	try {
		const body = await event.request.json();
		const parsed = chatRequestSchema.safeParse(body);

		if (!parsed.success) {
			throw error(
				400,
				JSON.stringify({ message: 'Invalid request', errors: parsed.error.flatten() })
			);
		}

		const { message, model } = parsed.data;

		// Parse model ID into provider and model
		const modelSelection = parseModelId(model);

		// Execute using OpenCode session.prompt
		// Using 'chat' as agent name - this would need to be defined in OpenCode
		const res = await executeAgentWithSession({
			model: modelSelection,
			agent: 'chat',
			parts: [{ type: 'text', text: message }],
			maxTokens: 1024
		});

		// Extract content from OpenCode response
		// The response format depends on the agent implementation
		const payload = (res as any)?.data ?? res;
		const content = typeof payload === 'string' ? payload : JSON.stringify(payload);

		// Extract usage info if available
		const usage = (res as any)?.usage ?? { input_tokens: 0, output_tokens: 0 };

		return json({
			content,
			message: content,
			usage
		});
	} catch (err: unknown) {
		console.error('AI chat error:', err);

		// Check if it's an OpenCode error
		const httpError = mapOpenCodeErrorToHTTP(err);

		throw error(httpError.status, JSON.stringify({ message: httpError.message, errors: null }));
	}
};
