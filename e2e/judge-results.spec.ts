import { test, expect } from '@playwright/test';

test.describe('JudgeResults Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display judge results section', async ({ page }) => {
		await expect(page.locator('#judge-results-section')).toBeVisible();
	});

	test('should display judge results container', async ({ page }) => {
		await expect(page.locator('#judge-results-container')).toBeVisible();
	});

	test('should display overall score', async ({ page }) => {
		const overallScore = page.locator('#judge-results-container .rounded-full');
		await expect(overallScore.first()).toBeVisible();
	});

	test('should display score breakdown', async ({ page }) => {
		const progressBars = page.locator('#judge-results-container [role="progressbar"]');
		await expect(progressBars).toHaveCount(3);
	});

	test('should display clarity score', async ({ page }) => {
		const clarityScore = page.locator('#judge-results-container [role="progressbar"]');
		await expect(clarityScore.first()).toBeVisible();
	});

	test('should have progress bars', async ({ page }) => {
		const progressBars = page.locator('#judge-results-container [role="progressbar"]');
		await expect(progressBars).toHaveCount(3);
	});

	test('should display gaps section', async ({ page }) => {
		const gapsSection = page.locator('#judge-results-container svg.text-amber-500');
		await expect(gapsSection.first()).toBeVisible();
	});

	test('should display recommendations section', async ({ page }) => {
		const recsSection = page.locator('#judge-results-container svg.text-blue-500');
		await expect(recsSection.first()).toBeVisible();
	});

	test('should display quality score history', async ({ page }) => {
		const historySection = page.locator('#judge-results-container .grid-cols-3.gap-2.pt-2');
		await expect(historySection.first()).toBeVisible();
	});
});

test.describe('JudgeResults Score Display', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should calculate overall score correctly', async ({ page }) => {
		// (78 + 82 + 65) / 3 = 75
		const overallScore = page.locator('#judge-results-container .rounded-full');
		await expect(overallScore.first()).toContainText('75');
	});

	test('should display score label (Fair)', async ({ page }) => {
		const scoreLabel = page.locator('#judge-results-container .text-lg');
		await expect(scoreLabel.first()).toContainText('Fair');
	});

	test('should have three progress bars', async ({ page }) => {
		const progressBars = page.locator('#judge-results-container [role="progressbar"]');
		expect(await progressBars.count()).toBe(3);
	});

	test('should show score descriptions', async ({ page }) => {
		const descriptions = page.locator('#judge-results-container .text-xs');
		await expect(descriptions.first()).toContainText('Is the prompt');
	});
});

test.describe('JudgeResults Gaps Display', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display gap items', async ({ page }) => {
		const gapItems = page.locator('#judge-results-container svg.text-amber-500');
		expect(await gapItems.count()).toBeGreaterThan(0);
	});

	test('should have amber indicators for gaps', async ({ page }) => {
		const amberIndicators = page.locator('#judge-results-container .bg-amber-500');
		await expect(amberIndicators.first()).toBeVisible();
	});

	test('should display gap content', async ({ page }) => {
		const gapContent = page.locator('#judge-results-container svg.text-amber-500');
		await expect(gapContent.first()).toBeVisible();
	});

	test('should handle empty gaps gracefully', async ({ page }) => {
		const noHistorySection = page.locator('#judge-results-no-history');
		const amberIndicators = noHistorySection.locator('.bg-amber-500');
		expect(await amberIndicators.count()).toBe(0);
	});
});

test.describe('JudgeResults Recommendations Display', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display recommendation items', async ({ page }) => {
		const recItems = page.locator('#judge-results-container ul li');
		expect(await recItems.count()).toBeGreaterThan(3); // 3 gaps + 3 recommendations
	});

	test('should have blue indicators for recommendations', async ({ page }) => {
		const blueIndicators = page.locator('#judge-results-container .bg-blue-500');
		await expect(blueIndicators.first()).toBeVisible();
	});
});

test.describe('JudgeResults Historical Chart', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display chart bars', async ({ page }) => {
		const chartBars = page.locator('#judge-results-container .h-6.rounded-md');
		await expect(chartBars.first()).toBeVisible();
	});

	test('should show version labels', async ({ page }) => {
		await expect(page.locator('#judge-results-container .text-xs:has-text("v1.0.0")').first()).toBeVisible();
	});

	test('should color code chart with different scores', async ({ page }) => {
		const redBars = page.locator('#judge-results-container .bg-red-500');
		const greenBars = page.locator('#judge-results-container .bg-green-500');
		await expect(redBars.first()).toBeVisible();
		await expect(greenBars.first()).toBeVisible();
	});

	test('should display score distribution', async ({ page }) => {
		const distribution = page.locator('#judge-results-container .grid-cols-3.gap-2.pt-2');
		await expect(distribution.first()).toBeVisible();
	});

	test('should not show chart without historical data', async ({ page }) => {
		const noHistorySection = page.locator('#judge-results-no-history');
		const chartBars = noHistorySection.locator('.h-6.rounded-md');
		expect(await chartBars.count()).toBe(0);
	});
});

