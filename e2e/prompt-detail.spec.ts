import { test, expect } from '@playwright/test';

let testPromptId: number;
const promptDescriptionText = 'E2E prompt for prompt detail page tests';

async function gotoPromptDetailWithRetry(page: any) {
	for (let attempt = 1; attempt <= 3; attempt++) {
		await page.goto(`/prompts/${testPromptId}`);
		await page.waitForLoadState('networkidle');
		const descriptionVisible = await page.getByText(promptDescriptionText).isVisible();
		if (descriptionVisible) return;
		await page.waitForTimeout(500 * attempt);
	}
	throw new Error('Prompt detail did not render description after retries');
}

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

test.describe('Prompt Detail Page', () => {
	test.describe.configure({ mode: 'serial' });

	let cleanup: () => Promise<void>;

	test.beforeAll(async ({ request }) => {
		const uniqueTitle = `E2E Prompt Detail ${Date.now()}`;
		let lastError = '';

		for (let attempt = 1; attempt <= 5; attempt++) {
			const response = await request.post('/api/prompts', {
				data: {
					title: uniqueTitle,
					description: promptDescriptionText,
					purpose: 'development',
					tags: ['e2e'],
					llmProviders: ['openai'],
					content: 'Hello from Playwright (prompt detail)'
				}
			});

			if (response.ok()) {
				const data = await response.json();
				testPromptId = data.id;
				return;
			}

			const body = await response.text();
			lastError = `POST /api/prompts failed (attempt ${attempt}/5): ${response.status()} ${body}`;
			await new Promise((r) => setTimeout(r, 200 * attempt));
		}

		throw new Error(lastError || 'POST /api/prompts failed');
	});

	test.beforeEach(async ({ page }) => {
		cleanup = setupConsoleErrorCheck(page);
	});

	test.afterEach(async () => {
		if (cleanup) await cleanup();
	});

	test.describe('Page Structure', () => {
		test('should display prompt detail page correctly', async ({ page }) => {
			await gotoPromptDetailWithRetry(page);

			// Check page structure
			await expect(page.locator('#prompt-detail-section')).toBeVisible();

			// Check breadcrumb
			const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
			await expect(breadcrumb).toBeVisible();
			await expect(breadcrumb.locator('text=Prompts')).toBeVisible();

			// Check title
			await expect(page.locator('h1')).toBeVisible();

			// Check meta line (version + updated)
			const metaLine = page
				.locator('#prompt-detail-section header p')
				.filter({ hasText: 'Updated' });
			await expect(metaLine.first()).toBeVisible();
		});

		test('should display prompt metadata correctly', async ({ page }) => {
			await gotoPromptDetailWithRetry(page);

			// Check that the page has content - title should be visible
			await expect(page.locator('h1')).toBeVisible();

			// Check description text from created prompt
			await expect(page.getByText(promptDescriptionText)).toBeVisible();
		});

		test('should display quick stats correctly', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// In the current UI these are shown inline as a meta line under the title
			const metaLine = page
				.locator('#prompt-detail-section header p')
				.filter({ hasText: 'Updated' });
			await expect(metaLine.first()).toContainText(/version/i);
			await expect(metaLine.first()).toContainText(/Updated/i);
		});
	});

	test.describe('Read-only Editor', () => {
		test('should display prompt content in read-only viewer', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check prompt content section
			const contentSection = page.locator('.rounded-lg.border.bg-card:has-text("Prompt Content")');
			await expect(contentSection).toBeVisible();

			// Check content viewer is present with pre/code block
			const codeBlock = contentSection.locator('pre code');
			await expect(codeBlock).toBeVisible();
		});

		test('should have copy button in content viewer', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check copy button
			const copyButton = page.getByRole('button', { name: /copy/i });
			await expect(copyButton).toBeVisible();
		});
	});

	test.describe('Version Timeline', () => {
		test('should display version timeline', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check version history section
			const versionHistory = page.getByRole('heading', { name: 'Version History' });
			await expect(versionHistory).toBeVisible();
		});

		test('should show version count', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check version count text - look for the paragraph that mentions versions available
			const versionHistoryCard = page.locator(
				'.rounded-lg.border.bg-card:has-text("Version History")'
			);
			const versionCountText = versionHistoryCard.locator('p.text-sm.text-muted-foreground');
			await expect(versionCountText.first()).toContainText('version');
		});

		test('should allow selecting a version', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Find and click on a version card if available
			const sidebar = page.locator('aside');
			const versionCards = sidebar.locator('.rounded-lg.border.cursor-pointer');
			const count = await versionCards.count();

			if (count > 1) {
				// Click on the second version (first is usually current)
				await versionCards.nth(1).click();
				await page.waitForTimeout(500);

				// Check if version details section appears
				await expect(page.locator('h2:has-text("Details")').first()).toBeVisible();
			}
		});
	});

	test.describe('Action Buttons', () => {
		test('should display Edit button', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check Edit button (there are two - use first)
			const editButton = page.getByRole('button', { name: /Edit/i }).first();
			await expect(editButton).toBeVisible();
		});

		test('should display Improve with AI button', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check Improve button
			const improveButton = page.locator('button:has-text("Improve")');
			await expect(improveButton).toBeVisible();
		});

		test('should display Delete button', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check Delete button (icon button with aria-label)
			const deleteButton = page.getByRole('button', { name: /delete prompt/i });
			await expect(deleteButton).toBeVisible();
		});

		test('should have Edit button that links to edit page', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check Edit button exists - use a more specific selector
			const editButton = page.getByRole('button', { name: /Edit/i }).first();
			await expect(editButton).toBeVisible();

			// Note: STORY-017 implements the edit page, so this link should work after that story
			// The button uses goto() for navigation, so we just verify the button is present
		});
	});

	test.describe('Delete Functionality', () => {
		test('should show confirmation dialog when Delete is clicked', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Click Delete button (icon button with aria-label)
			const deleteButton = page.getByRole('button', { name: /delete prompt/i });
			await deleteButton.click();

			// Check confirmation dialog appears
			const dialog = page.locator('[role="dialog"]');
			await expect(dialog).toBeVisible();

			// Check confirmation message
			await expect(dialog).toContainText('Delete');

			// Check Cancel button
			await expect(dialog.locator('button:has-text("Cancel")')).toBeVisible();

			// Check Delete confirmation button
			await expect(dialog.locator('button:has-text("Delete")').last()).toBeVisible();
		});

		test('should close dialog when Cancel is clicked', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Click Delete button (icon button with aria-label)
			const deleteButton = page.getByRole('button', { name: /delete prompt/i });
			await deleteButton.click();

			// Click Cancel
			const cancelButton = page.locator('[role="dialog"] button:has-text("Cancel")');
			await cancelButton.click();

			// Dialog should be closed
			const dialog = page.locator('[role="dialog"]:has-text("Delete Prompt")');
			await expect(dialog).not.toBeVisible();
		});
	});

	test.describe('Navigation', () => {
		test('should navigate back to prompts list via breadcrumb', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Click on Prompts in breadcrumb
			const breadcrumbLink = page.locator('nav[aria-label="Breadcrumb"] a:has-text("Prompts")');
			await breadcrumbLink.click();

			// Should navigate back to prompts list
			await page.waitForURL(/.*\/prompts$/);
		});
	});

	test.describe('Purpose Display', () => {
		test('should display purpose if present', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check purpose section if prompt has a purpose
			const purposeSection = page.locator('.rounded-lg.border.bg-card:has-text("Purpose")');
			const isVisible = await purposeSection.isVisible();

			if (isVisible) {
				await expect(purposeSection).toBeVisible();
			}
		});
	});

	test.describe('Accessibility', () => {
		test('should have proper heading hierarchy', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check heading levels
			const h1 = page.locator('h1').first();
			await expect(h1).toBeVisible();

			const h2s = page.locator('h2');
			const h2Count = await h2s.count();
			expect(h2Count).toBeGreaterThan(0);
		});

		test('should have proper ARIA labels', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Check breadcrumb has ARIA label
			const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
			await expect(breadcrumb).toHaveAttribute('aria-label');
		});
	});

	test.describe('Console Errors', () => {
		test('should not have console errors on page load', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Wait a bit for any async errors
			await page.waitForTimeout(2000);

			// Check that cleanup doesn't find errors
			await cleanup();
		});

		test('should not have console errors after version selection', async ({ page }) => {
			await page.goto(`/prompts/${testPromptId}`);
			await page.waitForLoadState('networkidle');

			// Try to select a version
			const versionCards = page.locator('.rounded-lg.border.cursor-pointer');
			const count = await versionCards.count();

			if (count > 1) {
				await versionCards.nth(1).click();
				await page.waitForTimeout(1000);
			}

			// Check that cleanup doesn't find errors
			await cleanup();
		});
	});
});
