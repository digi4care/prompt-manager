import { describe, it, expect, beforeEach } from 'vitest';
import {
	generateToken,
	verifyToken,
	extractTokenFromHeader,
	authenticateRequest
} from '$lib/server/auth.helper';
import type { RequestEvent } from '@sveltejs/kit';

describe('JWT Service', () => {
	beforeEach(() => {
		// Reset environment
		process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing-32chars';
	});

	describe('generateToken', () => {
		it('should generate a valid JWT token', () => {
			const payload = {
				userId: 'admin',
				email: 'admin@localhost',
				role: 'admin' as const
			};

			const token = generateToken(payload);
			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
		});
	});

	describe('verifyToken', () => {
		it('should verify and decode a valid token', () => {
			const payload = {
				userId: 'admin',
				email: 'admin@localhost',
				role: 'admin' as const
			};

			const token = generateToken(payload);
			const decoded = verifyToken(token);

			expect(decoded.userId).toBe(payload.userId);
			expect(decoded.email).toBe(payload.email);
			expect(decoded.role).toBe(payload.role);
			expect(decoded.iat).toBeDefined();
			expect(decoded.exp).toBeDefined();
		});

		it('should throw error for invalid token', () => {
			expect(() => verifyToken('invalid-token')).toThrow();
		});
	});

	describe('extractTokenFromHeader', () => {
		it('should extract token from Bearer header', () => {
			const authHeader = 'Bearer test-token-123';
			const token = extractTokenFromHeader(authHeader);
			expect(token).toBe('test-token-123');
		});

		it('should return null for missing header', () => {
			const token = extractTokenFromHeader(null);
			expect(token).toBeNull();
		});

		it('should return null for non-Bearer header', () => {
			const token = extractTokenFromHeader('Basic dXNlcjpwYXNz');
			expect(token).toBeNull();
		});

		it('should return empty string for empty Bearer token', () => {
			const token = extractTokenFromHeader('Bearer ');
			expect(token).toBe('');
		});
	});

	describe('authenticateRequest', () => {
		it('should authenticate valid request', () => {
			const payload = { userId: 'admin', email: 'admin@localhost', role: 'admin' as const };
			const token = generateToken(payload);

			const mockEvent = {
				request: {
					headers: {
						get: (name: string) => (name === 'Authorization' ? `Bearer ${token}` : null)
					}
				},
				cookies: { get: () => undefined }
			} as unknown as RequestEvent;

			const result = authenticateRequest(mockEvent);
			expect(result.userId).toBe(payload.userId);
			expect(result.role).toBe(payload.role);
		});

		it('should throw error for request without auth header', () => {
			const mockEvent = {
				request: {
					headers: {
						get: () => null
					}
				},
				cookies: { get: () => undefined }
			} as unknown as RequestEvent;

			expect(() => authenticateRequest(mockEvent)).toThrow();
		});
	});
});
