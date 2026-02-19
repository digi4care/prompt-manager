import { browser } from '$app/environment';

interface User {
	id: string;
	email: string;
	name: string;
	role: string;
}

/**
 * Auth store using Svelte 5 runes with BroadcastChannel for real-time logout detection
 * across browser tabs without server polling
 */
class AuthState {
	// Runes state - reactive everywhere it's imported
	user = $state<User | null>(null);
	isLoading = $state(true);
	isAuthenticated = $derived(!!this.user);
	#channel: BroadcastChannel | null = null;

	constructor() {
		// Only run in browser
		if (browser) {
			this.setupBroadcastChannel();
			this.checkSession();
		}
	}

	/**
	 * Setup BroadcastChannel for cross-tab communication
	 */
	setupBroadcastChannel() {
		this.#channel = new BroadcastChannel('auth');
		this.#channel.onmessage = (event) => {
			if (event.data.type === 'logout') {
				this.handleLogout();
			} else if (event.data.type === 'login') {
				this.handleLogin(event.data.user);
			}
		};
	}

	/**
	 * Handle logout event from another tab
	 */
	handleLogout() {
		this.user = null;
		this.isLoading = false;
		// Redirect to login
		if (browser && window.location.pathname !== '/login') {
			window.location.href = '/login';
		}
	}

	/**
	 * Handle login event from another tab
	 */
	handleLogin(user: User) {
		this.user = user;
		this.isLoading = false;
	}

	/**
	 * Check session with server
	 */
	async checkSession() {
		if (!browser) return;

		this.isLoading = true;
		try {
			const res = await fetch('/api/admin/session');
			if (res.ok) {
				const data = await res.json();
				this.user = data.user || null;
			} else {
				this.user = null;
			}
		} catch {
			this.user = null;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Login - notify other tabs
	 */
	login(user: User) {
		this.user = user;
		this.#channel?.postMessage({ type: 'login', user });
	}

	/**
	 * Logout - notify other tabs
	 */
	logout() {
		this.user = null;
		this.#channel?.postMessage({ type: 'logout' });
	}
}

// Singleton instance - exported as module-level state
export const auth = new AuthState();
