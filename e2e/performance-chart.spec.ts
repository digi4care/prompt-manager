import { test, expect } from '@playwright/test';

// Console error checking helper
// This helper captures console errors during test execution and fails if unexpected errors occur
// Known harmless errors (like Chrome message port issues) are filtered out
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
		// Filter out known harmless Chrome/Playwright errors
		const realErrors = errors.filter((e) => !e.includes('message port closed'));
		expect(realErrors).toHaveLength(0);
	};
}

test.describe('PerformanceChart Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	// Check for console errors - documentation: all UI tests should verify no JS errors
	test('should not have console errors', async ({ page }) => {
		const cleanup = setupConsoleErrorCheck(page);
		try {
			await page.waitForTimeout(2000);
		} finally {
			await cleanup();
		}
	});

	test('should display performance chart section', async ({ page }) => {
		await expect(page.locator('#performance-chart-section')).toBeVisible();
	});

	test('should display title', async ({ page }) => {
		await expect(
			page.locator('#performance-chart-section >> text=PerformanceChart Component').first()
		).toBeVisible();
	});

	test('should display description', async ({ page }) => {
		const section = page.locator('#performance-chart-section');
		await expect(section.locator('text=Performance Metrics').first()).toBeVisible();
	});

	test('should display container with chart', async ({ page }) => {
		await expect(page.locator('#performance-chart-container').first()).toBeVisible();
	});

	test('should display header with title', async ({ page }) => {
		const section = page.locator('#performance-chart-section');
		await expect(section.locator('h3').first()).toContainText('PerformanceChart Component');
	});

	test('should display Performance Metrics heading', async ({ page }) => {
		const section = page.locator('#performance-chart-container').first();
		await expect(section.locator('h3').first()).toContainText('Performance Metrics');
	});

	test('should have date range filter buttons', async ({ page }) => {
		const container = page.locator('#performance-chart-container').first();
		await expect(container.locator('button:has-text("7D")').first()).toBeVisible();
		await expect(container.locator('button:has-text("30D")').first()).toBeVisible();
		await expect(container.locator('button:has-text("90D")').first()).toBeVisible();
		await expect(container.locator('button:has-text("All")').first()).toBeVisible();
	});

	test('should have export button', async ({ page }) => {
		const container = page.locator('#performance-chart-container').first();
		const exportButton = container.locator('button[aria-label="Export chart data"]').first();
		await expect(exportButton).toBeVisible();
	});

	test('should display quality scores section', async ({ page }) => {
		const container = page.locator('#performance-chart-container').first();
		await expect(container.locator('text=Quality Scores Over Time').first()).toBeVisible();
	});

	test('should display usage counts section', async ({ page }) => {
		const container = page.locator('#performance-chart-container').first();
		await expect(container.locator('text=Usage Counts').first()).toBeVisible();
	});
});

test.describe('PerformanceChart Chart Rendering', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should render quality chart canvas', async ({ page }) => {
		const container = page.locator('#performance-chart-container').first();
		const canvas = container.locator('canvas').first();
		await expect(canvas).toBeVisible({ timeout: 10000 });
	});

	test('should render usage chart canvas', async ({ page }) => {
		const container = page.locator('#performance-chart-container').first();
		const canvases = container.locator('canvas');
		await expect(canvases.nth(1)).toBeVisible({ timeout: 10000 });
	});

	test('should have 4 range filter buttons', async ({ page }) => {
		const container = page.locator('#performance-chart-container').first();
		const buttons = container.locator('.flex.items-center.gap-1 button');
		await expect(buttons).toHaveCount(4);
	});
});

