/**
 * Typed EventBus — compile-time checked pub/sub for cross-cutting concerns.
 *
 * Usage:
 *   import { eventBus } from '$lib/server/events';
 *   eventBus.emit('security:event', { event: 'LOGIN_FAILED', metadata: {...} });
 *
 * Subscribers:
 *   eventBus.on('security:event', (data) => { ... });
 */

import type { AppEventMap } from './event-types';

type EventHandler<T> = (data: T) => void | Promise<void>;
type EventKey = keyof AppEventMap;

/**
 * Typed event bus with compile-time event name and payload checking.
 */
export class EventBus {
	private handlers = new Map<EventKey, Set<EventHandler<unknown>>>();

	/**
	 * Subscribe to an event.
	 * Returns an unsubscribe function.
	 */
	on<K extends EventKey>(event: K, handler: EventHandler<AppEventMap[K]>): () => void {
		let set = this.handlers.get(event);
		if (!set) {
			set = new Set();
			this.handlers.set(event, set);
		}
		set.add(handler as EventHandler<unknown>);

		return () => {
			set!.delete(handler as EventHandler<unknown>);
			if (set!.size === 0) {
				this.handlers.delete(event);
			}
		};
	}

	/**
	 * Emit an event to all subscribers.
	 * Handlers run concurrently; errors are logged, not thrown.
	 */
	emit<K extends EventKey>(event: K, data: AppEventMap[K]): void {
		const set = this.handlers.get(event);
		if (!set) return;

		for (const handler of set) {
			try {
				const result = handler(data);
				// Handle async handlers — catch rejection
				if (result instanceof Promise) {
					result.catch((err: unknown) => {
						console.error(
							`[EventBus] Async handler error for "${String(event)}":`,
							err
						);
					});
				}
			} catch (err) {
				console.error(`[EventBus] Handler error for "${String(event)}":`, err);
			}
		}
	}

	/**
	 * Remove all handlers for a specific event (or all events).
	 */
	clear(event?: EventKey): void {
		if (event) {
			this.handlers.delete(event);
		} else {
			this.handlers.clear();
		}
	}
}

/**
 * Singleton event bus for the application.
 * Import this everywhere — services emit, subscribers listen.
 */
export const eventBus = new EventBus();
