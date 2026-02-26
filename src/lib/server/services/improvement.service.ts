import { db } from '../db/client';
import { improvementLoops, type PromptVersion } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { JudgeResponse } from './judge.service';
import {
	executeAgent,
	executeAgentWithSession,
	type ModelSelection
} from '$lib/server/services/opencode.service';
import { parseImproveAgentResponse } from '$lib/server/opencode/contracts';
import { getOpenCodePolicy, isModelAllowed, type OpenCodePolicy } from './admin-settings.service';
import { getPresetWithDefaults } from './improve-presets.service';

export type ImproveOptions = {
	instruction?: string;
	preset?: string | number;
	providerId?: string;
	modelId?: string;
	modelVariant?: string | null;
	temperature?: number;
	maxTokens?: number;
};

export type ImproveResult = {
	variants: string[];
	metadata: {
		model: {
			providerId: string;
			modelId: string;
		};
		variant?: string | null;
		temperature: number;
		preset?: {
			id: number;
			name: string;
		};
		instruction?: string;
	};
};

export async function startImprovementLoop(
	promptId: number,
	baseVersionId: number,
	variantCount = 3,
	modelParams?: {
		providerId?: string;
		modelId?: string;
		temperature?: number;
		maxTokens?: number;
	}
): Promise<number> {
	const [loop] = await db
		.insert(improvementLoops)
		.values({
			promptId,
			baseVersionId,
			status: 'running',
			variantCount,
			providerId: modelParams?.providerId || null,
			modelId: modelParams?.modelId || null,
			temperature: modelParams?.temperature || null,
			maxTokens: modelParams?.maxTokens || null
		})
		.returning();

	return loop.id;
}

/**
 * Generate variants using the original agent.execute method (backward compatibility)
 */
export async function generateVariants(
	baseVersion: PromptVersion,
	judgeResponse: JudgeResponse,
	count = 3
): Promise<string[]> {
	const res = await executeAgent('prompt-improve', {
		prompt: baseVersion.content,
		count,
		gaps: judgeResponse.gaps,
		recommendations: judgeResponse.recommendations
	});

	const payload = (res as any)?.data ?? res;
	const parsed = parseImproveAgentResponse(payload);
	return parsed.improvements.slice(0, count).map((v) => v.prompt);
}

/**
 * Generate variants with per-run instruction and model selection
 * This is the main entry point for ara.5 implementation
 */
export async function generateVariantsWithModelSelection(
	baseVersion: PromptVersion,
	judgeResponse: JudgeResponse,
	options: ImproveOptions,
	count = 3
): Promise<ImproveResult> {
	// Load policy
	const policy = await getOpenCodePolicy();

	// Resolve effective model and parameters
	const { modelSelection, modelVariant, temperature, presetInfo, effectiveInstruction } =
		await resolveImproveParameters(policy, options);

	// Build agent input
	const agentInput: any = {
		prompt: baseVersion.content,
		count,
		gaps: judgeResponse.gaps,
		recommendations: judgeResponse.recommendations
	};

	// Add instruction if provided
	if (effectiveInstruction) {
		agentInput.instruction = effectiveInstruction;
	}

	// Execute using session.prompt with model selection
	const res = await executeAgentWithSession({
		model: modelSelection,
		agent: 'prompt-improve',
		parts: [{ type: 'text', text: JSON.stringify(agentInput) }],
		temperature,
		maxTokens: options.maxTokens
	});

	const payload = (res as any)?.data ?? res;
	const parsed = parseImproveAgentResponse(payload);
	const variants = parsed.improvements.slice(0, count).map((v) => v.prompt);

	return {
		variants,
		metadata: {
			model: {
				providerId: modelSelection.providerID,
				modelId: modelSelection.modelID
			},
			variant: modelVariant,
			temperature,
			preset: presetInfo,
			instruction: effectiveInstruction
		}
	};
}

/**
 * Resolve effective model, temperature, and instruction based on policy, preset, and options
 */
async function resolveImproveParameters(
	policy: OpenCodePolicy,
	options: ImproveOptions
): Promise<{
	modelSelection: ModelSelection;
	modelVariant?: string | null;
	temperature: number;
	presetInfo?: { id: number; name: string };
	effectiveInstruction?: string;
}> {
	let effectiveInstruction = options.instruction;
	let effectiveTemperature = policy.improveTemperature;
	let effectiveModel = policy.improveDefaultModel;
	let effectiveVariant = options.modelVariant;
	let presetInfo: { id: number; name: string } | undefined;

	// Load preset if provided
	if (options.preset) {
		const preset = await getPresetWithDefaults(options.preset, policy);
		if (preset) {
			presetInfo = { id: preset.id, name: preset.name };

			// Use preset's instruction if not overridden by per-run instruction
			if (!effectiveInstruction && preset.instruction) {
				effectiveInstruction = preset.instruction;
			}

			// Use preset's effective model
			effectiveModel = preset.effectiveModel;
			effectiveTemperature = preset.effectiveTemperature;

			// Use preset's variant if available and not overridden
			if (!effectiveVariant && (preset as any).modelVariant) {
				effectiveVariant = (preset as any).modelVariant;
			}
		}
	}

	// Parse model ID into providerID and modelID
	const modelSelection = parseModelId(effectiveModel);

	// Validate model is allowed
	if (!isModelAllowed(`${modelSelection.providerID}/${modelSelection.modelID}`, policy)) {
		throw new Error(
			`Model "${effectiveModel}" is not in the allowed list. Please choose from the available models.`
		);
	}

	// Override with direct options if provided
	if (options.modelId) {
		const directModelSelection = parseModelId(options.modelId);
		// Validate direct model selection
		if (
			!isModelAllowed(`${directModelSelection.providerID}/${directModelSelection.modelID}`, policy)
		) {
			throw new Error(
				`Model "${options.modelId}" is not in the allowed list. Please choose from the available models.`
			);
		}
		modelSelection.providerID = directModelSelection.providerID;
		modelSelection.modelID = directModelSelection.modelID;
	}

	if (options.temperature !== undefined) {
		effectiveTemperature = options.temperature;
	}

	return {
		modelSelection,
		modelVariant: effectiveVariant,
		temperature: effectiveTemperature,
		presetInfo,
		effectiveInstruction
	};
}

/**
 * Parse model ID into providerID and modelID
 * Accepts formats: "provider/model" or just "model" (defaults to provider from policy)
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
	// This is a fallback; in production, we should always have provider/model
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

	// Default: assume modelId includes provider, split at first dot or dash
	const fallbackMatch = modelId.match(/^([^.|-]+)/);
	if (fallbackMatch) {
		return {
			providerID: fallbackMatch[1],
			modelID: modelId
		};
	}

	// Last resort: use whole modelId as modelID, provider as 'unknown'
	return {
		providerID: 'unknown',
		modelID: modelId
	};
}

export async function completeImprovementLoop(
	loopId: number,
	selectedVariantId: number,
	selectionReason: string
): Promise<void> {
	await db
		.update(improvementLoops)
		.set({
			status: 'completed',
			selectedVariantId,
			selectionReason,
			completedAt: new Date()
		})
		.where(eq(improvementLoops.id, loopId));
}

export async function failImprovementLoop(loopId: number, reason: string): Promise<void> {
	await db
		.update(improvementLoops)
		.set({
			status: 'failed',
			selectionReason: reason,
			completedAt: new Date()
		})
		.where(eq(improvementLoops.id, loopId));
}
