/**
 * Council Correct Service
 *
 * Orchestrates the producer → reviewer → fixer workflow with streaming.
 * Each step uses a specific function type from settings cascade:
 * - Producer: 'executor' defaults
 * - Reviewer: 'judge' defaults
 * - Fixer: 'improve' defaults
 */
import { db } from '../db/client';
import { councilRuns } from '../db/schema';
import { streamPromptExecution, type StreamingEvent } from './streaming.service';
import type { FunctionType } from './function-defaults.service';
import { eq } from 'drizzle-orm';

/**
 * Council workflow states
 */
export type CouncilState = 'idle' | 'producing' | 'reviewing' | 'fixing' | 'complete' | 'error';

/**
 * Council step types
 */
export type CouncilStep = 'producer' | 'reviewer' | 'fixer';

/**
 * Result of a single council step
 */
export interface CouncilStepResult {
	step: CouncilStep;
	round: number;
	input: string;
	output: string;
	issues?: string[]; // For reviewer step only
	model: {
		providerId: string;
		modelId: string;
		displayName: string;
	};
	usage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	duration: {
		ms: number;
		seconds: number;
	};
	executedAt: Date;
}

/**
 * Event types emitted during council execution
 */
export type CouncilEventType =
	| 'step_start'
	| 'step_delta'
	| 'step_complete'
	| 'round_complete'
	| 'council_complete'
	| 'error';

/**
 * Event emitted during council execution
 */
export interface CouncilEvent {
	type: CouncilEventType;
	step?: CouncilStep;
	round: number;
	data: unknown;
}

/**
 * Council run record (matches database schema + parsed steps)
 */
export interface CouncilRun {
	id: number;
	promptId: number;
	inputContent: string;
	currentRound: number;
	maxRounds: number;
	state: CouncilState;
	steps: CouncilStepResult[];
	finalOutput?: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Parsed reviewer output
 */
interface ReviewerResult {
	status: 'pass' | 'fail';
	issues: string[];
}

/**
 * Maximum number of rounds (always 3)
 */
const MAX_ROUNDS = 3;

/**
 * Map council step to function type for settings cascade
 */
function getFunctionTypeForStep(step: CouncilStep): FunctionType {
	switch (step) {
		case 'producer':
			return 'executor';
		case 'reviewer':
			return 'judge';
		case 'fixer':
			return 'improve';
	}
}

/**
 * Build prompt for reviewer step
 * Instructs the AI to evaluate output and return structured JSON
 */
function buildReviewerPrompt(producerOutput: string): string {
	return `You are a reviewer evaluating the following output for quality issues.

Output to review:
${producerOutput}

Evaluate the output and respond with a JSON object in this exact format:
{
  "status": "pass" | "fail",
  "issues": ["issue 1", "issue 2"]
}

Rules:
- If the output is acceptable, set status to "pass" with empty issues array
- If there are quality issues, set status to "fail" and list specific issues
- Be specific and actionable with issues
- Respond ONLY with valid JSON, no other text`;
}

/**
 * Build prompt for fixer step
 * Instructs the AI to fix specific issues in the output
 */
function buildFixerPrompt(producerOutput: string, issues: string[]): string {
	const issuesList = issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n');

	return `You are a fixer improving output based on identified issues.

Original output:
${producerOutput}

Issues to fix:
${issuesList}

Instructions:
- Fix ALL the identified issues in the output
- Maintain the overall structure and intent of the original
- Do not introduce new issues
- Return the complete fixed output with no additional commentary`;
}

/**
 * Parse reviewer output to extract pass/fail status and issues
 * Uses multiple strategies to handle LLM output variations
 */
function parseReviewerOutput(content: string): ReviewerResult {
	// Default to pass if we can't parse
	const defaultResult: ReviewerResult = { status: 'pass', issues: [] };

	try {
		// Try to find JSON object in the content
		const jsonMatch = content.match(/\{[\s\S]*"status"[\s\S]*\}/);
		if (!jsonMatch) {
			console.warn('[CouncilCorrect] No JSON found in reviewer output, defaulting to pass');
			return defaultResult;
		}

		const parsed = JSON.parse(jsonMatch[0]);

		// Validate structure
		if (typeof parsed.status !== 'string') {
			console.warn('[CouncilCorrect] Invalid status in reviewer output');
			return defaultResult;
		}

		const status = parsed.status === 'fail' ? 'fail' : 'pass';
		const issues = Array.isArray(parsed.issues)
			? parsed.issues.filter((issue: unknown) => typeof issue === 'string')
			: [];

		return { status, issues };
	} catch (error) {
		console.warn('[CouncilCorrect] Failed to parse reviewer output:', error);
		return defaultResult;
	}
}

/**
 * Execute a single council step with streaming
 * Aggregates deltas into complete output for next step
 */
async function* executeStep(
	promptId: number,
	step: CouncilStep,
	content: string,
	round: number
): AsyncGenerator<CouncilEvent, CouncilStepResult | null, unknown> {
	const startTime = Date.now();

	// Yield step start event
	yield {
		type: 'step_start',
		step,
		round,
		data: { input: content }
	};

	let accumulatedOutput = '';
	let stepResult: CouncilStepResult | null = null;

	try {
		// Create streaming generator for this step
		const generator = streamPromptExecution({
			promptId,
			content,
			functionType: getFunctionTypeForStep(step)
		});

		// Iterate over streaming events
		let result = await generator.next();
		while (!result.done) {
			const event = result.value;

			// Handle delta events - yield as step_delta
			if (event.type === 'delta') {
				accumulatedOutput = event.accumulated;
				yield {
					type: 'step_delta',
					step,
					round,
					data: { delta: event.delta, accumulated: accumulatedOutput }
				};
			}

			// Handle complete events - capture result
			if (event.type === 'complete') {
				const endTime = Date.now();
				const durationMs = endTime - startTime;

				stepResult = {
					step,
					round,
					input: content,
					output: event.content,
					model: event.model,
					usage: event.usage,
					duration: {
						ms: durationMs,
						seconds: Math.round(durationMs / 100) / 10
					},
					executedAt: new Date()
				};
			}

			// Handle error events
			if (event.type === 'error') {
				yield {
					type: 'error',
					step,
					round,
					data: { message: event.message, code: event.code }
				};
				return null;
			}

			result = await generator.next();
		}
	} catch (error) {
		yield {
			type: 'error',
			step,
			round,
			data: {
				message: error instanceof Error ? error.message : 'Step execution failed',
				code: 'STEP_ERROR'
			}
		};
		return null;
	}

	// Yield step complete event
	if (stepResult) {
		yield {
			type: 'step_complete',
			step,
			round,
			data: stepResult
		};
	}

	return stepResult;
}

/**
 * Create a new council run record in the database
 */
async function createCouncilRun(promptId: number, inputContent: string): Promise<number> {
	const result = await db
		.insert(councilRuns)
		.values({
			promptId,
			inputContent,
			currentRound: 1,
			maxRounds: MAX_ROUNDS,
			state: 'idle',
			steps: '[]', // Empty JSON array
			finalOutput: null
		})
		.returning({ id: councilRuns.id });

	return result[0].id;
}

/**
 * Update council run state in database
 */
async function updateCouncilRun(
	runId: number,
	updates: {
		state?: CouncilState;
		currentRound?: number;
		steps?: CouncilStepResult[];
		finalOutput?: string;
	}
): Promise<void> {
	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
		...updates
	};

