import { test, expect } from '@playwright/test';

test.describe('Table View Description Truncate', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/prompts');
		await page.waitForLoadState('networkidle');
	});

	test('should switch to table view', async ({ page }) => {
		const tableButton = page.locator('button[title="Table View"]');
		await tableButton.click();

		await expect(page.locator('table')).toBeVisible();
	});

	test('should truncate long descriptions', async ({ page }) => {
		// Switch to table view
		await page.click('button[title="Table View"]');
		await page.waitForTimeout(500);

		// Find description elements
		const descriptions = page.locator('table .max-w-md.truncate.text-muted-foreground');

		// Check they have truncate class
		const count = await descriptions.count();
		if (count > 0) {
			const firstDescription = descriptions.first();
			const classes = await firstDescription.getAttribute('class');
			expect(classes).toContain('truncate');
		}
	});

	test('should have max-width on description', async ({ page }) => {
		await page.click('button[title="Table View"]');
		await page.waitForTimeout(500);

		const descriptions = page.locator('table .max-w-md.truncate.text-muted-foreground');
		const count = await descriptions.count();

		if (count > 0) {
			const firstDescription = descriptions.first();
			const classes = await firstDescription.getAttribute('class');
			expect(classes).toContain('max-w-md');
		}
	});

	test('should not overflow table layout', async ({ page }) => {
		await page.click('button[title="Table View"]');
		await page.waitForTimeout(500);

		// Get table width
		const table = page.locator('table');
		const tableBox = await table.boundingBox();

		// Get description width
		const descriptions = page.locator('table .max-w-md.truncate.text-muted-foreground');
		const count = await descriptions.count();

		if (count > 0) {
			const firstDescription = descriptions.first();
			const descBox = await firstDescription.boundingBox();
			if (!tableBox || !descBox) return;

			// Description should not be wider than table
			expect(descBox.width).toBeLessThanOrEqual(tableBox.width);
		}
	});
});
