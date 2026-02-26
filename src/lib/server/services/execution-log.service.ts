/**
 * Execution Log Service
 *
 * Provides async logging for prompt executions without blocking responses.
 * Uses fire-and-forget pattern for writes and paginated retrieval for history.
 */
import { db } from '$lib/server/db/client';
import { executionLogs, type ExecutionLog, type NewExecutionLog } from '$lib/server/db/schema';
import { eq, desc, count, and } from 'drizzle-orm';
import type { ExecutionResult } from './execution.service';

/**
 * Input for creating a log entry
 */
export interface CreateLogEntry {
	promptId: number;
	versionId?: number;
	inputContent: string;
	result: ExecutionResult | null;
	error?: { code: string; message: string };
	functionType?: 'executor' | 'judge' | 'improve' | 'council';
}

/**
 * Paginated history result
 */
export interface ExecutionHistoryResult {
	logs: ExecutionLog[];
	totalCount: number;
}

/**
 * Log execution result asynchronously (fire-and-forget)
 * Does NOT block execution response - errors are logged, not thrown
 */
export function logExecution(entry: CreateLogEntry): void {
	// Don't await - let it complete in background
	logExecutionAsync(entry).catch((err) => {
		console.error('[ExecutionLog] Failed to log execution:', err);
	});
}

/**
 * Internal async implementation for logging
 */
async function logExecutionAsync(entry: CreateLogEntry): Promise<void> {
	// Normalize model ID to providerId/modelId format
	let modelId = 'unknown';
	if (entry.result?.model) {
		modelId = `${entry.result.model.providerId}/${entry.result.model.modelId}`;
	}

	const logData: NewExecutionLog = {
		promptId: entry.promptId,
		versionId: entry.versionId ?? null,
		inputContent: entry.inputContent,
		outputContent: entry.result?.content ?? null,
		modelId,
		modelSource: entry.result?.source ?? 'default',
		inputTokens: entry.result?.usage.inputTokens ?? 0,
		outputTokens: entry.result?.usage.outputTokens ?? 0,
		totalTokens: entry.result?.usage.totalTokens ?? 0,
		durationMs: entry.result?.duration.ms ?? 0,
		status: entry.error ? 'error' : 'success',
		errorCode: entry.error?.code ?? null,
		errorMessage: entry.error?.message ?? null,
		functionType: entry.functionType ?? 'executor'
	};

	await db.insert(executionLogs).values(logData);
}

/**
 * Get execution history for a prompt (paginated)
 */
export async function getExecutionHistory(
	promptId: number,
	limit = 50,
	offset = 0
): Promise<ExecutionHistoryResult> {
	const logs = await db
		.select()
		.from(executionLogs)
		.where(eq(executionLogs.promptId, promptId))
		.orderBy(desc(executionLogs.createdAt))
		.limit(limit)
		.offset(offset);

	const [countResult] = await db
		.select({ count: count() })
		.from(executionLogs)
		.where(eq(executionLogs.promptId, promptId));

	return { logs, totalCount: countResult?.count ?? 0 };
}

/**
 * Get a single execution log by ID
 */
export async function getExecutionLog(
	promptId: number,
	logId: number
): Promise<ExecutionLog | null> {
	const [log] = await db
		.select()
		.from(executionLogs)
		.where(and(eq(executionLogs.id, logId), eq(executionLogs.promptId, promptId)))
		.limit(1);

	return log ?? null;
}
