import { test, expect } from '@playwright/test';
import { authenticateAdmin } from './auth-helper';

/**
 * Setup console error monitoring
 * Captures all console errors and filters out known harmless ones
 */
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
		const realErrors = errors.filter(
			(e) =>
				!e.includes('message port closed') &&
				!e.includes('ResizeObserver') &&
				!e.includes('does not provide an export named')
		);
		expect(realErrors).toHaveLength(0);
	};
}


test.describe('Settings Page - Function Defaults', () => {
	test.beforeEach(async ({ page }) => {
		await authenticateAdmin(page);
		await page.goto('/settings');
		// Wait for settings to load
		await page.waitForSelector('[data-testid="function-settings"]', { timeout: 15000 });
	});

	test('should display page title', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('Settings');
	});

	test('should display function defaults section', async ({ page }) => {
		await expect(page.getByText(/function defaults/i)).toBeVisible();
	});

	test('should display Executor card', async ({ page }) => {
		const executorCard = page.locator('[data-testid="executor-card"]');
		await expect(executorCard).toBeVisible();
		await expect(executorCard.getByText(/executor/i)).toBeVisible();
	});

	test('should display Judge card', async ({ page }) => {
		const judgeCard = page.locator('[data-testid="judge-card"]');
		await expect(judgeCard).toBeVisible();
		await expect(judgeCard.getByText(/judge/i)).toBeVisible();
	});

	test('should display Improve card', async ({ page }) => {
		const improveCard = page.locator('[data-testid="improve-card"]');
		await expect(improveCard).toBeVisible();
		await expect(improveCard.getByText(/improve/i)).toBeVisible();
	});

	test('should display temperature inputs for each card', async ({ page }) => {
		const cards = ['executor', 'judge', 'improve'];

		for (const cardType of cards) {
			const card = page.locator(`[data-testid="${cardType}-card"]`);
			const tempInput = card.locator('input[type="number"]').first();
			await expect(tempInput).toBeVisible();
		}
	});

	test('should display max tokens inputs for each card', async ({ page }) => {
		const cards = ['executor', 'judge', 'improve'];

		for (const cardType of cards) {
			const card = page.locator(`[data-testid="${cardType}-card"]`);
			const maxTokensInput = card.locator('input[type="number"]').nth(1);
			await expect(maxTokensInput).toBeVisible();
		}
	});
});