test.describe('PerformanceChart Empty State', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display empty state section', async ({ page }) => {
		await expect(page.locator('#performance-chart-empty-container').first()).toBeVisible();
	});

	test('should show no quality data message', async ({ page }) => {
		// Check for the "No quality data" text in the empty state
		const container = page.locator('#performance-chart-empty-container').first();
		await expect(container.locator('text=/^No quality data available$/i').first()).toBeVisible();
	});

	test('should show guidance text for quality data', async ({ page }) => {
		const container = page.locator('#performance-chart-empty-container').first();
		await expect(
			container.locator('text=Complete AI improvements to see quality trends').first()
		).toBeVisible();
	});

	test('should show no usage data message', async ({ page }) => {
		const container = page.locator('#performance-chart-empty-container').first();
		// Check for the "No usage data" text - may be in SVG or text
		await expect(container.locator('text=/^No usage data available$/i').first()).toBeVisible();
	});

	test('should show guidance text for usage data', async ({ page }) => {
		const container = page.locator('#performance-chart-empty-container').first();
		await expect(
			container.locator('text=Usage data will appear as prompts are used').first()
		).toBeVisible();
	});

	test('should show icon or visual indicator in empty state', async ({ page }) => {
		const container = page.locator('#performance-chart-empty-container').first();
		// Check for empty state container which has visual indicators
		const emptyStateCards = container.locator('.rounded-lg.border.bg-card');
		await expect(emptyStateCards.first()).toBeVisible();
	});
});

test.describe('PerformanceChart Toolbar Functionality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have clickable 7D button', async ({ page }) => {
		const button = page
			.locator('#performance-chart-container')
			.first()
			.locator('button:has-text("7D")')
			.first();
		await button.click();
		await expect(button).toBeVisible();
	});

	test('should have clickable 30D button', async ({ page }) => {
		const button = page
			.locator('#performance-chart-container')
			.first()
			.locator('button:has-text("30D")')
			.first();
		await button.click();
		await expect(button).toBeVisible();
	});

	test('should have clickable 90D button', async ({ page }) => {
		const button = page
			.locator('#performance-chart-container')
			.first()
			.locator('button:has-text("90D")')
			.first();
		await button.click();
		await expect(button).toBeVisible();
	});

	test('should have clickable All button', async ({ page }) => {
		const button = page
			.locator('#performance-chart-container')
			.first()
			.locator('button:has-text("All")')
			.first();
		await button.click();
		await expect(button).toBeVisible();
	});

	test('should have clickable export button', async ({ page }) => {
		const exportButton = page
			.locator('#performance-chart-container')
			.first()
			.locator('button[aria-label="Export chart data"]')
			.first();
		await exportButton.click();
		await expect(exportButton).toBeVisible();
	});
});

test.describe('PerformanceChart Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have accessible export button', async ({ page }) => {
		const exportButton = page
			.locator('#performance-chart-container')
			.first()
			.locator('button[aria-label="Export chart data"]')
			.first();
		await expect(exportButton).toHaveAttribute('aria-label');
	});

	test('should have descriptive title', async ({ page }) => {
		const section = page.locator('#performance-chart-container').first();
		await expect(section.locator('h3').first()).toContainText('Performance Metrics');
	});

	test('should have chart sections with headings', async ({ page }) => {
		const section = page.locator('#performance-chart-container').first();
		await expect(section.locator('h4').first()).toContainText('Quality Scores Over Time');
		await expect(section.locator('h4').nth(1)).toContainText('Usage Counts');
	});
});

test.describe('PerformanceChart Responsive Design', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have responsive container width', async ({ page }) => {
		const container = page.locator('#performance-chart-container').first();
		const boundingBox = await container.boundingBox();
		expect(boundingBox?.width).toBeGreaterThan(200);
	});

	test('should display on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/test');
		await expect(page.locator('#performance-chart-section')).toBeVisible();
	});

	test('should display on tablet viewport', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/test');
		await expect(page.locator('#performance-chart-section')).toBeVisible();
	});
});

test.describe('MetricsDashboard Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display metrics dashboard section', async ({ page }) => {
		await expect(page.locator('#metrics-dashboard-section')).toBeVisible();
	});

	test('should display title', async ({ page }) => {
		await expect(
			page.locator('#metrics-dashboard-section >> text=MetricsDashboard Component').first()
		).toBeVisible();
	});

	test('should display container', async ({ page }) => {
		await expect(page.locator('#metrics-dashboard-container').first()).toBeVisible();
	});

	test('should have header with title', async ({ page }) => {
		const section = page.locator('#metrics-dashboard-section');
		await expect(section.locator('h3').first()).toContainText('MetricsDashboard Component');
	});

	test('should display Metrics Dashboard heading', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('h2').first()).toContainText('Metrics Dashboard');
	});

	test('should have export button', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		const exportButton = container.locator('button:has-text("Export Data")');
		await expect(exportButton).toBeVisible();
	});

	test('should display Total Prompts metric', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=Total Prompts').first()).toBeVisible();
	});

	test('should display Total Versions metric', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=Total Versions').first()).toBeVisible();
	});

	test('should display Avg Quality Score metric', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=Avg Quality Score').first()).toBeVisible();
	});

	test('should display Last Activity metric', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=Last Activity').first()).toBeVisible();
	});
});

