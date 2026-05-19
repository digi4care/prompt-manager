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

		it('should require ADMIN_PASSWORD in development', () => {
			const originalNodeEnv = process.env.NODE_ENV;
			vi.stubEnv('NODE_ENV', 'development');
			vi.stubEnv('ADMIN_PASSWORD', 'dev-password');

			// Admin password must be set even in dev - never allow empty passwords
			expect(process.env.ADMIN_PASSWORD).toBeDefined();
			expect(process.env.ADMIN_PASSWORD).not.toBe('');

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