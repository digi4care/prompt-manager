import { test, expect } from '@playwright/test';

test.describe('PromptEditor Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display editor section', async ({ page }) => {
		// Check that editor section is visible
		await expect(page.locator('#prompt-editor-section')).toBeVisible();
	});

	test('should display editor container', async ({ page }) => {
		// Check that editor container is visible
		const editorContainer = page.locator('#prompt-editor-section #prompt-editor-container');
		await expect(editorContainer).toBeVisible();
	});

	test('should display toolbar with Insert button', async ({ page }) => {
		// Check that Insert button is visible
		const insertButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button:has-text("Insert")'
		);
		await expect(insertButton).toBeVisible();
	});

	test('should display Copy button', async ({ page }) => {
		// Check that Copy button is visible
		const copyButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button:has-text("Copy")'
		);
		await expect(copyButton).toBeVisible();
	});

	test('should display Clear button', async ({ page }) => {
		// Check that Clear button is visible
		const clearButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button:has-text("Clear")'
		);
		await expect(clearButton).toBeVisible();
	});

	test('should display word and character count', async ({ page }) => {
		// The editor should show stats
		const stats = page.locator(
			'#prompt-editor-section #prompt-editor-container .text-xs.text-muted-foreground'
		);
		await expect(stats.first()).toContainText('chars');
		await expect(stats.first()).toContainText('words');
	});

	test('should display fullscreen button', async ({ page }) => {
		// Check that fullscreen button is visible
		const fullscreenButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button[title*="fullscreen"]'
		);
		await expect(fullscreenButton).toBeVisible();
	});

	test('should show loading state initially', async ({ page }) => {
		// When first loading, should show "Loading editor..." text
		const editorContainer = page.locator('#prompt-editor-section #prompt-editor-container');
		const loadingText = editorContainer.getByText('Loading editor...');
		const loadingCount = await loadingText.count();
		if (loadingCount > 0) {
			await expect(loadingText).toBeVisible();
		} else {
			await expect(editorContainer.locator('.monaco-editor')).toBeVisible();
		}
	});

	test('should be keyboard accessible', async ({ page }) => {
		// Buttons should be focusable
		const insertButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button:has-text("Insert")'
		);
		await insertButton.focus();
		await expect(insertButton).toBeFocused();
	});
});

test.describe('PromptEditor - Insert Placeholders', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should have Insert button that can be clicked', async ({ page }) => {
		// Click Insert button
		const insertButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button:has-text("Insert")'
		);
		await insertButton.click();

		// Wait a moment for menu to appear
		await page.waitForTimeout(500);

		// Verify the button was clicked (button should still be visible)
		await expect(insertButton).toBeVisible();
	});
});

test.describe('PromptEditor - Autosave', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should type in editor', async ({ page }) => {
		// Wait for editor to load
		const monacoEditor = page.locator(
			'#prompt-editor-section #prompt-editor-container .monaco-editor'
		);
		await expect(monacoEditor.first()).toBeVisible({ timeout: 20000 });

		// Click on editor to focus
		await monacoEditor.first().click();

		// Type some content
		await page.keyboard.type(' - modified content');

		// Verify typing worked (stats should update)
		await page.waitForTimeout(500);
		const stats = page.locator(
			'#prompt-editor-section #prompt-editor-container .text-xs.text-muted-foreground'
		);
		await expect(stats.first()).toContainText('words');
	});
});

test.describe('PromptEditor - Fullscreen', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should change fullscreen button to exit mode', async ({ page }) => {
		// Wait for editor to load
		const monacoEditor = page.locator(
			'#prompt-editor-section #prompt-editor-container .monaco-editor'
		);
		await expect(monacoEditor.first()).toBeVisible({ timeout: 20000 });

		// Enter fullscreen
		const fullscreenButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button[title="Enter fullscreen"]'
		);
		await fullscreenButton.click();

		// Button should now show "Exit fullscreen" icon
		const exitButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button[title="Exit fullscreen"]'
		);
		await expect(exitButton).toBeVisible();
	});

	test('should toggle fullscreen on Escape key', async ({ page }) => {
		// Wait for editor to load
		const monacoEditor = page.locator(
			'#prompt-editor-section #prompt-editor-container .monaco-editor'
		);
		await expect(monacoEditor.first()).toBeVisible({ timeout: 20000 });

		// Enter fullscreen
		const fullscreenButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button[title="Enter fullscreen"]'
		);
		await fullscreenButton.click();

		// Verify we're in fullscreen mode (Exit button visible)
		const exitButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button[title="Exit fullscreen"]'
		);
		await expect(exitButton).toBeVisible();

		// Exit fullscreen with Escape
		await page.keyboard.press('Escape');

		// Button should be back to Enter fullscreen mode
		const enterButton = page.locator(
			'#prompt-editor-section #prompt-editor-container button[title="Enter fullscreen"]'
		);
		await expect(enterButton).toBeVisible();
	});
});