test.describe('Settings Page - Model Picker', () => {
	test.beforeEach(async ({ page }) => {
		await authenticateAdmin(page);
		await page.goto('/settings');
		await page.waitForSelector('[data-testid="function-settings"]', { timeout: 15000 });
	});

	test('should open model picker modal when clicking choose model', async ({ page }) => {
		const executorCard = page.locator('[data-testid="executor-card"]');
		const chooseButton = executorCard.getByRole('button', { name: /choose.*model/i });

		await chooseButton.click();

		// Modal should be visible
		const modal = page.locator('[data-testid="model-picker-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });
	});

	test('should display model list in picker', async ({ page }) => {
		const executorCard = page.locator('[data-testid="executor-card"]');
		const chooseButton = executorCard.getByRole('button', { name: /choose.*model/i });

		await chooseButton.click();

		const modal = page.locator('[data-testid="model-picker-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Should show at least one model
		const modelItems = modal.locator('[data-testid="model-item"]');
		await expect(modelItems.first()).toBeVisible({ timeout: 5000 });
	});

	test('should filter models by search', async ({ page }) => {
		const executorCard = page.locator('[data-testid="executor-card"]');
		const chooseButton = executorCard.getByRole('button', { name: /choose.*model/i });

		await chooseButton.click();

		const modal = page.locator('[data-testid="model-picker-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Type in search
		const searchInput = modal.locator('input[type="search"], input[placeholder*="search" i]');
		await searchInput.fill('claude');

		// Should filter results
		await page.waitForTimeout(500);
		const modelItems = modal.locator('[data-testid="model-item"]');
		const count = await modelItems.count();
		expect(count).toBeGreaterThan(0);
	});

	test('should close modal when clicking close button', async ({ page }) => {
		const executorCard = page.locator('[data-testid="executor-card"]');
		const chooseButton = executorCard.getByRole('button', { name: /choose.*model/i });

		await chooseButton.click();

		const modal = page.locator('[data-testid="model-picker-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Close modal
		const closeButton = modal.getByRole('button', { name: /close|cancel/i });
		await closeButton.click();

		// Modal should be hidden
		await expect(modal).not.toBeVisible({ timeout: 3000 });
	});

	test('should select model and close modal', async ({ page }) => {
		const executorCard = page.locator('[data-testid="executor-card"]');
		const chooseButton = executorCard.getByRole('button', { name: /choose.*model/i });

		await chooseButton.click();

		const modal = page.locator('[data-testid="model-picker-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		// Click first model
		const firstModel = modal.locator('[data-testid="model-item"]').first();
		await firstModel.click();

		// Modal should close
		await expect(modal).not.toBeVisible({ timeout: 3000 });
	});
});

test.describe('Settings Page - Model Catalog', () => {
	test.beforeEach(async ({ page }) => {
		await authenticateAdmin(page);
		await page.goto('/settings');
		await page.waitForSelector('[data-testid="model-catalog"]', { timeout: 15000 });
	});

	test('should display model catalog section', async ({ page }) => {
		const catalog = page.locator('[data-testid="model-catalog"]');
		await expect(catalog).toBeVisible();
	});

	test('should display provider count', async ({ page }) => {
		await expect(page.getByText(/\d+\s*providers?/i)).toBeVisible();
	});

	test('should display model count', async ({ page }) => {
		await expect(page.getByText(/\d+\s*(active\s*)?models?/i)).toBeVisible();
	});

	test('should display provider list', async ({ page }) => {
		const providerCards = page.locator('[data-testid="provider-card"]');
		const count = await providerCards.count();
		expect(count).toBeGreaterThan(0);
	});
});

test.describe('Settings Page - Console Error Check', () => {
	test('should not have console errors on load', async ({ page }) => {
		const cleanup = setupConsoleErrorCheck(page);

		await authenticateAdmin(page);
		await page.goto('/settings');
		await page.waitForSelector('[data-testid="function-settings"]', { timeout: 15000 });

		await cleanup();
	});

	test('should not have console errors when opening model picker', async ({ page }) => {
		const cleanup = setupConsoleErrorCheck(page);

		await authenticateAdmin(page);
		await page.goto('/settings');
		await page.waitForSelector('[data-testid="function-settings"]', { timeout: 15000 });

		const executorCard = page.locator('[data-testid="executor-card"]');
		const chooseButton = executorCard.getByRole('button', { name: /choose.*model/i });
		await chooseButton.click();

		const modal = page.locator('[data-testid="model-picker-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		await cleanup();
	});

	test('should not have console errors when searching models', async ({ page }) => {
		const cleanup = setupConsoleErrorCheck(page);

		await authenticateAdmin(page);
		await page.goto('/settings');
		await page.waitForSelector('[data-testid="function-settings"]', { timeout: 15000 });

		const executorCard = page.locator('[data-testid="executor-card"]');
		const chooseButton = executorCard.getByRole('button', { name: /choose.*model/i });
		await chooseButton.click();

		const modal = page.locator('[data-testid="model-picker-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		const searchInput = modal.locator('input[type="search"], input[placeholder*="search" i]');
		await searchInput.fill('claude');
		await page.waitForTimeout(500);

		await cleanup();
	});

	test('should not have console errors when selecting model', async ({ page }) => {
		const cleanup = setupConsoleErrorCheck(page);

		await authenticateAdmin(page);
		await page.goto('/settings');
		await page.waitForSelector('[data-testid="function-settings"]', { timeout: 15000 });

		const executorCard = page.locator('[data-testid="executor-card"]');
		const chooseButton = executorCard.getByRole('button', { name: /choose.*model/i });
		await chooseButton.click();

		const modal = page.locator('[data-testid="model-picker-modal"]');
		await expect(modal).toBeVisible({ timeout: 5000 });

		const firstModel = modal.locator('[data-testid="model-item"]').first();
		await firstModel.click();

		await cleanup();
	});
});

test.describe('Settings Page - Input Validation', () => {
	test.beforeEach(async ({ page }) => {
		await authenticateAdmin(page);
		await page.goto('/settings');
		await page.waitForSelector('[data-testid="function-settings"]', { timeout: 15000 });
	});

	test('should accept valid temperature values', async ({ page }) => {
		const executorCard = page.locator('[data-testid="executor-card"]');
		const tempInput = executorCard.locator('input[type="number"]').first();

		await tempInput.fill('0.5');
		await expect(tempInput).toHaveValue('0.5');

		await tempInput.fill('1.0');
		await expect(tempInput).toHaveValue('1');
	});

	test('should accept valid max tokens values', async ({ page }) => {
		const executorCard = page.locator('[data-testid="executor-card"]');
		const maxTokensInput = executorCard.locator('input[type="number"]').nth(1);

		await maxTokensInput.fill('4096');
		await expect(maxTokensInput).toHaveValue('4096');

		await maxTokensInput.fill('8192');
		await expect(maxTokensInput).toHaveValue('8192');
	});
});