	// Serialize steps to JSON if provided
	if (updates.steps !== undefined) {
		updateData.steps = JSON.stringify(updates.steps);
	}

	await db.update(councilRuns).set(updateData).where(eq(councilRuns.id, runId));
}

/**
 * Execute the council correct workflow with streaming
 *
 * This async generator:
 * 1. Creates a council run record in the database
 * 2. Loops while currentRound <= MAX_ROUNDS (3)
 * 3. Executes producer → reviewer → (fixer if needed) steps
 * 4. Yields events for each step and round
 * 5. Persists state to database after each step
 * 6. Returns final CouncilRun on completion
 *
 * @param options - promptId and initial content
 * @yields CouncilEvent - step_start, step_delta, step_complete, round_complete, council_complete, or error
 * @returns CouncilRun - final state of the council run
 */
export async function* executeCouncilCorrect(options: {
	promptId: number;
	content: string;
}): AsyncGenerator<CouncilEvent, CouncilRun, unknown> {
	const { promptId, content } = options;

	// Create council run record
	let runId: number;
	try {
		runId = await createCouncilRun(promptId, content);
		console.log('[CouncilCorrect] Created council run:', runId);
	} catch (error) {
		yield {
			type: 'error',
			round: 0,
			data: {
				message: error instanceof Error ? error.message : 'Failed to create council run',
				code: 'CREATE_RUN_ERROR'
			}
		};
		throw error;
	}

	let currentRound = 1;
	let currentContent = content;
	const allSteps: CouncilStepResult[] = [];
	let finalOutput: string | undefined;

	// Main workflow loop
	while (currentRound <= MAX_ROUNDS) {
		// Update state to producing
		await updateCouncilRun(runId, { state: 'producing', currentRound });

		// === PRODUCER STEP ===
		const producerGenerator = executeStep(promptId, 'producer', currentContent, currentRound);
		let producerResult = await producerGenerator.next();
		let producerStepResult: CouncilStepResult | null = null;

		while (!producerResult.done) {
			yield producerResult.value;
			producerResult = await producerGenerator.next();
		}

		producerStepResult = producerResult.value;
		if (!producerStepResult) {
			// Error occurred in producer
			await updateCouncilRun(runId, { state: 'error', steps: allSteps });
			throw new Error('Producer step failed');
		}

		allSteps.push(producerStepResult);
		await updateCouncilRun(runId, { steps: allSteps });

		// === REVIEWER STEP ===
		await updateCouncilRun(runId, { state: 'reviewing' });
		const reviewerPrompt = buildReviewerPrompt(producerStepResult.output);

		const reviewerGenerator = executeStep(promptId, 'reviewer', reviewerPrompt, currentRound);
		let reviewerResult = await reviewerGenerator.next();
		let reviewerStepResult: CouncilStepResult | null = null;

		while (!reviewerResult.done) {
			yield reviewerResult.value;
			reviewerResult = await reviewerGenerator.next();
		}

		reviewerStepResult = reviewerResult.value;
		if (!reviewerStepResult) {
			// Error occurred in reviewer
			await updateCouncilRun(runId, { state: 'error', steps: allSteps });
			throw new Error('Reviewer step failed');
		}

		// Parse reviewer output
		const review = parseReviewerOutput(reviewerStepResult.output);
		reviewerStepResult.issues = review.issues;
		allSteps.push(reviewerStepResult);
		await updateCouncilRun(runId, { steps: allSteps });

		// Check if passed or max rounds reached
		if (review.status === 'pass') {
			// Council complete - output approved
			finalOutput = producerStepResult.output;
			await updateCouncilRun(runId, { state: 'complete', finalOutput, steps: allSteps });

			yield {
				type: 'council_complete',
				round: currentRound,
				data: {
					finalOutput,
					reason: 'Reviewer approved output',
					totalSteps: allSteps.length
				}
			};
			break;
		}

		if (currentRound >= MAX_ROUNDS) {
			// Max rounds reached - return best effort
			finalOutput = producerStepResult.output;
			await updateCouncilRun(runId, { state: 'complete', finalOutput, steps: allSteps });

			yield {
				type: 'council_complete',
				round: currentRound,
				data: {
					finalOutput,
					reason: 'Max rounds reached',
					remainingIssues: review.issues,
					totalSteps: allSteps.length
				}
			};
			break;
		}

		// === FIXER STEP ===
		await updateCouncilRun(runId, { state: 'fixing' });
		const fixerPrompt = buildFixerPrompt(producerStepResult.output, review.issues);

		const fixerGenerator = executeStep(promptId, 'fixer', fixerPrompt, currentRound);
		let fixerResult = await fixerGenerator.next();
		let fixerStepResult: CouncilStepResult | null = null;

		while (!fixerResult.done) {
			yield fixerResult.value;
			fixerResult = await fixerGenerator.next();
		}

		fixerStepResult = fixerResult.value;
		if (!fixerStepResult) {
			// Error occurred in fixer
			await updateCouncilRun(runId, { state: 'error', steps: allSteps });
			throw new Error('Fixer step failed');
		}

		allSteps.push(fixerStepResult);
		await updateCouncilRun(runId, { steps: allSteps });

		// Yield round complete event
		yield {
			type: 'round_complete',
			round: currentRound,
			data: {
				round: currentRound,
				issuesFound: review.issues.length,
				fixerOutput: fixerStepResult.output
			}
		};

		// Prepare for next round
		currentContent = fixerStepResult.output;
		currentRound++;
	}

	// Fetch and return final council run state
	const runRecord = await db.select().from(councilRuns).where(eq(councilRuns.id, runId)).limit(1);

	if (runRecord.length === 0) {
		throw new Error('Council run record not found');
	}

	const dbRun = runRecord[0];

	// Parse steps from JSON
	let parsedSteps: CouncilStepResult[] = [];
	try {
		parsedSteps = dbRun.steps ? JSON.parse(dbRun.steps) : [];
	} catch {
		console.warn('[CouncilCorrect] Failed to parse steps JSON');
	}

	const finalRun: CouncilRun = {
		id: dbRun.id,
		promptId: dbRun.promptId,
		inputContent: dbRun.inputContent,
		currentRound: dbRun.currentRound,
		maxRounds: dbRun.maxRounds,
		state: dbRun.state as CouncilState,
		steps: parsedSteps,
		finalOutput: dbRun.finalOutput ?? undefined,
		createdAt: dbRun.createdAt,
		updatedAt: dbRun.updatedAt
	};

	return finalRun;
}

/**
 * Get a council run by ID
 */
export async function getCouncilRun(runId: number): Promise<CouncilRun | null> {
	const result = await db.select().from(councilRuns).where(eq(councilRuns.id, runId)).limit(1);

	if (result.length === 0) {
		return null;
	}

	const dbRun = result[0];

	// Parse steps from JSON
	let parsedSteps: CouncilStepResult[] = [];
	try {
		parsedSteps = dbRun.steps ? JSON.parse(dbRun.steps) : [];
	} catch {
		console.warn('[CouncilCorrect] Failed to parse steps JSON for run', runId);
	}

	return {
		id: dbRun.id,
		promptId: dbRun.promptId,
		inputContent: dbRun.inputContent,
		currentRound: dbRun.currentRound,
		maxRounds: dbRun.maxRounds,
		state: dbRun.state as CouncilState,
		steps: parsedSteps,
		finalOutput: dbRun.finalOutput ?? undefined,
		createdAt: dbRun.createdAt,
		updatedAt: dbRun.updatedAt
	};
}
