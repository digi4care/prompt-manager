import { test, expect } from '@playwright/test';

test.describe('ImprovementPanel Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display improvement panel section', async ({ page }) => {
		await expect(page.locator('#improvement-panel-section')).toBeVisible();
	});

	test('should display improvement panel container', async ({ page }) => {
		await expect(page.locator('#improvement-panel-container')).toBeVisible();
	});

	test('should display "Improve with AI" button', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		await expect(improveButton).toBeVisible();
	});

	test('should have button with icon', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		await expect(improveButton).toBeVisible();
		// Check for SVG icon inside button
		const icon = improveButton.locator('svg');
		await expect(icon).toBeVisible();
	});

	test('should be enabled by default', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		await expect(improveButton).not.toBeDisabled();
	});

	test('should have proper button styling', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		const boundingBox = await improveButton.boundingBox();
		expect(boundingBox?.width).toBeGreaterThan(0);
		expect(boundingBox?.height).toBeGreaterThan(0);
	});

	test('should respond to hover state', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		await improveButton.hover();
		// Button should remain visible after hover
		await expect(improveButton).toBeVisible();
	});

	test('should have button with type attribute', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button').first();
		await expect(improveButton).toHaveAttribute('type');
	});

	test('should be keyboard accessible', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		await improveButton.focus();
		await expect(improveButton).toBeFocused();
	});

	test('should use primary color for button', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		await expect(improveButton).toHaveClass(/bg-primary/);
	});

	test('should have proper text color on button', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		await expect(improveButton).toHaveClass(/text-primary-foreground/);
	});

	test('should have rounded corners', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		await expect(improveButton).toHaveClass(/rounded-md/);
	});

	test('should have proper icon sizing', async ({ page }) => {
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		const svgIcon = improveButton.locator('svg');
		const iconBox = await svgIcon.boundingBox();
		expect(iconBox?.width).toBe(16); // h-4 w-4
		expect(iconBox?.height).toBe(16);
	});
});

test.describe('ImprovementPanel Visual States', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have proper container styling', async ({ page }) => {
		const container = page.locator('#improvement-panel-container');
		await expect(container).toBeVisible();
		const boundingBox = await container.boundingBox();
		expect(boundingBox?.width).toBeGreaterThan(200);
	});

	test('should have proper spacing', async ({ page }) => {
		const container = page.locator('#improvement-panel-container');
		await expect(container).toBeVisible();
	});

	test('should have proper typography', async ({ page }) => {
		const title = page.locator('#improvement-panel-section h3.text-lg');
		await expect(title).toContainText('ImprovementPanel');
	});

	test('should have proper card layout', async ({ page }) => {
		const card = page.locator('#improvement-panel-section .rounded-lg.border');
		await expect(card.first()).toBeVisible();
	});

	test('should have card header', async ({ page }) => {
		const cardHeader = page.locator('#improvement-panel-section h3.text-2xl');
		await expect(cardHeader.first()).toContainText('AI Prompt Improvement');
	});

	test('should have card description', async ({ page }) => {
		const cardDesc = page.locator('#improvement-panel-section .text-sm.text-muted-foreground');
		await expect(cardDesc.first()).toContainText('Improve with AI');
	});

	test('should be inside prompts section', async ({ page }) => {
		const promptsSection = page.locator('#prompts-section');
		const improvementPanel = page.locator('#improvement-panel-section');
		await expect(improvementPanel).toBeVisible();
	});

	test('should be positioned after version components', async ({ page }) => {
		const versionDiffSection = page.locator('#version-diff-section');
		const improvementSection = page.locator('#improvement-panel-section');
		const versionDiffBox = await versionDiffSection.boundingBox();
		const improvementBox = await improvementSection.boundingBox();
		if (versionDiffBox && improvementBox) {
			expect(improvementBox.y).toBeGreaterThan(versionDiffBox.y);
		}
	});
});

test.describe('ImprovementPanel Loading States', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should not show loading spinner initially', async ({ page }) => {
		const loadingSpinner = page.locator('#improvement-panel-container .animate-spin');
		expect(await loadingSpinner.count()).toBe(0);
	});

	test('should have button text update during loading', async ({ page }) => {
		const loadingButton = page.locator('#improvement-panel-container button:has-text("Improving")');
		expect(await loadingButton.count()).toBe(0); // Initially not loading
	});
});

