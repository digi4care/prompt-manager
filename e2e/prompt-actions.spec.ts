import { test, expect } from '@playwright/test';

function setupConsoleErrorCheck(page: any): () => Promise<void> {
	const errors: string[] = [];
	const errorHandler = (msg: any) => {
		if (msg.type() === 'error') {
			errors.push(msg.text());
		}
	};
	page.on('console', errorHandler);

	return async () => {
		page.off('console', errorHandler);
		// Filter out known harmless errors
		const realErrors = errors.filter((e) => !e.includes('message port closed'));
		expect(realErrors).toHaveLength(0);
	};
}

test.describe('Prompt Actions Dropdown', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/prompts');
		await page.waitForLoadState('networkidle');
		setupConsoleErrorCheck(page);
	});

	test('should show actions dropdown on each card', async ({ page }) => {
		// Each card should have a dropdown button (3 dots) - check the first card
		const firstCard = page.locator('#prompt-list-container [role="button"]').first();
		const dropdownButton = firstCard.locator('button').filter({ hasText: '' });
		await expect(dropdownButton).toBeVisible();
	});

	test('should open dropdown when clicked', async ({ page }) => {
		// Find the MoreHorizontal dropdown trigger button on the first card
		const firstCard = page.locator('#prompt-list-container [role="button"]').first();
		const dropdownTrigger = firstCard.locator('button').filter({ hasText: '' });
		await dropdownTrigger.click();

		// Wait for dropdown menu to appear - menu is typically positioned absolutely
		// Use role="menu" as the primary stable selector
		const dropdownMenu = page.locator('[role="menu"]');
		await expect(dropdownMenu.first()).toBeVisible({ timeout: 3000 });
	});

	test('should show Edit option', async ({ page }) => {
		const firstCard = page.locator('#prompt-list-container [role="button"]').first();
		const dropdownTrigger = firstCard.locator('button').filter({ hasText: '' });
		await dropdownTrigger.click();

		// Look for Edit menu item - menu is typically a child of [role="menu"]
		const menu = page.locator('[role="menu"]').first();
		const editOption = menu.locator('[role="menuitem"]').filter({ hasText: 'Edit' });
		await expect(editOption).toBeVisible();
	});

	test('should show Duplicate option', async ({ page }) => {
		const firstCard = page.locator('#prompt-list-container [role="button"]').first();
		const dropdownTrigger = firstCard.locator('button').filter({ hasText: '' });
		await dropdownTrigger.click();

		const menu = page.locator('[role="menu"]').first();
		const duplicateOption = menu.locator('[role="menuitem"]').filter({ hasText: 'Duplicate' });
		await expect(duplicateOption).toBeVisible();
	});

	test('should show Delete option', async ({ page }) => {
		const firstCard = page.locator('#prompt-list-container [role="button"]').first();
		const dropdownTrigger = firstCard.locator('button').filter({ hasText: '' });
		await dropdownTrigger.click();

		const menu = page.locator('[role="menu"]').first();
		const deleteOption = menu.locator('[role="menuitem"]').filter({ hasText: 'Delete' });
		await expect(deleteOption).toBeVisible();
	});

	test('should navigate to edit page when Edit clicked', async ({ page }) => {
		const firstCard = page.locator('#prompt-list-container [role="button"]').first();
		const dropdownTrigger = firstCard.locator('button').filter({ hasText: '' });
		await dropdownTrigger.click();

		const menu = page.locator('[role="menu"]').first();
		const editOption = menu.locator('[role="menuitem"]').filter({ hasText: 'Edit' });
		await editOption.click();
		await page.waitForTimeout(500);

		// Should be on edit page
		expect(page.url()).toMatch(/\/prompts\/\d+\/edit/);
	});

	test('should show alert when Duplicate clicked', async ({ page }) => {
		const firstCard = page.locator('#prompt-list-container [role="button"]').first();
		const dropdownTrigger = firstCard.locator('button').filter({ hasText: '' });
		await dropdownTrigger.click();

		// Listen for alert
		let alertShown = false;
		let alertMessage = '';
		page.on('dialog', (dialog) => {
			alertShown = true;
			alertMessage = dialog.message();
			dialog.accept();
		});

		const menu = page.locator('[role="menu"]').first();
		const duplicateOption = menu.locator('[role="menuitem"]').filter({ hasText: 'Duplicate' });
		await duplicateOption.click();

		expect(alertShown).toBe(true);
		expect(alertMessage).toContain('not yet implemented');
	});

	test('should show confirmation when Delete clicked', async ({ page }) => {
		const firstCard = page.locator('#prompt-list-container [role="button"]').first();
		const dropdownTrigger = firstCard.locator('button').filter({ hasText: '' });
		await dropdownTrigger.click();

		// Listen for dialog
		let dialogShown = false;
		page.on('dialog', (dialog) => {
			dialogShown = true;
			dialog.accept();
		});

		const menu = page.locator('[role="menu"]').first();
		const deleteOption = menu.locator('[role="menuitem"]').filter({ hasText: 'Delete' });
		await deleteOption.click();

		expect(dialogShown).toBe(true);
	});
});
