/**
 * Typed event definitions for the cross-cutting event bus.
 *
 * Each event maps to a specific concern (audit, security, execution).
 * New events = new entries here; new subscribers = new files.
 */

/**
 * Security event data — emitted when security-relevant actions occur.
 */
export interface SecurityEventData {
	event: string;
	metadata: Record<string, unknown>;
}

/**
 * Execution event data — emitted when a prompt execution completes.
 * Matches CreateLogEntry shape for direct forwarding to logExecution.
 */
export interface ExecutionEventData {
	promptId: number;
	versionId?: number;
	inputContent: string;
	result: unknown; // ExecutionResult | null — avoids circular import
	error?: { code: string; message: string };
	functionType?: 'executor' | 'judge' | 'improve' | 'council';
}

/**
 * Data change event data — emitted when data is created/updated/deleted.
 */
export interface DataChangeEventData {
	action: 'create' | 'update' | 'delete';
	resource: string;
	resourceId: string | number;
	changes: Record<string, { old?: unknown; new?: unknown }>;
	userId?: string;
}

/**
 * Event map — the single source of truth for all events.
 * Keys are event names, values are their typed payloads.
 *
 * Adding a new event:
 * 1. Define the data interface above
 * 2. Add the mapping here
 * 3. Emit from the relevant service
 * 4. Create a subscriber file to handle it
 */
export interface AppEventMap {
	'security:event': SecurityEventData;
	'execution:completed': ExecutionEventData;
	'data:change': DataChangeEventData;
}
