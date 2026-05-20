/**
 * Audit subscriber — listens to events and writes to the audit log.
 *
 * Replaces direct logSecurityEvent/logDataChange calls in service code.
 * Adding new audit concerns = new on() registration here.
 */

import { eventBus } from '../event-bus';
import { logSecurityEvent, logDataChange } from '../../audit';

export function registerAuditSubscribers(): void {
	eventBus.on('security:event', (data) => {
		logSecurityEvent(data.event, data.metadata).catch((err: unknown) => {
			console.error('[AuditSubscriber] Failed to log security event:', err);
		});
	});

	eventBus.on('data:change', (data) => {
		logDataChange(data.action, data.resource, data.resourceId, data.changes, data.userId).catch(
			(err: unknown) => {
				console.error('[AuditSubscriber] Failed to log data change:', err);
			}
		);
	});
}
