/**
 * Execution subscriber — listens to execution events and persists them.
 *
 * Replaces direct logExecution calls in route handlers.
 */

import { eventBus } from '../event-bus';
import { logExecution, type CreateLogEntry } from '../../services/execution-log.service';

export function registerExecutionSubscribers(): void {
	eventBus.on('execution:completed', (data) => {
		const entry: CreateLogEntry = {
			promptId: data.promptId,
			versionId: data.versionId,
			inputContent: data.inputContent,
			result: data.result as CreateLogEntry['result'],
			error: data.error,
			functionType: data.functionType
		};
		// logExecution is fire-and-forget by design
		logExecution(entry);
	});
}
