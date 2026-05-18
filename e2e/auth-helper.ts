/**
 * Authentication helper for E2E tests
 * Uses Better Auth login form with environment credentials
 * No bypass mechanisms - always authenticates properly
 */

import type { Page } from '@playwright/test';

/**
 * Get admin credentials from environment variables
 */
function getCredentials(): { email: string; password: string } {
	const email = process.env.ADMIN_EMAIL;
	const password = process.env.ADMIN_PASSWORD;

	if (!email || !password) {
		throw new Error(
			'ADMIN_EMAIL and ADMIN_PASSWORD must be set for E2E tests.\n' +
				'Add them to your .env file:\n' +
				'  ADMIN_EMAIL=admin@example.com\n' +
				'  ADMIN_PASSWORD=your-secure-password'
		);
	}

	return { email, password };
}

/**
 * Authenticate as admin using the login form
 * This uses the real Better Auth login flow - no bypasses
 */
export async function authenticateAdmin(page: Page): Promise<void> {
	const { email, password } = getCredentials();

	// Navigate to login page
	await page.goto('/login');
	await page.waitForSelector('form', { timeout: 10000 });

	// Fill in login credentials
	await page.fill('input[name="email"]', email);
	await page.fill('input[name="password"]', password);

	// Submit login form
	await page.click('button[type="submit"]');

	// Wait for redirect to settings (successful login)
	await page.waitForURL('/settings', { timeout: 15000 });
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page): Promise<void> {
	await page.goto('/logout');
	await page.waitForURL('/login', { timeout: 10000 });
}
