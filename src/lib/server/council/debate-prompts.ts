/**
 * Debate prompt building and synthesis parsing.
 *
 * Handles:
 * - Archetype system prompts (locked per user decision)
 * - Context building for rounds (cumulative)
 * - Synthesis prompt generation
 * - Synthesis JSON parsing
 */

import type {
	DebateArchetype,
	DebateRoundResult,
	DebateSynthesis
} from './debate-types';

/**
 * Default archetype system prompts (LOCKED per user decision)
 */
export const ARCHETYPE_PROMPTS: Record<DebateArchetype, string> = {
	proponent: `You are the Proponent in a structured debate. Your role is to argue IN FAVOR of the topic.

Guidelines:
- Present strong arguments supporting the proposal
- Highlight benefits, opportunities, and positive outcomes
- Use evidence and logical reasoning
- Acknowledge counterarguments but explain why your position is stronger
- Be persuasive but intellectually honest

Format your arguments clearly with supporting points.`,

	skeptic: `You are the Skeptic in a structured debate. Your role is to argue AGAINST the topic.

Guidelines:
- Challenge assumptions and premises
- Surface risks, drawbacks, and potential negative outcomes
- Play devil's advocate to ensure all concerns are considered
- Use evidence and logical reasoning
- Be critical but fair - acknowledge valid points from the other side

Format your arguments clearly with specific concerns.`,

	pragmatist: `You are the Pragmatist in a structured debate. Your role is to balance both perspectives.

Guidelines:
- Evaluate both pros and cons objectively
- Focus on practical feasibility and real-world constraints
- Identify tradeoffs and conditions for success
- Seek middle ground where possible
- Consider implementation challenges and mitigation strategies

Format your arguments with balanced analysis.`
};

/**
 * Build debate context for a specific round.
 * Includes topic and all previous round arguments.
 */
export function buildDebateContextForRound(
	topic: string,
	previousRounds: DebateRoundResult[],
	currentRound: number
): string {
	let context = `## Debate Topic

${topic}

`;

	if (previousRounds.length > 0) {
		context += `## Previous Rounds

`;
		for (const round of previousRounds) {
			context += `### Round ${round.round}

`;
			for (const result of round.agentResults) {
				context += `**${result.agentName} (${result.archetype}):**

${result.output}

`;
			}
		}
		context += `---

## Round ${currentRound}

This is Round ${currentRound} of 3. Consider the arguments above and strengthen your position.
`;
	} else {
		context += `## Round ${currentRound}

This is Round 1 of 3. Present your opening arguments.
`;
	}

	return context;
}

/**
 * Build synthesizer prompt with all debate history.
 */
export function buildSynthesisPrompt(topic: string, rounds: DebateRoundResult[]): string {
	let prompt = `You are a neutral synthesizer analyzing a structured debate. Your role is to produce an objective synthesis.

## Debate Topic

${topic}

## Debate History

`;

	for (const round of rounds) {
		prompt += `### Round ${round.round}

`;
		for (const result of round.agentResults) {
			prompt += `**${result.agentName} (${result.archetype}):**

${result.output}

`;
		}
	}

	prompt += `---

## Synthesis Instructions

Analyze the debate above and produce a JSON synthesis in this EXACT format:

{
  "summary": "A 2-3 sentence overview of the debate",
  "keyArgumentsFor": ["argument 1", "argument 2", "argument 3"],
  "keyArgumentsAgainst": ["argument 1", "argument 2", "argument 3"],
  "pointsOfAgreement": ["point 1", "point 2"],
  "finalRecommendation": "A clear, actionable recommendation",
  "consensusLevel": "Strong consensus" | "Moderate consensus" | "Mixed views"
}

Rules:
- Provide exactly 3 key arguments for and 3 against (or fewer if not enough distinct points)
- Identify genuine points where all perspectives agreed
- The final recommendation should be practical and balanced
- Set consensusLevel based on how much agreement existed across perspectives
- Respond ONLY with valid JSON, no other text`;

	return prompt;
}

/**
 * Parse synthesis JSON from LLM output.
 * Uses multiple strategies to handle output variations.
 */
export function parseSynthesisJson(content: string): DebateSynthesis | null {
	// Default synthesis if parsing fails
	const defaultSynthesis: DebateSynthesis = {
		summary: 'Unable to parse structured synthesis from debate.',
		keyArgumentsFor: [],
		keyArgumentsAgainst: [],
		pointsOfAgreement: [],
		finalRecommendation: 'Review the debate history for insights.',
		consensusLevel: 'Mixed views'
	};

	try {
		// Try to find JSON object in the content
		const jsonMatch = content.match(/\{[\s\S]*"summary"[\s\S]*"consensusLevel"[\s\S]*\}/);
		if (!jsonMatch) {
			console.warn('[CouncilDebate] No JSON found in synthesis output');
			return defaultSynthesis;
		}

		const parsed = JSON.parse(jsonMatch[0]);

		// Validate required fields
		if (typeof parsed.summary !== 'string') {
			console.warn('[CouncilDebate] Invalid summary in synthesis output');
			return defaultSynthesis;
		}

		return {
			summary: parsed.summary || defaultSynthesis.summary,
			keyArgumentsFor: Array.isArray(parsed.keyArgumentsFor)
				? parsed.keyArgumentsFor.filter((a: unknown) => typeof a === 'string')
				: [],
			keyArgumentsAgainst: Array.isArray(parsed.keyArgumentsAgainst)
				? parsed.keyArgumentsAgainst.filter((a: unknown) => typeof a === 'string')
				: [],
			pointsOfAgreement: Array.isArray(parsed.pointsOfAgreement)
				? parsed.pointsOfAgreement.filter((p: unknown) => typeof p === 'string')
				: [],
			finalRecommendation: parsed.finalRecommendation || defaultSynthesis.finalRecommendation,
			consensusLevel: ['Strong consensus', 'Moderate consensus', 'Mixed views'].includes(
				parsed.consensusLevel
			)
				? parsed.consensusLevel
				: 'Mixed views'
		};
	} catch (error) {
		console.warn('[CouncilDebate] Failed to parse synthesis output:', error);
		return defaultSynthesis;
	}
}
