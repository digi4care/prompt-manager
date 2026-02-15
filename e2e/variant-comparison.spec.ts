import { test, expect } from '@playwright/test';

test.describe('VariantComparison Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display component section', async ({ page }) => {
		// Verify component section exists
		const section = page.locator('#variant-comparison-section');
		await expect(section).toBeVisible();

		// Verify section title
		await expect(section.getByText('VariantComparison Component')).toBeVisible();
	});

	test('should render parent version header', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// Verify parent version is displayed (look for "Parent" text)
		await expect(section.getByText('Parent').first()).toBeVisible();
		// Check for version in the header (uses font-mono class)
		const versionText = section.locator('.font-mono').first();
		await expect(versionText).toBeVisible();
	});

	test('should render variant cards', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// Verify variant cards are rendered - at least one variant should be visible
		await expect(section.getByText('Variant 1').first()).toBeVisible();
		await expect(section.getByText('Variant 2').first()).toBeVisible();
	});

	test('should display score badges for each variant', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// Verify score badges exist (role="status")
		const scoreBadges = section.locator('[role="status"]');
		await expect(scoreBadges.first()).toBeVisible();

		// Verify there are score badges (one per variant)
		const badgeCount = await scoreBadges.count();
		expect(badgeCount).toBeGreaterThanOrEqual(3);
	});

	test('should display score breakdown for each variant', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// Verify progress bars exist for each criterion
		const progressBars = section.locator('[role="progressbar"]');
		await expect(progressBars.first()).toBeVisible();

		// Should have progress bars for clarity, completeness, specificity for each variant
		const barCount = await progressBars.count();
		expect(barCount).toBeGreaterThanOrEqual(6); // 2 variants × 3 criteria

		// Verify criterion labels
		await expect(section.getByText('Clarity').first()).toBeVisible();
		await expect(section.getByText('Completeness').first()).toBeVisible();
		await expect(section.getByText('Specificity').first()).toBeVisible();
	});

	test('should have select buttons for each variant', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// Verify select buttons exist
		const selectButtons = section.getByRole('button', { name: /Select as New Version/i });
		await expect(selectButtons.first()).toBeVisible();

		// Should have select button for each variant
		const buttonCount = await selectButtons.count();
		expect(buttonCount).toBeGreaterThanOrEqual(2);
	});

	test('should have reject all button', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// Verify reject all button
		await expect(section.getByRole('button', { name: /Reject All/i })).toBeVisible();
	});

	test('should render empty state when no variants', async ({ page }) => {
		const emptySection = page.locator('#variant-comparison-empty');

		// Verify empty state message
		await expect(emptySection.getByText('No variants generated yet')).toBeVisible();
		await expect(emptySection.getByText('Run the improvement process to generate variants')).toBeVisible();
	});

	test('should be responsive on different screen sizes', async ({ page }) => {
		// Test on mobile viewport
		await page.setViewportSize({ width: 375, height: 800 });
		await page.reload();

		const section = page.locator('#variant-comparison-section');
		await expect(section).toBeVisible();

		// Verify variant cards are still visible
		await expect(section.getByText('Variant 1').first()).toBeVisible();
	});

	test('should display Best Score badge on highest scoring variant', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// Variant 1 has highest score (95) so should have Best Score badge
		const bestScoreBadges = section.getByText('Best Score');
		await expect(bestScoreBadges.first()).toBeVisible();
	});

	test('should have proper accessibility attributes', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// Verify ARIA labels on score badges
		const scoreBadges = section.locator('[role="status"]');
		const firstBadge = scoreBadges.first();
		await expect(firstBadge).toHaveAttribute('aria-label');

		// Verify list role
		await expect(section.locator('[role="list"]').first()).toBeVisible();
	});

	test('should display score color indicators', async ({ page }) => {
		const section = page.locator('#variant-comparison-section');

		// First variant has high scores (should have green indicators)
		const greenBars = section.locator('.bg-green-500');
		await expect(greenBars.first()).toBeVisible();

		// Third variant has low scores (should have red indicators)
		const redBars = section.locator('.bg-red-500');
		await expect(redBars.first()).toBeVisible();
	});
});