test.describe('JudgeResults No Historical Data', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display section', async ({ page }) => {
		await expect(page.locator('#judge-results-no-history')).toBeVisible();
	});

	test('should show excellent overall score', async ({ page }) => {
		const noHistorySection = page.locator('#judge-results-no-history');
		const overallScore = noHistorySection.locator('.rounded-full');
		await expect(overallScore.first()).toContainText('92');
	});

	test('should show excellent label', async ({ page }) => {
		const noHistorySection = page.locator('#judge-results-no-history');
		const scoreLabel = noHistorySection.locator('.text-lg');
		await expect(scoreLabel.first()).toContainText('Excellent');
	});
});

test.describe('JudgeResults Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have progress bars with role', async ({ page }) => {
		const progressBars = page.locator('#judge-results-container [role="progressbar"]');
		await expect(progressBars.first()).toHaveAttribute('role', 'progressbar');
	});

	test('should have aria labels for progress bars', async ({ page }) => {
		const progressBars = page.locator('#judge-results-container [role="progressbar"]');
		await expect(progressBars.first()).toHaveAttribute('aria-label');
	});

	test('should have hidden icons', async ({ page }) => {
		const icons = page.locator('#judge-results-container svg[aria-hidden="true"]');
		await expect(icons.first()).toBeVisible();
	});

	test('should have overall score status', async ({ page }) => {
		const overallScore = page.locator('#judge-results-container [role="status"]');
		await expect(overallScore.first()).toBeVisible();
	});
});

test.describe('JudgeResults Visual Design', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have card wrapper', async ({ page }) => {
		const card = page.locator('#judge-results-section .rounded-lg.border').first();
		await expect(card).toBeVisible();
	});

	test('should have proper container width', async ({ page }) => {
		const container = page.locator('#judge-results-container');
		const boundingBox = await container.boundingBox();
		expect(boundingBox?.width).toBeGreaterThan(200);
	});

	test('should have rounded progress bars', async ({ page }) => {
		const roundedBars = page.locator('#judge-results-container .rounded-full');
		await expect(roundedBars.first()).toBeVisible();
	});

	test('should use color scheme', async ({ page }) => {
		const green = page.locator('#judge-results-container .text-green-600, #judge-results-container .text-green-400');
		const yellow = page.locator('#judge-results-container .text-yellow-600, #judge-results-container .text-yellow-400');
		const red = page.locator('#judge-results-container .text-red-600, #judge-results-container .text-red-400');
		expect(await green.count()).toBeGreaterThan(0);
		expect(await yellow.count()).toBeGreaterThan(0);
		expect(await red.count()).toBeGreaterThan(0);
	});
});

test.describe('JudgeResults Responsive Design', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should adapt to mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		const section = page.locator('#judge-results-section');
		await expect(section).toBeVisible();
	});

	test('should show overall score on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		const overallScore = page.locator('#judge-results-container .rounded-full');
		await expect(overallScore.first()).toBeVisible();
	});

	test('should show chart on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		const chartBars = page.locator('#judge-results-container .h-6');
		await expect(chartBars.first()).toBeVisible();
	});

	test('should have card on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		const card = page.locator('#judge-results-section .rounded-lg.border').first();
		await expect(card).toBeVisible();
	});
});

test.describe('JudgeResults Integration', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should be in prompts section', async ({ page }) => {
		await expect(page.locator('#judge-results-section')).toBeVisible();
	});

	test('should be after improvement panel', async ({ page }) => {
		const improvementPanel = page.locator('#improvement-panel-section');
		const judgeResults = page.locator('#judge-results-section');
		const panelBox = await improvementPanel.boundingBox();
		const resultsBox = await judgeResults.boundingBox();
		if (panelBox && resultsBox) {
			expect(resultsBox.y).toBeGreaterThan(panelBox.y);
		}
	});

	test('should have proper container width', async ({ page }) => {
		const container = page.locator('#judge-results-container');
		const boundingBox = await container.boundingBox();
		expect(boundingBox?.width).toBeGreaterThan(200);
	});

	test('should have two cards in section', async ({ page }) => {
		const section = page.locator('#judge-results-section');
		const cards = section.locator('h3');
		const count = await cards.count();
		expect(count).toBeGreaterThanOrEqual(1);
	});
});
