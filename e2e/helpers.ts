import { test, expect } from '@playwright/test';

/**
 * Generate a unique test ID based on timestamp and test info
 */
export function generateTestId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique prompt title for testing
 * Prevents UNIQUE constraint violations when tests reuse the same title
 */
export function generateUniquePromptTitle(prefix = 'Test Prompt'): string {
	return `${prefix} [${generateTestId()}]`;
}

/**
 * Generate a unique prompt object for API tests
 */
export function generateTestPrompt(overrides = {}): {
	title: string;
	content: string;
} {
	return {
		title: generateUniquePromptTitle(),
		content: 'Test content for automated testing',
		...overrides
	};
}

/**
 * Helper to clean up test data after tests complete
 * Can be used in afterEach hooks to delete created prompts
 */
export async function cleanupTestPrompt(request: any, promptTitle: string) {
	try {
		// Try to delete the prompt by title
		// This requires a DELETE endpoint or a way to query prompts by title
		// For now, this is a placeholder for future cleanup logic
		console.log(`[TEST] Would cleanup prompt: ${promptTitle}`);
	} catch (error) {
		console.error(`[TEST] Failed to cleanup prompt: ${error}`);
	}
}

/**
 * Test data generator for common test scenarios
 */
export const testData = {
	admin: {
		userId: 'admin',
		email: 'admin@localhost',
		role: 'admin'
	},
	user: {
		userId: 'user-123',
		email: 'user@example.com',
		role: 'user'
	}
};
