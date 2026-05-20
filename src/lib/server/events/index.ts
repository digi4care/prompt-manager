/**
 * Events module — typed event bus for cross-cutting concerns.
 *
 * Initialization:
 *   Call initEventSubscribers() once at app startup (e.g., in hooks.server.ts).
 *   This registers all subscribers so events flow to the right handlers.
 *
 * Usage (in services/routes):
 *   import { eventBus } from '$lib/server/events';
 *   eventBus.emit('security:event', { event: 'LOGIN_FAILED', metadata: {...} });
 */

export { eventBus, EventBus } from './event-bus';
export type {
	AppEventMap,
	SecurityEventData,
	ExecutionEventData,
	DataChangeEventData
} from './event-types';
export { initEventSubscribers } from './init';
