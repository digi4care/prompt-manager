import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Environment Validation', () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		// Reset to original env before each test
		vi.resetModules();
		Object.assign(process.env, originalEnv);
		delete process.env.NODE_ENV;
	});

	afterEach(() => {
		// Restore original env after each test
		Object.assign(process.env, originalEnv);
	});

	describe('Required environment variables', () => {
		it('should throw error if DATABASE_URL is missing', async () => {
			delete process.env.DATABASE_URL;

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).toThrow(
				/Missing required environment variables: DATABASE_URL/
			);
		});

		it('should not throw error if DATABASE_URL is set', async () => {
			process.env.DATABASE_URL = 'file:test.db';
			process.env.ADMIN_PASSWORD = 'test-password';

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).not.toThrow();
		});
	});

	describe('ADMIN_PASSWORD validation', () => {
		it('should throw error if ADMIN_PASSWORD is missing', async () => {
			process.env.DATABASE_URL = 'file:test.db';
			delete process.env.ADMIN_PASSWORD;

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).toThrow(/ADMIN_PASSWORD/);
		});

		it('should throw error if ADMIN_PASSWORD is empty', async () => {
			process.env.DATABASE_URL = 'file:test.db';
			process.env.ADMIN_PASSWORD = '';

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).toThrow(/ADMIN_PASSWORD/);
		});

		it('should not throw error if ADMIN_PASSWORD is set', async () => {
			process.env.DATABASE_URL = 'file:test.db';
			process.env.ADMIN_PASSWORD = 'secure-password';

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).not.toThrow();
		});
	});

	describe('Production mode validation', () => {
		beforeEach(() => {
			process.env.NODE_ENV = 'production';
		});

		it('should throw error if OPENCODE_URL is missing in production', async () => {
			process.env.DATABASE_URL = 'file:test.db';
			process.env.ADMIN_PASSWORD = 'secure-password';
			delete process.env.OPENCODE_URL;

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).toThrow(/OPENCODE_URL/);
		});

		it('should throw error if ADMIN_PASSWORD is missing in production', async () => {
			process.env.DATABASE_URL = 'file:test.db';
			process.env.OPENCODE_URL = 'http://opencode:4096';
			delete process.env.ADMIN_PASSWORD;

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).toThrow(/ADMIN_PASSWORD/);
		});

		it('should not throw error if all production vars are set', async () => {
			process.env.DATABASE_URL = 'file:test.db';
			process.env.OPENCODE_URL = 'http://opencode:4096';
			process.env.ADMIN_PASSWORD = 'secure-password';

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).not.toThrow();
		});

		it('should include helpful error message for missing production vars', async () => {
			process.env.DATABASE_URL = 'file:test.db';
			process.env.ADMIN_PASSWORD = 'secure-password';
			delete process.env.OPENCODE_URL;

			const { validateEnvironment } = await import('$lib/server/env');

			try {
				validateEnvironment();
				expect.fail('Should have thrown an error');
			} catch (error: any) {
				expect(error.message).toContain('OPENCODE_URL');
				expect(error.message).toContain('production');
				expect(error.message).toContain('deployment');
			}
		});
	});

	describe('Development mode validation', () => {
		beforeEach(() => {
			process.env.NODE_ENV = 'development';
			process.env.DATABASE_URL = 'file:test.db';
			process.env.ADMIN_PASSWORD = 'dev-password';
		});

		it('should set default OPENCODE_URL if not provided in development', async () => {
			delete process.env.OPENCODE_URL;

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { validateEnvironment } = await import('$lib/server/env');

			validateEnvironment();

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('OPENCODE_URL not set'));
			expect(process.env.OPENCODE_URL).toBe('http://localhost:4096');

			consoleSpy.mockRestore();
		});

		it('should use provided OPENCODE_URL if set in development', async () => {
			process.env.OPENCODE_URL = 'http://custom-opencode:4096';

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { validateEnvironment } = await import('$lib/server/env');

			validateEnvironment();

			expect(process.env.OPENCODE_URL).toBe('http://custom-opencode:4096');

			consoleSpy.mockRestore();
		});

		it('should throw error if ADMIN_PASSWORD is missing in development', async () => {
			delete process.env.ADMIN_PASSWORD;

			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).toThrow(/ADMIN_PASSWORD/);
		});

		it('should not throw error when OPENCODE_URL is missing in development', async () => {
			delete process.env.OPENCODE_URL;

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const { validateEnvironment } = await import('$lib/server/env');

			expect(() => validateEnvironment()).not.toThrow();

			consoleSpy.mockRestore();
		});
	});
});