test.describe('MetricsDashboard Metric Values', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display total prompts value', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=24').first()).toBeVisible();
	});

	test('should display total versions value', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=156').first()).toBeVisible();
	});

	test('should display average quality score value', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=75%').first()).toBeVisible();
	});

	test('should display improvements this week', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=8').first()).toBeVisible();
	});

	test('should display active prompts count', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=20').first()).toBeVisible();
	});
});

test.describe('MetricsDashboard Trend Indicators', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display trend icons', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		// Should have trending up icons for positive trends
		const svgIcons = container.locator('svg');
		expect(await svgIcons.count()).toBeGreaterThan(0);
	});

	test('should display progress bar for quality score', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		const progressBar = container.locator('.h-2.rounded-full.bg-muted >> .. >> .h-2.rounded-full');
		await expect(progressBar.first()).toBeVisible();
	});

	test('should show active prompts subtitle', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=active').first()).toBeVisible();
	});

	test('should show activity trend', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('text=Increasing activity').first()).toBeVisible();
	});
});

test.describe('MetricsDashboard Empty State', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display empty state section', async ({ page }) => {
		await expect(page.locator('#metrics-dashboard-empty-container').first()).toBeVisible();
	});

	test('should show empty metrics card', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-empty-container').first();
		await expect(container.locator('.rounded-lg.border.bg-card').first()).toBeVisible();
	});

	test('should show no metrics message', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-empty-container').first();
		await expect(container.locator('text=No metrics yet').first()).toBeVisible();
	});

	test('should show guidance text', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-empty-container').first();
		await expect(
			container.locator('text=Create prompts and use AI improvements').first()
		).toBeVisible();
	});
});

test.describe('MetricsDashboard Toolbar Functionality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have clickable export button', async ({ page }) => {
		const exportButton = page
			.locator('#metrics-dashboard-container')
			.first()
			.locator('button:has-text("Export Data")');
		await exportButton.click();
		await expect(exportButton).toBeVisible();
	});

	test('should have enabled export button by default', async ({ page }) => {
		const exportButton = page
			.locator('#metrics-dashboard-container')
			.first()
			.locator('button:has-text("Export Data")');
		await expect(exportButton).not.toBeDisabled();
	});
});

test.describe('MetricsDashboard Accessibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have accessible export button', async ({ page }) => {
		const exportButton = page
			.locator('#metrics-dashboard-container')
			.first()
			.locator('button[aria-label="Export metrics data"]');
		await expect(exportButton).toHaveAttribute('aria-label');
	});

	test('should have descriptive title', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		await expect(container.locator('h2').first()).toContainText('Metrics Dashboard');
	});

	test('should have proper heading structure', async ({ page }) => {
		const section = page.locator('#metrics-dashboard-section');
		await expect(section.locator('h3').first()).toContainText('MetricsDashboard Component');
	});

	test('should have metric cards with proper labels', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		const cards = container.locator('.rounded-lg.border.bg-card');
		expect(await cards.count()).toBeGreaterThanOrEqual(4);
	});
});

test.describe('MetricsDashboard Responsive Design', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have responsive grid layout', async ({ page }) => {
		const container = page.locator('#metrics-dashboard-container').first();
		const boundingBox = await container.boundingBox();
		expect(boundingBox?.width).toBeGreaterThan(200);
	});

	test('should display on mobile viewport', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/test');
		await expect(page.locator('#metrics-dashboard-section')).toBeVisible();
	});

	test('should display on tablet viewport', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/test');
		await expect(page.locator('#metrics-dashboard-section')).toBeVisible();
	});
});
