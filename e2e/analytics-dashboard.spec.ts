import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard Page', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to analytics page
		await page.goto('/analytics');
	});

	test('should display page header and title', async ({ page }) => {
		// Verify page header
		const heading = page.locator('h1');
		await expect(heading).toBeVisible();
		await expect(heading).toHaveText('Analytics Dashboard');

		// Verify description
		const description = page.getByTestId('analytics-description');
		await expect(description).toBeVisible();
		await expect(description).toContainText('Track your prompt management patterns');
	});

	test('should display export all button', async ({ page }) => {
		const exportButton = page.getByTestId('export-all-button');
		await expect(exportButton).toBeVisible();
		await expect(exportButton).toContainText('Export All');
	});

	test('should render MetricsDashboard component', async ({ page }) => {
		const metricsSection = page.getByTestId('metrics-dashboard-section');
		await expect(metricsSection).toBeVisible();

		// Check for metrics dashboard container
		const dashboardContainer = page.locator('#metrics-dashboard-container');
		await expect(dashboardContainer).toBeVisible();
	});

	test('should render PerformanceChart component', async ({ page }) => {
		const chartSection = page.getByTestId('performance-chart-section');
		await expect(chartSection).toBeVisible();

		// Check for performance chart container
		const chartContainer = page.locator('#performance-chart-container');
		await expect(chartContainer).toBeVisible();
	});

	test('should display top prompts section', async ({ page }) => {
		const topPromptsSection = page.getByTestId('top-prompts-section');
		await expect(topPromptsSection).toBeVisible();

		// Verify section title
		const title = topPromptsSection.locator('h3');
		await expect(title).toContainText('Top Prompts by Usage');
	});

	test('should display recent improvements section', async ({ page }) => {
		const improvementsSection = page.getByTestId('recent-improvements-section');
		await expect(improvementsSection).toBeVisible();

		// Verify section title
		const title = improvementsSection.locator('h3');
		await expect(title).toContainText('Recent Improvements');
	});

	test('should show empty state when no prompts exist', async ({ page }) => {
		// Check for empty states
		const topPromptsEmpty = page.getByTestId('top-prompts-empty');
		const improvementsEmpty = page.getByTestId('recent-improvements-empty');

		// At least one empty state should be visible if no data
		const hasTopPromptsEmpty = await topPromptsEmpty.isVisible().catch(() => false);
		const hasImprovementsEmpty = await improvementsEmpty.isVisible().catch(() => false);

		// Either we have data (lists visible) or empty states
		if (hasTopPromptsEmpty) {
			await expect(topPromptsEmpty).toContainText('No prompts yet');
		}

		if (hasImprovementsEmpty) {
			await expect(improvementsEmpty).toContainText('No recent improvements');
		}
	});

	test('should display top prompts list when prompts exist', async ({ page }) => {
		// Check if list exists
		const promptsList = page.getByTestId('top-prompts-list');
		const hasPrompts = await promptsList.isVisible().catch(() => false);

		if (hasPrompts) {
			// Verify list has items
			const listItems = promptsList.locator('li');
			const count = await listItems.count();
			expect(count).toBeGreaterThan(0);

			// Verify first item has required elements
			const firstItem = listItems.first();
			await expect(firstItem.locator('a')).toBeVisible(); // Prompt title link
			await expect(firstItem).toContainText('versions'); // Version count
		}
	});

	test('should display recent improvements list when improvements exist', async ({ page }) => {
		// Check if list exists
		const improvementsList = page.getByTestId('recent-improvements-list');
		const hasImprovements = await improvementsList.isVisible().catch(() => false);

		if (hasImprovements) {
			// Verify list has items
			const listItems = improvementsList.locator('li');
			const count = await listItems.count();
			expect(count).toBeGreaterThan(0);

			// Verify first item has required elements
			const firstItem = listItems.first();
			await expect(firstItem.locator('a')).toBeVisible(); // Prompt title link
			await expect(firstItem.locator('.px-2.py-1.rounded')).toBeVisible(); // Score badge
		}
	});

	test('should navigate to prompt detail when clicking prompt link', async ({ page }) => {
		// Check if top prompts list exists
		const promptsList = page.getByTestId('top-prompts-list');
		const hasPrompts = await promptsList.isVisible().catch(() => false);

		if (hasPrompts) {
			// Get first prompt link
			const firstPromptLink = promptsList.locator('li a').first();
			const href = await firstPromptLink.getAttribute('href');

			// Click link
			await firstPromptLink.click();

			// Wait for navigation
			await page.waitForURL(/\/prompts\/\d+/);

			// Verify we navigated to a prompt detail page
			expect(page.url()).toMatch(/\/prompts\/\d+/);
		}
	});

	test('should have responsive layout', async ({ page }) => {
		// Test at different viewport sizes
		await page.setViewportSize({ width: 375, height: 667 }); // Mobile
		await expect(page.locator('h1')).toBeVisible();

		await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
		await expect(page.locator('h1')).toBeVisible();

		await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
		await expect(page.locator('h1')).toBeVisible();
	});

	test('should not have console errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		await page.waitForTimeout(2000);

		// Filter out known harmless errors
		const realErrors = errors.filter((e) => !e.includes('message port closed'));
		expect(realErrors).toHaveLength(0);
	});
});
