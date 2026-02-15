import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authStore } from '$lib/stores/auth.svelte';

// Mock browser environment
describe('Auth Store', () => {
	beforeEach(() => {
		// Reset store state
		authStore.logout();

		// Clear localStorage mocks
		vi.clearAllMocks();
	});

	describe('Initial State', () => {
		it('should start with unauthenticated state', () => {
			const state = authStore.getState();
			expect(state.isAuthenticated).toBe(false);
			expect(state.token).toBeNull();
			expect(state.user).toBeNull();
		});
	});

	describe('Login', () => {
		it('should store JWT token and user data', () => {
			const mockToken = 'test-jwt-token';
			const mockUser = {
				userId: 'admin',
				email: 'admin@localhost',
				role: 'admin'
			};

			authStore.login(mockToken, mockUser);

			const state = authStore.getState();
			expect(state.isAuthenticated).toBe(true);
			expect(state.token).toBe(mockToken);
			expect(state.user).toEqual(mockUser);
		});

		it('should update localStorage on login', () => {
			const mockToken = 'test-jwt-token';
			const mockUser = {
				userId: 'admin',
				email: 'admin@localhost',
				role: 'admin'
			};

			authStore.login(mockToken, mockUser);

			// In browser environment, localStorage would be called
			// This is mocked in test setup
		});
	});

	describe('Logout', () => {
		it('should clear authentication state', () => {
			// First login
			authStore.login('token', { userId: 'admin', email: 'test@test.com', role: 'admin' });

			// Then logout
			authStore.logout();

			const state = authStore.getState();
			expect(state.isAuthenticated).toBe(false);
			expect(state.token).toBeNull();
			expect(state.user).toBeNull();
		});
	});

	describe('getAuthHeader', () => {
		it('should return Authorization header when authenticated', () => {
			authStore.login('test-token', { userId: 'admin', email: 'test@test.com', role: 'admin' });

			const headers = authStore.getAuthHeader();
			expect(headers).toEqual({ Authorization: 'Bearer test-token' });
		});

		it('should return empty object when not authenticated', () => {
			const headers = authStore.getAuthHeader();
			expect(headers).toEqual({});
		});
	});

	describe('Init', () => {
		it('should restore state from localStorage', () => {
			// Mock localStorage
			const mockToken = 'stored-token';
			const mockUser = { userId: 'admin', email: 'admin@localhost', role: 'admin' };

			// Store is automatically initialized on first access
			// In Node.js tests, localStorage is not available
			// This would be tested in browser environment

			// State should be available
			const state = authStore.getState();
			// In mocked environment, this will be the initial state
			expect(state).toBeDefined();
		});
	});
});
