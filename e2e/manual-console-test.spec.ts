import { test, expect } from '@playwright/test';
import { authenticateAdmin } from './auth-helper';

test.describe('Real Browser Console Monitoring', () => {
	const consoleErrors: string[] = [];
	const consoleWarnings: string[] = [];

	test.beforeEach(async ({ page }) => {
		consoleErrors.length = 0;
		consoleWarnings.length = 0;

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			} else if (msg.type() === 'warning') {
				consoleWarnings.push(msg.text());
			}
		});
	});

	test('Home page - check console', async ({ page }) => {
		console.log('\n=== TESTING HOME PAGE ===');
		await page.goto('http://localhost:45678');
		await page.waitForLoadState('networkidle');

		// Check page loads
		const title = await page.title();
		console.log(`Page title: ${title}`);

		// Check for errors
		console.log(`Console errors: ${consoleErrors.length}`);
		console.log(`Console warnings: ${consoleWarnings.length}`);

		if (consoleErrors.length > 0) {
			console.log('ERRORS:', consoleErrors);
		}
	});

	test('Login page - check console', async ({ page }) => {
		console.log('\n=== TESTING LOGIN PAGE ===');
		await page.goto('http://localhost:45678/login');
		await page.waitForLoadState('networkidle');

		// Check login form exists
		const passwordField = page.locator('input[type="password"]');
		await expect(passwordField).toBeVisible();

		console.log(`Console errors: ${consoleErrors.length}`);
		if (consoleErrors.length > 0) {
			console.log('ERRORS:', consoleErrors);
		}
	});

	test('Login flow - real test', async ({ page }) => {
		console.log('\n=== TESTING LOGIN FLOW ===');

		await authenticateAdmin(page);

		console.log(`Current URL: ${page.url()}`);
		console.log(`Console errors: ${consoleErrors.length}`);

		if (consoleErrors.length > 0) {
			console.log('ERRORS:', consoleErrors);
		}
	});

	test('Admin page - check console', async ({ page }) => {
		console.log('\n=== TESTING ADMIN PAGE ===');

		await authenticateAdmin(page);
		await page.goto('http://localhost:45678/admin');
		await page.waitForLoadState('networkidle');

		console.log(`Current URL: ${page.url()}`);
		console.log(`Page title: ${await page.title()}`);
		console.log(`Console errors: ${consoleErrors.length}`);

		if (consoleErrors.length > 0) {
			console.log('ERRORS:', consoleErrors);
		}
	});

	test('Prompts page - check console', async ({ page }) => {
		console.log('\n=== TESTING PROMPTS PAGE ===');

		await authenticateAdmin(page);
		await page.goto('http://localhost:45678/prompts');
		await page.waitForLoadState('networkidle');

		console.log(`Current URL: ${page.url()}`);
		console.log(`Console errors: ${consoleErrors.length}`);

		if (consoleErrors.length > 0) {
			console.log('ERRORS:', consoleErrors);
		}
	});
});