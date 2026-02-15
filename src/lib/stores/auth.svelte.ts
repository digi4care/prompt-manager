import { writable, get } from 'svelte/store';

// JWT token store - uses HTTP cookies only, NO localStorage
function createAuthStore() {
	const { subscribe, set, update } = writable<{
		token: string | null;
		user: { userId: string; email: string; role: string } | null;
		isAuthenticated: boolean;
	}>({
		token: null,
		user: null,
		isAuthenticated: false
	});

	return {
		subscribe,

		// No init() needed - cookies are managed by server

		// Login with JWT token (token is already in cookie, just update store)
		login(token: string, user: { userId: string; email: string; role: string }) {
			set({ token, user, isAuthenticated: true });
		},

		// Logout and clear store (cookies are cleared by server)
		logout() {
			set({ token: null, user: null, isAuthenticated: false });
		},

		// Get auth header for API requests
		getAuthHeader(): { Authorization: string } | {} {
			const state = get(this);
			return state.token ? { Authorization: `Bearer ${state.token}` } : {};
		},

		// Get current state (for testing)
		getState() {
			return get(this);
		}
	};
}

export const authStore = createAuthStore();
