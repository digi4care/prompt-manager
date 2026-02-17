/**
 * Providers Store - Reactive state for OpenCode providers
 *
 * Usage:
 *   import { providers } from '$lib/stores/providers.svelte';
 *   providers.connect(providerId, apiKey);
 *   providers.disconnect(providerId);
 *   console.log(providers.connected); // reactive array
 */

export interface Provider {
	id: string;
	name: string;
	models?: Array<{ id: string; name: string }>;
}

class ProvidersStore {
	/** All available providers */
	all = $state<Provider[]>([]);

	/** Connected provider IDs */
	connectedIds = $state<string[]>([]);

	/** Derived: Connected providers */
	get connected(): Provider[] {
		return this.all.filter((p) => this.connectedIds.includes(p.id));
	}

	/** Derived: Available (not connected) providers */
	get available(): Provider[] {
		return this.all.filter((p) => !this.connectedIds.includes(p.id));
	}

	/** Derived: Is any provider connected? */
	get isConnected(): boolean {
		return this.connectedIds.length > 0;
	}

	/** Initialize store with data */
	init(data: { all: Provider[]; connected: string[] }) {
		this.all = data.all;
		this.connectedIds = data.connected;
	}

	/** Set connected IDs after API call */
	setConnected(connected: string[]) {
		this.connectedIds = connected;
	}

	/** Add provider to connected list */
	addConnected(providerId: string) {
		if (!this.connectedIds.includes(providerId)) {
			this.connectedIds = [...this.connectedIds, providerId];
		}
	}

	/** Remove provider from connected list */
	removeConnected(providerId: string) {
		this.connectedIds = this.connectedIds.filter((id) => id !== providerId);
	}

	/** Clear all state */
	reset() {
		this.all = [];
		this.connectedIds = [];
	}
}

export const providers = new ProvidersStore();
