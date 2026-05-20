import type { RequestHandler } from './$types';
import { z } from 'zod';
import {
	executeAgentWithSession,
	type ModelSelection,
	OpenCodeError,
	OpenCodeConnectionError,
	OpenCodeAuthenticationError,
	OpenCodeValidationError,
	OpenCodeExecutionError
} from '$lib/server/services/opencode.service';
import { authenticateRequest } from '$lib/server/auth.helper';
import { validateRequest } from '$lib/server/utils/validate-request';
import { apiSuccess, apiFail } from '$lib/server/utils/api-response';

const chatRequestSchema = z.object({
	message: z.string().min(1).max(10000),
	model: z.string().default('claude-3-5-sonnet-20241022')
});

/**
 * Parse model ID into providerID and modelID
 */
function parseModelId(modelId: string): ModelSelection {
	const separatorIndex = modelId.indexOf('/');
	if (separatorIndex !== -1) {
		return {
			providerID: modelId.substring(0, separatorIndex),
			modelID: modelId.substring(separatorIndex + 1)
		};
	}

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

	return { providerID: 'anthropic', modelID: modelId };
}

/**
 * Map OpenCode errors to HTTP status codes
 */
function mapOpenCodeErrorStatus(err: unknown): number {
	if (err instanceof OpenCodeConnectionError) return 503;
	if (err instanceof OpenCodeAuthenticationError) return 401;
	if (err instanceof OpenCodeValidationError) return 400;
	if (err instanceof OpenCodeExecutionError) return 500;
	if (err instanceof OpenCodeError) return 500;
	return 500;
}

export const POST: RequestHandler = async (event) => {
	authenticateRequest(event);

	const { message, model } = await validateRequest(event, chatRequestSchema);
	const modelSelection = parseModelId(model);

	try {
		const res = await executeAgentWithSession<string>({
			model: modelSelection,
			agent: 'chat',
			parts: [{ type: 'text', text: message }],
			maxTokens: 1024
		});

		if (res.error) {
			apiFail(res.error.message || 'AI request failed', 500);
		}

		const content = res.data || '';
		const usage = (res as { usage?: { input_tokens: number; output_tokens: number } })?.usage ?? { input_tokens: 0, output_tokens: 0 };

		return apiSuccess({ content, message: content, usage });
	} catch (err: unknown) {
		console.error('AI chat error:', err);
		const status = mapOpenCodeErrorStatus(err);
		const msg =
			err instanceof Error ? err.message : 'An unexpected error occurred.';
		apiFail(msg, status);
	}
};
