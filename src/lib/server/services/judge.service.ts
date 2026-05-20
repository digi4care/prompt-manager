import { db } from '../db/client';
import { judgeEvaluations, performanceMetrics, type PromptVersion } from '../db/schema';
import {
	executeAgentWithSession,
	OpenCodeValidationError
} from '$lib/server/services/opencode.service';
import { parseJudgeAgentResponse } from '$lib/server/opencode/contracts';
import {
	getOpenCodePolicy,
	isModelAllowed,
	type OpenCodePolicy
} from '$lib/server/services/admin-settings.service';

export type JudgeResponse = {
	clarity: number;
	completeness: number;
	specificity: number;
	gaps: string[];
	recommendations: string[];
};

export type ThinkingBlock = {
	thinking: string;
	signature?: string;
};

export interface EvaluationResult {
	response: JudgeResponse;
	thinking: ThinkingBlock | null;
	rawText: string;
	providerId?: string;
	modelId?: string;
	modelVariant?: string | null;
	temperature?: number;
	maxTokens?: number;
	allowedModels?: string[]; // Requested allowed models subset (for metadata)
}

function clamp0to100(n: number): number {
	return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Parse model ID to extract providerID and modelID.
 * Handles formats like "MiniMax-M2.1" or "claude-3-5-sonnet-20241022"
 *
 * Heuristics:
 * - If model contains hyphens, extract provider from first segment (lowercased)
 * - If model is simple name, use the model ID as both provider and model (backward compatible)
 */
function parseModelId(modelId: string): { providerID: string; modelID: string } {
	// If model ID contains a hyphen, assume format "Provider-ModelName" or similar
	if (modelId.includes('-')) {
		const parts = modelId.split('-');
		const providerID = parts[0].toLowerCase();
		return { providerID, modelID: modelId };
	}

	// Default: use the model ID for both (backward compatible with simple model names)
	return { providerID: modelId.toLowerCase(), modelID: modelId };
}

/**
 * Validate and select effective model based on policy and request constraints.
 *
 * @param policy - OpenCode policy with allowed models and defaults
 * @param allowedModels - Optional request-specific allowed models subset
 * @returns Selected model ID
 * @throws OpenCodeValidationError if model is not allowed
 */
function selectEffectiveModel(policy: OpenCodePolicy, allowedModels?: string[]): string {
	let candidateModel = policy.judgeDefaultModel;

	// If request specifies allowedModels, they must be a subset of global policy
	if (allowedModels && allowedModels.length > 0) {
		// Validate each model in allowedModels is in global policy
		const invalidModels = allowedModels.filter((m) => !isModelAllowed(m, policy));
		if (invalidModels.length > 0) {
			throw new OpenCodeValidationError(
				`Requested models not allowed by global policy: ${invalidModels.join(', ')}`
			);
		}

		// Check if default model is in the request-specific allowlist
		if (allowedModels.includes(candidateModel)) {
			return candidateModel;
		}

		// Otherwise, use the first model from request allowlist
		return allowedModels[0];
	}

	// Validate default model against global policy
	if (!isModelAllowed(candidateModel, policy)) {
		throw new OpenCodeValidationError(
			`Default model '${candidateModel}' is not in global policy allowlist`
		);
	}

	return candidateModel;
}

// Re-export error type for judge service
export { OpenCodeValidationError } from '$lib/server/services/opencode.service';

export async function evaluatePrompt(
	version: PromptVersion,
	retryCount = 0,
	allowedModels?: string[]
): Promise<EvaluationResult> {
	const maxRetries = 2;

	try {
		// 1. Get OpenCode policy for model selection
		const policy = await getOpenCodePolicy();

		// 2. Select effective model based on policy and request constraints
		const selectedModel = selectEffectiveModel(policy, allowedModels);

		// 3. Parse model ID to extract provider and model components
		const { providerID, modelID } = parseModelId(selectedModel);

		// 4. Call OpenCode using session.prompt with model selection (ara.12 spike result)
		// Rubric-only: no instruction field, only prompt content
		const res = await executeAgentWithSession({
			model: { providerID, modelID },
			agent: 'prompt-judge',
			parts: [{ type: 'text', text: JSON.stringify({ prompt: version.content }) }],
			temperature: policy.judgeTemperature
		});

		const payload = (res as any)?.data ?? res;
		const parsed = parseJudgeAgentResponse(payload);

		const mapped: JudgeResponse = {
			clarity: clamp0to100(parsed.criteria.clarity),
			completeness: clamp0to100(parsed.criteria.structure),
			specificity: clamp0to100(parsed.criteria.specificity),
			gaps: parsed.gaps,
			recommendations: parsed.recommendations
		};

		// 5. Return result with model parameters for provenance (ara.14)
		return {
			response: mapped,
			thinking: null,
			rawText: JSON.stringify(payload),
			providerId: providerID,
			modelId: selectedModel,
			temperature: policy.judgeTemperature,
			allowedModels
		};
	} catch (error: unknown) {
		// Retry a couple of times for transient failures.
		if (retryCount < maxRetries) {
			const backoff = Math.pow(2, retryCount) * 250;
			await new Promise((r) => setTimeout(r, backoff));
			return evaluatePrompt(version, retryCount + 1, allowedModels);
		}
		throw error;
	}
}

export async function saveEvaluation(
	versionId: number,
	judgeResponse: JudgeResponse,
	rawResponse: string,
	thinking: ThinkingBlock | null,
	modelParams?: {
		providerId?: string;
		modelId?: string;
		temperature?: number;
		maxTokens?: number;
	}
): Promise<number> {
	const qualityScore =
		(judgeResponse.clarity + judgeResponse.completeness + judgeResponse.specificity) / 3;

	return await db.transaction(async (tx) => {
		const [evaluation] = await tx
			.insert(judgeEvaluations)
			.values({
				versionId,
				judgeModel: modelParams?.modelId || 'opencode:prompt-judge',
				providerId: modelParams?.providerId || null,
				modelId: modelParams?.modelId || null,
				temperature: modelParams?.temperature || null,
				maxTokens: modelParams?.maxTokens || null,
				criteria: JSON.stringify({
					clarity: 'Is the prompt clear and unambiguous?',
					completeness: 'Does it include all necessary context?',
					specificity: 'Are instructions specific and actionable?'
				}),
				scores: JSON.stringify({
					clarity: judgeResponse.clarity,
					completeness: judgeResponse.completeness,
					specificity: judgeResponse.specificity,
					overall: qualityScore
				}),
				gaps: JSON.stringify(judgeResponse.gaps),
				recommendations: JSON.stringify(judgeResponse.recommendations),
				rawResponse,
				thinking: thinking?.thinking || null,
				thinkingSignature: thinking?.signature || null
			})
			.returning();

		// Also update performance metrics
		await tx.insert(performanceMetrics).values({
			versionId,
			qualityScore,
			clarity: judgeResponse.clarity,
			completeness: judgeResponse.completeness,
			specificity: judgeResponse.specificity
		});

		return evaluation.id;
	});
}
