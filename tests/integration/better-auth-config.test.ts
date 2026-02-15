import { describe, expect, it } from 'vitest';
import { auth } from '$lib/auth';

describe('Better Auth Configuration', () => {
	it('should have Better Auth configured', () => {
		expect(auth).toBeDefined();
	});

	it('should have auth instance with API methods', () => {
		expect(auth.api).toBeDefined();
		expect(auth.api.signInEmail).toBeDefined();
		expect(auth.api.signUpEmail).toBeDefined();
	});
});
