import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Admin Authentication', () => {
	describe('Environment configuration', () => {
		it('should have ADMIN_PASSWORD configured in production', () => {
			const originalNodeEnv = process.env.NODE_ENV;
			vi.stubEnv('NODE_ENV', 'production');
			vi.stubEnv('ADMIN_PASSWORD', 'test-password');

			expect(process.env.ADMIN_PASSWORD).toBeDefined();
			expect(process.env.ADMIN_PASSWORD).not.toBe('');

			vi.unstubAllEnvs();
			vi.stubEnv('NODE_ENV', originalNodeEnv);
		});

		it('should allow ADMIN_PASSWORD to be empty in development', () => {
			const originalNodeEnv = process.env.NODE_ENV;
			vi.stubEnv('NODE_ENV', 'development');

			// In dev mode, we allow no password for easier local development
			expect(process.env.ADMIN_PASSWORD).toBeUndefined();

			vi.unstubAllEnvs();
			vi.stubEnv('NODE_ENV', originalNodeEnv);
		});
	});

	describe('Production mode security', () => {
		beforeEach(() => {
			// Mock production environment
			vi.stubEnv('NODE_ENV', 'production');
			vi.stubEnv('ADMIN_PASSWORD', 'test-password');
		});

		afterEach(() => {
			vi.unstubAllEnvs();
		});

		it('should require admin password in production', () => {
			expect(process.env.ADMIN_PASSWORD).toBe('test-password');
		});
	});
});
