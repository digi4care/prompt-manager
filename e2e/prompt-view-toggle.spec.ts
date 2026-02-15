import { test, expect } from '@playwright/test';

test.describe('Prompt List View Toggle', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/prompts');
		await page.waitForLoadState('networkidle');
	});

	test('should show grid view by default', async ({ page }) => {
		const gridButton = page.locator('button[title="Grid View"]');
		await expect(gridButton).toHaveClass(/bg-primary/);
	});

	test('should toggle to table view', async ({ page }) => {
		const tableButton = page.locator('button[title="Table View"]');
		await tableButton.click();

		// Verify table view is active
		await expect(tableButton).toHaveClass(/bg-primary/);
		await expect(page.locator('table')).toBeVisible();
	});

	test('should toggle back to grid view', async ({ page }) => {
		const tableButton = page.locator('button[title="Table View"]');
		await tableButton.click();

		const gridButton = page.locator('button[title="Grid View"]');
		await gridButton.click();

		// Verify grid view is active
		await expect(gridButton).toHaveClass(/bg-primary/);
		await expect(page.locator('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3')).toBeVisible();
	});

	test('should show same prompts in both views', async ({ page }) => {
		// Count prompts in grid view
		const gridCards = page.locator('#prompt-list-container [role="button"]');
		const gridCount = await gridCards.count();

		// Switch to table view
		await page.click('button[title="Table View"]');
		await page.waitForTimeout(500);

		// Count prompts in table view
		const tableRows = page.locator('table tbody tr');
		const tableCount = await tableRows.count();

		// Should have same number
		if (gridCount === 0) {
			expect(tableCount).toBe(0);
			return;
		}
		expect(gridCount).toBe(tableCount);
	});
});
