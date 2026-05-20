/**
 * Event subscriber registration — called once at app startup.
 */

import { registerAuditSubscribers } from './subscribers/audit-subscriber';
import { registerExecutionSubscribers } from './subscribers/execution-subscriber';

let initialized = false;

/**
 * Register all event subscribers.
 * Safe to call multiple times — only registers once.
 */
export function initEventSubscribers(): void {
	if (initialized) return;
	initialized = true;

	registerAuditSubscribers();
	registerExecutionSubscribers();

	console.log('[Events] Subscribers registered');
}
