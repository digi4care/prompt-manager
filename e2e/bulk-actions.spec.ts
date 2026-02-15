import { test, expect } from '@playwright/test';

test.describe('Bulk Actions', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/prompts');
		await page.waitForLoadState('networkidle');
	});

	test('should show bulk actions button', async ({ page }) => {
		const bulkButton = page
			.locator('button', { hasText: 'Bulk Actions' })
			.or(page.locator('button', { hasText: 'selected' }));
		await expect(bulkButton.first()).toBeVisible();
	});

	test('should enter bulk mode when clicked', async ({ page }) => {
		const bulkButton = page.locator('button', { hasText: 'Bulk Actions' });
		await bulkButton.click();

		// Wait for client mount
		await page.waitForTimeout(500);

		// Verify bulk mode indicator is visible
		const banner = page.locator('text=Bulk Selection Mode Active');
		await expect(banner).toBeVisible();
	});

	test('should show visual indicator banner in bulk mode', async ({ page }) => {
		const bulkButton = page.locator('button', { hasText: 'Bulk Actions' });
		await bulkButton.click();

		// Wait for client mount
		await page.waitForTimeout(500);

		// Verify banner with correct styling
		const banner = page.locator('.bg-primary\\/10');
		await expect(banner).toBeVisible();
		await expect(banner).toContainText('Bulk Selection Mode Active');
		await expect(banner).toContainText('Click cards to select them');
	});

	test('should select card when clicked in bulk mode', async ({ page }) => {
		const bulkButton = page.locator('button', { hasText: 'Bulk Actions' });
		await bulkButton.click();

		// Wait for client mount
		await page.waitForTimeout(500);

		// Click first card (direct children are the selectable wrappers)
		const cards = page.locator('#prompt-list-container .grid > div');
		const firstCard = cards.first();
		await firstCard.click();

		// Wait a moment for state update
		await page.waitForTimeout(200);

		// Verify visual feedback - ring and background
		await expect(firstCard).toHaveClass(/ring-2/);
		await expect(firstCard).toHaveClass(/ring-primary/);
	});

	test('should update selection count', async ({ page }) => {
		const bulkButton = page.locator('button', { hasText: 'Bulk Actions' });
		await bulkButton.click();

		// Wait for client mount
		await page.waitForTimeout(500);

		// Select multiple cards
		const cards = page.locator('#prompt-list-container .grid > div');
		await cards.nth(0).click();
		await page.waitForTimeout(200);
		await cards.nth(1).click();
		await page.waitForTimeout(200);
		await cards.nth(2).click();
		await page.waitForTimeout(200);

		// Verify count in banner container (count is a separate element)
		const banner = page.locator('.bg-primary\\/10');
		await expect(banner).toBeVisible();
		await expect(banner).toContainText('(3 selected)');
	});

	test('should deselect card when clicked again', async ({ page }) => {
		const bulkButton = page.locator('button', { hasText: 'Bulk Actions' });
		await bulkButton.click();

		// Wait for client mount
		await page.waitForTimeout(500);

		const cards = page.locator('#prompt-list-container .grid > div');
		const firstCard = cards.first();
		await firstCard.click();
		await page.waitForTimeout(200);

		// Verify it's selected
		await expect(firstCard).toHaveClass(/ring-2/);

		// Click again to deselect
		await firstCard.click();
		await page.waitForTimeout(200);

		// Verify it's deselected
		await expect(firstCard).not.toHaveClass(/ring-2/);
		await expect(page.locator('text=\\(0 selected\\)')).toHaveCount(0);
	});

	test('should show delete button when items selected', async ({ page }) => {
		const bulkButton = page.locator('button', { hasText: 'Bulk Actions' });
		await bulkButton.click();

		// Wait for client mount
		await page.waitForTimeout(500);

		// Select a card
		const cards = page.locator('#prompt-list-container .grid > div');
		await cards.first().click();
		await page.waitForTimeout(200);

		// Verify delete button appears
		const deleteButton = page.locator('button', { hasText: /Delete \d+ prompt/ });
		await expect(deleteButton).toBeVisible();
	});

	test('should exit bulk mode when cancel clicked', async ({ page }) => {
		const bulkButton = page.locator('button', { hasText: 'Bulk Actions' });
		await bulkButton.click();

		// Wait for client mount
		await page.waitForTimeout(500);

		// Verify banner is visible
		const banner = page.locator('text=Bulk Selection Mode Active');
		await expect(banner).toBeVisible();

		// Click to cancel
		await bulkButton.click();

		// Verify banner is gone
		await expect(page.locator('text=Bulk Selection Mode Active')).not.toBeVisible();

		// Verify selection is cleared
		await expect(bulkButton).toContainText('Bulk Actions');
		await expect(bulkButton).not.toContainText(/selected/);
	});

	test('should show confirmation dialog on bulk delete', async ({ page }) => {
		// Listen for dialog
		let dialogShown = false;
		page.on('dialog', (dialog) => {
			dialogShown = true;
			dialog.accept();
		});

		const bulkButton = page.locator('button', { hasText: 'Bulk Actions' });
		await bulkButton.click();

		// Wait for client mount
		await page.waitForTimeout(500);

		// Select 2 cards
		const cards = page.locator('#prompt-list-container .grid > div');
		await cards.nth(0).click();
		await page.waitForTimeout(200);
		await cards.nth(1).click();
		await page.waitForTimeout(200);

		// Click delete
		const deleteButton = page.locator('button', { hasText: /Delete \d+ prompt/ });
		await deleteButton.click();

		// Verify dialog was shown
		expect(dialogShown).toBe(true);
	});
});
