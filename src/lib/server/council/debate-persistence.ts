/**
 * Debate run database persistence.
 *
 * Handles creating and updating debate run records in the councilRuns table.
 */

import { db } from '../db/client';
import { councilRuns } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { DebateState, DebateRoundResult } from './debate-types';

/**
 * Create a new debate run record in the database.
 */
export async function createDebateRun(promptId: number, topicContent: string): Promise<number> {
	const result = await db
		.insert(councilRuns)
		.values({
			promptId,
			inputContent: topicContent,
			currentRound: 1,
			maxRounds: 3,
			state: 'idle',
			steps: '[]', // Empty JSON array (stores rounds)
			finalOutput: null
		})
		.returning({ id: councilRuns.id });

	return result[0].id;
}

/**
 * Update debate run state in database.
 */
export async function updateDebateRun(
	runId: number,
	updates: {
		state?: DebateState;
		currentRound?: number;
		steps?: DebateRoundResult[];
		finalOutput?: string;
	}
): Promise<void> {
	const updateData: Record<string, unknown> = {
		updatedAt: new Date(),
		...updates
	};

	// Serialize rounds to JSON in steps column
	if (updates.steps !== undefined) {
		updateData.steps = JSON.stringify(updates.steps);
	}

	await db.update(councilRuns).set(updateData).where(eq(councilRuns.id, runId));
}
