import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrompt } from '$lib/server/services/prompts.service';
import { getVersion, getLatestVersion, createVersion } from '$lib/server/services/versions.service';
import { evaluatePrompt, saveEvaluation } from '$lib/server/services/judge.service';
import {
	startImprovementLoop,
	generateVariants,
	generateVariantsWithModelSelection,
	completeImprovementLoop,
	failImprovementLoop,
	type ImproveOptions
} from '$lib/server/services/improvement.service';
import { z } from 'zod';

const improveRequestSchema = z.object({
	versionId: z.number().optional(),
	variantCount: z.number().min(1).max(5).default(3),
	autoSelect: z.boolean().default(false),
	// ara.5: Per-run instruction and model selection
	instruction: z.string().optional(),
	preset: z.union([z.string(), z.number()]).optional(),
	providerId: z.string().optional(),
	modelId: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().positive().optional()
});

export const POST: RequestHandler = async ({ params, request }) => {
	const promptId = parseInt(params.id);
	if (isNaN(promptId)) {
		throw error(400, JSON.stringify({ message: 'Invalid prompt ID', errors: null }));
	}

	let data: unknown;
	try {
		data = await request.json();
	} catch {
		data = {};
	}

	const parsed = improveRequestSchema.safeParse(data);
	if (!parsed.success) {
		throw error(
			400,
			JSON.stringify({ message: 'Validation failed', errors: parsed.error.flatten() })
		);
	}

	let loopId: number | null = null;

	try {
		const prompt = await getPrompt(promptId);
		if (!prompt) {
			throw error(404, JSON.stringify({ message: 'Prompt not found', errors: null }));
		}

		// Get base version
		let baseVersion;
		if (parsed.data.versionId) {
			baseVersion = await getVersion(parsed.data.versionId);
			if (!baseVersion || baseVersion.promptId !== promptId) {
				throw error(404, JSON.stringify({ message: 'Version not found', errors: null }));
			}
		} else {
			baseVersion = await getLatestVersion(promptId);
			if (!baseVersion) {
				throw error(400, JSON.stringify({ message: 'Prompt has no versions', errors: null }));
			}
		}

		// Build improvement options
		const improveOptions: ImproveOptions = {};
		if (parsed.data.instruction) {
			improveOptions.instruction = parsed.data.instruction;
		}
		if (parsed.data.preset) {
			improveOptions.preset = parsed.data.preset;
		}
		if (parsed.data.providerId) {
			improveOptions.providerId = parsed.data.providerId;
		}
		if (parsed.data.modelId) {
			improveOptions.modelId = parsed.data.modelId;
		}
		if (parsed.data.temperature !== undefined) {
			improveOptions.temperature = parsed.data.temperature;
		}
		if (parsed.data.maxTokens) {
			improveOptions.maxTokens = parsed.data.maxTokens;
		}

		// Start improvement loop with model parameters
		loopId = await startImprovementLoop(promptId, baseVersion.id, parsed.data.variantCount, {
			providerId: improveOptions.providerId,
			modelId: improveOptions.modelId,
			temperature: improveOptions.temperature,
			maxTokens: improveOptions.maxTokens
		});

		// Evaluate current prompt
		const baseResult = await evaluatePrompt(baseVersion);
		await saveEvaluation(
			baseVersion.id,
			baseResult.response,
			baseResult.rawText,
			baseResult.thinking
		);

		// Generate variants with model selection
		const improveResult = await generateVariantsWithModelSelection(
			baseVersion,
			baseResult.response,
			improveOptions,
			parsed.data.variantCount
		);

		// Create version records for each variant
		const variantVersions = await Promise.all(
			improveResult.variants.map((content, index) =>
				// TODO: Replace with authenticated user ID (Phase 1C)
				createVersion(
					promptId,
					content,
					'minor',
					`Improvement variant ${index + 1} from loop ${loopId}`,
					'system',
					{
						loopId,
						variantIndex: index,
						// Store model provenance in metadata
						model: improveResult.metadata.model,
						temperature: improveResult.metadata.temperature,
						preset: improveResult.metadata.preset,
						instruction: improveResult.metadata.instruction
					}
				)
			)
		);

		// Auto-select best if requested
		if (parsed.data.autoSelect) {
			const variantScores = await Promise.all(
				variantVersions.map(async (v) => {
					const response = await evaluatePrompt(v);
					return {
						versionId: v.id,
						score:
							(response.response.clarity +
								response.response.completeness +
								response.response.specificity) /
							3
					};
				})
			);

			const best = variantScores.reduce((a, b) => (a.score > b.score ? a : b));
			await completeImprovementLoop(
				loopId,
				best.versionId,
				`Auto-selected with score ${best.score.toFixed(1)}`
			);

			return json({
				data: {
					loopId,
					status: 'completed',
					evaluation: baseResult.response,
					thinking: baseResult.thinking,
					variants: variantVersions,
					selectedVariant: variantVersions.find((v) => v.id === best.versionId),
					// ara.5: Add metadata about model selection
					metadata: improveResult.metadata
				}
			});
		}

		return json({
			data: {
				loopId,
				status: 'pending_selection',
				evaluation: baseResult.response,
				thinking: baseResult.thinking,
				variants: variantVersions,
				// ara.5: Add metadata about model selection
				metadata: improveResult.metadata
			}
		});
	} catch (err: unknown) {
		if (loopId) {
			await failImprovementLoop(loopId, String(err));
		}
		const e = err as { status?: number };
		if (e.status) throw err;
		console.error('Improvement loop failed:', err);
		throw error(500, JSON.stringify({ message: 'Improvement loop failed', errors: null }));
	}
};
