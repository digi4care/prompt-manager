import { test, expect } from '@playwright/test';

test.describe('New Prompt Page (STORY-015)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test.describe('Page Header', () => {
		test('should display new prompt page section', async ({ page }) => {
			await expect(page.locator('#new-prompt-page-section')).toBeVisible();
		});

		test('should show create new prompt header', async ({ page }) => {
			const header = page.locator('#new-prompt-header >> h1:has-text("Create New Prompt")');
			await expect(header).toBeVisible();
		});

		test('should show page description', async ({ page }) => {
			const description = page.locator(
				'#new-prompt-header >> text=Add a new prompt to your collection'
			);
			await expect(description).toBeVisible();
		});

		test('should have Save Prompt button', async ({ page }) => {
			const saveButton = page.locator('#save-button:has-text("Save Prompt")');
			await expect(saveButton).toBeVisible();
		});

		test('should have Cancel button', async ({ page }) => {
			const cancelButton = page.locator(
				'#new-prompt-page-section #cancel-button:has-text("Cancel")'
			);
			await expect(cancelButton).toBeVisible();
		});
	});

	test.describe('Prompt Content Editor', () => {
		test('should display prompt content editor section', async ({ page }) => {
			await expect(page.locator('#prompt-content-editor')).toBeVisible();
		});

		test('should have Monaco editor container', async ({ page }) => {
			const editor = page.locator('#prompt-content-editor .editor-container');
			await expect(editor).toBeVisible();
		});

		test('should have editor toolbar with Insert button', async ({ page }) => {
			const toolbarButton = page.locator('#prompt-content-editor button:has-text("Insert")');
			await expect(toolbarButton).toBeVisible();
		});

		test('should have editor toolbar with Copy button', async ({ page }) => {
			const copyButton = page.locator('#prompt-content-editor button:has-text("Copy")');
			await expect(copyButton).toBeVisible();
		});

		test('should have editor toolbar with Clear button', async ({ page }) => {
			const clearButton = page.locator('#prompt-content-editor button:has-text("Clear")');
			await expect(clearButton).toBeVisible();
		});

		test('should have fullscreen toggle button', async ({ page }) => {
			const fullscreenButton = page.locator(
				'#prompt-content-editor button[title="Enter fullscreen"]'
			);
			await expect(fullscreenButton).toBeVisible();
		});
	});

	test.describe('Prompt Metadata Form', () => {
		test('should display prompt metadata form section', async ({ page }) => {
			await expect(page.locator('#prompt-metadata-form')).toBeVisible();
		});

		test('should have title input field', async ({ page }) => {
			const titleInput = page.locator('#prompt-metadata-form input[id="title"]');
			await expect(titleInput).toBeVisible();
		});

		test('should have description textarea', async ({ page }) => {
			const descriptionTextarea = page.locator('#prompt-metadata-form textarea[id="description"]');
			await expect(descriptionTextarea).toBeVisible();
		});

		test('should have purpose dropdown', async ({ page }) => {
			const purposeSelect = page.locator('#prompt-metadata-form select[id="purpose"]');
			await expect(purposeSelect).toBeVisible();
		});

		test('should have platform selector', async ({ page }) => {
			const providersButton = page.locator('#prompt-metadata-form button#llm-providers');
			await expect(providersButton).toBeVisible();
		});

		test('should have tags input field', async ({ page }) => {
			const tagsInput = page.locator('#prompt-metadata-form input[id="tags"]');
			await expect(tagsInput).toBeVisible();
		});

		test('should have purpose options', async ({ page }) => {
			const purposeSelect = page.locator('#prompt-metadata-form select[id="purpose"]');
			await expect(purposeSelect).toHaveText(/Select purpose/i);
		});

		test('should have platform options', async ({ page }) => {
			const providersButton = page.locator('#prompt-metadata-form button#llm-providers');
			await providersButton.click();
			const searchInput = page.locator(
				'#prompt-metadata-form input[placeholder="Search providers..."]'
			);
			await expect(searchInput).toBeVisible();
		});

		test('should show title required indicator', async ({ page }) => {
			const titleLabel = page.locator('#prompt-metadata-form label[for="title"]');
			await expect(titleLabel).toContainText('*');
		});

		test('should show character count for title', async ({ page }) => {
			const titleInput = page.locator('#prompt-metadata-form input[id="title"]');
			await titleInput.fill('Test Title');
			// After filling, the character count should be visible in a p tag
			const charCount = page.locator('#prompt-metadata-form').locator('p').filter({ hasText: '/' });
			await expect(charCount.first()).toBeVisible();
		});

		test('should show character count for description', async ({ page }) => {
			const descriptionTextarea = page.locator('#prompt-metadata-form textarea[id="description"]');
			await descriptionTextarea.fill('Test description');
			// After filling, the character count should be visible
			const charCount = page.locator('#prompt-metadata-form').locator('p').filter({ hasText: '/' });
			await expect(charCount.last()).toBeVisible();
		});
	});

	test.describe('Tips Section', () => {
		test('should display tips section', async ({ page }) => {
			await expect(page.locator('#tips-section')).toBeVisible();
		});

		test('should show tips icon', async ({ page }) => {
			const tipsIcon = page.locator('#tips-section svg');
			await expect(tipsIcon).toBeVisible();
		});

		test('should have all tips', async ({ page }) => {
			const tipsList = page.locator('#tips-list');
			await expect(tipsList.locator('li:has-text("descriptive titles")')).toBeVisible();
			await expect(tipsList.locator('li:has-text("Add tags")')).toBeVisible();
			await expect(tipsList.locator('li:has-text("Template placeholders")')).toBeVisible();
			await expect(tipsList.locator('li:has-text("Saving will create version")')).toBeVisible();
		});
	});

	test.describe('Keyboard Shortcuts', () => {
		test('should display keyboard shortcuts section', async ({ page }) => {
			await expect(page.locator('#keyboard-shortcuts-section')).toBeVisible();
		});

		test('should show keyboard icon', async ({ page }) => {
			const keyboardIcon = page.locator('#keyboard-shortcuts-section svg');
			await expect(keyboardIcon).toBeVisible();
		});

		test('should show Save shortcut (Cmd+S)', async ({ page }) => {
			const shortcutsList = page.locator('#shortcuts-list');
			await expect(shortcutsList.locator('text=Save')).toBeVisible();
			await expect(shortcutsList.locator('kbd:has-text("⌘")')).toBeVisible();
		});

		test('should show Cancel shortcut (Escape)', async ({ page }) => {
			const shortcutsList = page.locator('#shortcuts-list');
			await expect(shortcutsList.locator('text=Cancel')).toBeVisible();
			await expect(shortcutsList.locator('kbd:has-text("Esc")')).toBeVisible();
		});
	});

	test.describe('Page Layout', () => {
		test('should have main content area', async ({ page }) => {
			await expect(page.locator('#new-prompt-main-content')).toBeVisible();
		});

		test('should have sidebar for metadata', async ({ page }) => {
			await expect(page.locator('#new-prompt-sidebar')).toBeVisible();
		});

		test('should have correct grid layout classes', async ({ page }) => {
			const layout = page.locator('#new-prompt-layout');
			await expect(layout).toHaveClass(/grid/);
			await expect(layout).toHaveClass(/lg:grid-cols-3/);
		});

		test('should have main content span 2 columns', async ({ page }) => {
			const mainContent = page.locator('#new-prompt-main-content');
			await expect(mainContent).toHaveClass(/lg:col-span-2/);
		});

		test('should have Prompt Content section in main area', async ({ page }) => {
			const promptContentSection = page.locator('#new-prompt-main-content >> text=Prompt Content');
			await expect(promptContentSection).toBeVisible();
		});

		test('should have Prompt Details section in sidebar', async ({ page }) => {
			const promptDetailsSection = page.locator('#new-prompt-sidebar >> text=Prompt Details');
			await expect(promptDetailsSection).toBeVisible();
		});
	});

	test.describe('Form Actions', () => {
		test('should have form Save button', async ({ page }) => {
			const saveButton = page.locator('#form-save-button:has-text("Save Prompt")');
			await expect(saveButton).toBeVisible();
		});

		test('should have form Cancel button', async ({ page }) => {
			const cancelButton = page.locator(
				'#new-prompt-page-section #form-cancel-button:has-text("Cancel")'
			);
			await expect(cancelButton).toBeVisible();
		});

		test('Save button should have save icon', async ({ page }) => {
			const saveButton = page.locator('#save-button');
			await expect(saveButton.locator('svg')).toBeVisible();
		});
	});

	test.describe('Accessibility', () => {
		test('page header should have correct heading level', async ({ page }) => {
			const header = page.locator('#new-prompt-header h1');
			await expect(header).toHaveCount(1);
		});

		test('form inputs should have labels', async ({ page }) => {
			const titleLabel = page.locator('#prompt-metadata-form label[for="title"]');
			await expect(titleLabel).toBeVisible();
		});

		test('buttons should be focusable', async ({ page }) => {
			const saveButton = page.locator('#save-button');
			await saveButton.focus();
			await expect(saveButton).toBeFocused();
		});
	});
});

function setupConsoleErrorCheck(page: any): () => Promise<void> {
	const errors: string[] = [];
	page.on('console', (msg: any) => {
		if (msg.type() === 'error') {
			errors.push(msg.text());
		}
	});

	return async () => {
		page.off('console', errorHandler);
		// Filter out known harmless errors
		const realErrors = errors.filter((e) => !e.includes('message port closed'));
		expect(realErrors).toHaveLength(0);
	};
}

function errorHandler(msg: any) {
	if (msg.type() === 'error') {
		// Handle error
	}
}