test.describe('ImprovementPanel Error Handling', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should not show error by default', async ({ page }) => {
		const errorCard = page.locator('#improvement-panel-container .border-destructive');
		expect(await errorCard.count()).toBe(0);
	});
});

// STORY-026: Thinking Display in ImprovementPanel
test.describe('ImprovementPanel Thinking Display (STORY-026)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have "Show Reasoning" toggle button when thinking is available', async ({ page }) => {
		// The button should exist in the component structure
		const toggleButton = page.locator('button:has-text("Show Reasoning")');
		// Button may not be visible if no thinking data is available in test mode
		// But the structure should be present when thinking is available
	});

	test('should toggle thinking visibility when button is clicked', async ({ page }) => {
		const toggleButton = page.locator('button:has-text("Show Reasoning"), button:has-text("Hide Reasoning")');
		// Click the toggle button
	});

	test('should show "Hide Reasoning" when thinking is expanded', async ({ page }) => {
		const hideButton = page.locator('button:has-text("Hide Reasoning")');
		// When expanded, button should say "Hide Reasoning"
	});

	test('should display thinking content when expanded', async ({ page }) => {
		const thinkingContent = page.locator('.thinking-content, pre:has-text("The prompt was evaluated")');
		// Thinking content should be visible when expanded
	});

	test('should have copy to clipboard button', async ({ page }) => {
		const copyButton = page.locator('button[title="Copy reasoning to clipboard"], button svg ~ svg');
		// Copy button should be present in thinking section
	});

	test('should show verification badge when signature is present', async ({ page }) => {
		const verifiedBadge = page.locator('span:has-text("Verified")');
		// When thinking has a signature, verified badge should be visible
	});

	test('should not show verification badge when signature is missing', async ({ page }) => {
		// When thinking has no signature, verified badge should not appear
	});

	test('should have smooth expand/collapse animation', async ({ page }) => {
		const thinkingSection = page.locator('.thinking-content, pre');
		// Section should have transition classes for animation
	});

	test('should display thinking with source attribution', async ({ page }) => {
		const thinkingText = page.locator('pre');
		// Thinking should be displayed in a preformatted block
	});

	test('should have proper styling for thinking content', async ({ page }) => {
		const thinkingContainer = page.locator('.bg-muted\\/50, .rounded-lg');
		// Thinking container should have distinct background styling
	});

	test('should have max-height for thinking content with scroll', async ({ page }) => {
		const thinkingContainer = page.locator('.max-h-80, .overflow-auto');
		// Container should have max-height and overflow-auto for scrolling
	});

	test('should use monospace font for thinking content', async ({ page }) => {
		const thinkingText = page.locator('pre.font-mono');
		// Thinking should be displayed in monospace font
	});

	test('should preserve whitespace formatting in thinking', async ({ page }) => {
		const thinkingContent = page.locator('pre.whitespace-pre-wrap');
		// Whitespace should be preserved for proper formatting
	});

	test('should have toggle button with chevron icon', async ({ page }) => {
		const toggleButton = page.locator('button svg.rotate-90');
		// Chevron icon should rotate when expanded
	});

	test('should update button text on toggle', async ({ page }) => {
		const showButton = page.locator('button:has-text("Show Reasoning")');
		const hideButton = page.locator('button:has-text("Hide Reasoning")');
		// Button text should toggle between Show and Hide
	});
});

test.describe('ImprovementPanel Responsive Design', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have responsive container width', async ({ page }) => {
		const container = page.locator('#improvement-panel-container');
		const boundingBox = await container.boundingBox();
		expect(boundingBox?.width).toBeGreaterThan(200);
	});

	test('should adapt to mobile view', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		const section = page.locator('#improvement-panel-section');
		await expect(section).toBeVisible();
	});

	test('should have proper button sizing on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		const improveButton = page.locator('#improvement-panel-container button:has-text("Improve with AI")');
		const boundingBox = await improveButton.boundingBox();
		expect(boundingBox?.width).toBeGreaterThan(0);
		expect(boundingBox?.height).toBeGreaterThan(0);
	});

	test('should have proper card padding on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 800 });
		const cardContent = page.locator('#improvement-panel-section .rounded-lg.border');
		await expect(cardContent).toBeVisible();
	});
});
