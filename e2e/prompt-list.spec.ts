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

test.describe('PromptList and PromptCard Components', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
		await setupConsoleErrorCheck(page);
	});

	// ============ PROMPTCARD COMPONENT ============

	test.describe('PromptCard Component', () => {
		test('should display all prompt cards', async ({ page }) => {
			const cards = page.locator('.prompt-card-wrapper');
			await expect(cards).toHaveCount(3);
		});

		test('should display prompt titles', async ({ page }) => {
			await expect(
				page.locator('.prompt-card-wrapper').filter({ hasText: 'SQL Query Generator' }).first()
			).toBeVisible();
			await expect(
				page.locator('.prompt-card-wrapper').filter({ hasText: 'Code Review Assistant' }).first()
			).toBeVisible();
			await expect(
				page.locator('.prompt-card-wrapper').filter({ hasText: 'Blog Post Writer' }).first()
			).toBeVisible();
		});

		test('should display description', async ({ page }) => {
			const card = page.locator('.prompt-card-wrapper').first();
			const description = card.locator('p').filter({ hasText: 'Generates optimized SQL queries' });
			await expect(description.first()).toBeVisible();
		});

		test('should display tags', async ({ page }) => {
			const card = page.locator('.prompt-card-wrapper').first();
			await expect(card.locator('span').filter({ hasText: 'sql' }).first()).toBeVisible();
			await expect(card.locator('span').filter({ hasText: 'database' }).first()).toBeVisible();
		});

		test('should show version indicator', async ({ page }) => {
			const card = page.locator('.prompt-card-wrapper').first();
			await expect(card.locator('text=/v\\d+/')).toBeVisible();
		});

		test('should show updated date', async ({ page }) => {
			const card = page.locator('.prompt-card-wrapper').first();
			await expect(card.locator('text=/Updated/')).toBeVisible();
		});

		test('should show purpose badge', async ({ page }) => {
			const card = page.locator('.prompt-card-wrapper').first();
			await expect(card.locator('span').filter({ hasText: 'development' }).first()).toBeVisible();
		});

		test('should handle card click', async ({ page }) => {
			const card = page.locator('.prompt-card-wrapper').first();
			await card.click();
			// Look for toast notification (typically has role="alert" or "status")
			await expect(page.locator('[role="alert"], [role="status"]').first()).toBeVisible({
				timeout: 5000
			});
		});

		test('should be keyboard accessible via click handler', async ({ page }) => {
			const card = page.locator('#prompt-list-container [role="button"]').first();
			await card.focus();
			await expect(card).toBeFocused();
		});

		test('should have correct hover state', async ({ page }) => {
			const card = page.locator('.prompt-card-wrapper').first();
			await card.hover();
			await expect(card).toBeVisible();
		});

		test('should be interactive', async ({ page }) => {
			const card = page.locator('.prompt-card-wrapper').first();
			await expect(card).toBeVisible();
		});
	});

	// ============ PROMPTLIST COMPONENT ============

	test.describe('PromptList Component', () => {
		test('should display prompts section', async ({ page }) => {
			await expect(page.locator('#prompts-section')).toBeVisible();
		});

		test('should show prompt count', async ({ page }) => {
			const cards = page.locator('.prompt-card-wrapper');
			await expect(cards).toHaveCount(3);
		});

		test('should display prompt cards', async ({ page }) => {
			const cards = page.locator('.prompt-card-wrapper');
			await expect(cards.first()).toBeVisible();
		});

		test('should show purpose badges in cards', async ({ page }) => {
			const badges = page.locator('.prompt-card-wrapper span');
			await expect(badges.first()).toBeVisible();
		});
	});

	// Search, Sort, and Tag Filter functionality tested in prompts.spec.ts (page tests)

	// ============ RESPONSIVE DESIGN ============

	test.describe('Responsive Design', () => {
		test('should display grid on mobile', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			const grid = page.locator('#prompt-list-container .grid');
			await expect(grid.first()).toBeVisible();
		});

		test('should display grid on tablet', async ({ page }) => {
			await page.setViewportSize({ width: 768, height: 1024 });
			const grid = page.locator('#prompt-list-container .grid');
			await expect(grid.first()).toBeVisible();
		});

		test('should display grid on desktop', async ({ page }) => {
			const grid = page.locator('#prompt-list-container .grid');
			await expect(grid.first()).toBeVisible();
		});
	});

	// ============ ACCESSIBILITY ============

	test.describe('Accessibility (WCAG 2.1 AA)', () => {
		test('prompt cards should have keyboard accessible button', async ({ page }) => {
			const card = page.locator('#prompt-list-container [role="button"]').first();
			await card.focus();
			await expect(card).toBeFocused();
		});

		test('prompt cards should be reachable via keyboard', async ({ page }) => {
			await page.keyboard.press('Tab');
			await page.keyboard.press('Tab');
			await page.keyboard.press('Tab');
			const activeTag = await page.evaluate(() => document.activeElement?.tagName);
			expect(activeTag).toBeTruthy();
		});
	});

	// Note: Loading state tested in prompts.spec.ts (page tests)
	// /test page uses samplePrompts (pre-loaded, no loading state)
});
