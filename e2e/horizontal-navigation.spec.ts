import { test, expect } from '@playwright/test';

test.describe('Horizontal Navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/prompts');
		await page.waitForLoadState('networkidle');
	});

	test('should show Prompts link in header', async ({ page }) => {
		const promptsLink = page.locator('a', { hasText: 'Prompts' });
		await expect(promptsLink).toBeVisible();
	});

	test('should show Analytics link in header', async ({ page }) => {
		const analyticsLink = page.locator('a', { hasText: 'Analytics' });
		await expect(analyticsLink).toBeVisible();
	});

	test('should show Settings link in header', async ({ page }) => {
		const settingsLink = page.locator('a', { hasText: 'Settings' });
		await expect(settingsLink).toBeVisible();
	});

	test('should navigate to Prompts', async ({ page }) => {
		const promptsLink = page.locator('a', { hasText: 'Prompts' });
		await Promise.all([page.waitForURL('**/prompts'), promptsLink.click()]);
	});

	test('should navigate to Analytics', async ({ page }) => {
		const analyticsLink = page.locator('a', { hasText: 'Analytics' });
		await Promise.all([page.waitForURL('**/analytics'), analyticsLink.click()]);
	});

	test('should navigate to Settings', async ({ page }) => {
		const settingsLink = page.locator('a', { hasText: 'Settings' });
		await Promise.all([page.waitForURL('**/admin'), settingsLink.click()]);
	});

	test('should highlight active navigation', async ({ page }) => {
		const promptsLink = page.locator('a', { hasText: 'Prompts' });
		await expect(promptsLink).toHaveClass(/bg-primary/);
	});

	test('should show navigation on the right side', async ({ page }) => {
		const nav = page.locator('nav.hidden');
		const header = page.locator('header');
		const headerBox = await header.boundingBox();
		const navBox = await nav.boundingBox();

		// Nav should be on the right side of header
		if (navBox && headerBox) {
			expect(navBox.x).toBeGreaterThan(headerBox.x);
		}
	});
});
