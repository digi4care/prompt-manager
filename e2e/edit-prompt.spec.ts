import { test, expect } from '@playwright/test';

let testPromptId: number;
let testPromptTitle: string;
let testPromptVersion: string;
let testPromptChangeType: string;
let testPromptChangeNotes: string;

test.describe('Edit Prompt Page (STORY-017)', () => {
	test.describe.configure({ mode: 'serial' });

	test.beforeAll(async ({ request }) => {
		const uniqueTitle = `E2E Edit Prompt ${Date.now()}`;
		const response = await request.post('/api/prompts', {
			data: {
				title: uniqueTitle,
				description: 'E2E prompt for edit page tests',
				purpose: 'development',
				tags: ['e2e'],
				llmProviders: ['openai'],
				content: 'Hello from Playwright'
			}
		});

		expect(response.ok()).toBeTruthy();
		const data = await response.json();

		testPromptId = data.id;
		testPromptTitle = data.title;
		testPromptVersion = data.latestVersion?.version ?? '1.0.0';
		testPromptChangeType = data.latestVersion?.changeType ?? 'major';
		testPromptChangeNotes = data.latestVersion?.changeNotes ?? 'Initial version';
	});

	test.beforeEach(async ({ page }) => {
		// Navigate to the actual edit page route - this tests the real implementation
		await page.goto(`/prompts/${testPromptId}/edit`);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('#edit-prompt-page-section')).toBeVisible();
	});

	test.describe('Page Header', () => {
		test('should display edit prompt page section', async ({ page }) => {
			await expect(page.locator('#edit-prompt-page-section')).toBeVisible();
		});

		test('should show edit prompt header', async ({ page }) => {
			const header = page.locator('#edit-prompt-header >> h1:has-text("Edit Prompt")');
			await expect(header).toBeVisible();
		});

		test('should show page description', async ({ page }) => {
			const description = page.locator(
				'#edit-prompt-page-section >> text=Update prompt content and metadata'
			);
			await expect(description).toBeVisible();
		});

		test('should have Save Changes button', async ({ page }) => {
			const saveButton = page.locator('#save-changes-button:has-text("Save Changes")');
			await expect(saveButton).toBeVisible();
		});

		test('should have Cancel button', async ({ page }) => {
			const cancelButton = page.locator('#cancel-button:has-text("Cancel")');
			await expect(cancelButton).toBeVisible();
		});
	});

	test.describe('Breadcrumb Navigation', () => {
		test('should have breadcrumb to prompts list', async ({ page }) => {
			const breadcrumbPrompts = page.locator('#edit-prompt-breadcrumb >> a:has-text("Prompts")');
			await expect(breadcrumbPrompts).toBeVisible();
		});

		test('should have breadcrumb to prompt detail', async ({ page }) => {
			const breadcrumbDetail = page.locator(
				`#edit-prompt-breadcrumb >> a:has-text("${testPromptTitle}")`
			);
			await expect(breadcrumbDetail).toBeVisible();
		});

		test('should indicate current page in breadcrumb', async ({ page }) => {
			const breadcrumb = page.locator('#edit-prompt-breadcrumb');
			await expect(breadcrumb.getByText('Edit', { exact: true })).toBeVisible();
		});
	});

	test.describe('Prompt Content Editor', () => {
		test('should display prompt content editor section', async ({ page }) => {
			await expect(page.locator('#edit-prompt-content-editor')).toBeVisible();
		});

		test('should have Monaco editor container', async ({ page }) => {
			const editor = page.locator('#edit-prompt-content-editor .editor-container');
			await expect(editor).toBeVisible();
		});

		test('should have editor toolbar with Insert button', async ({ page }) => {
			const toolbarButton = page.locator('#edit-prompt-content-editor button:has-text("Insert")');
			await expect(toolbarButton).toBeVisible();
		});

		test('should have editor toolbar with Copy button', async ({ page }) => {
			const copyButton = page.locator('#edit-prompt-content-editor button:has-text("Copy")');
			await expect(copyButton).toBeVisible();
		});

		test('should have editor toolbar with Clear button', async ({ page }) => {
			const clearButton = page.locator('#edit-prompt-content-editor button:has-text("Clear")');
			await expect(clearButton).toBeVisible();
		});

		test('should have fullscreen toggle button', async ({ page }) => {
			const fullscreenButton = page.locator(
				'#edit-prompt-content-editor button[title="Enter fullscreen"]'
			);
			await expect(fullscreenButton).toBeVisible();
		});
	});

	test.describe('Version Information', () => {
		test('should display version information section', async ({ page }) => {
			await expect(page.locator('#version-info-section')).toBeVisible();
		});

		test('should have change type selector', async ({ page }) => {
			const changeTypeSelector = page.locator('#change-type');
			await expect(changeTypeSelector).toBeVisible();
		});

		test('should have patch option', async ({ page }) => {
			const patchButton = page.locator('#change-type button:has-text("Patch")');
			await expect(patchButton).toBeVisible();
		});

		test('should have minor option', async ({ page }) => {
			const minorButton = page.locator('#change-type button:has-text("Minor")');
			await expect(minorButton).toBeVisible();
		});

		test('should have major option', async ({ page }) => {
			const majorButton = page.locator('#change-type button:has-text("Major")');
			await expect(majorButton).toBeVisible();
		});

		test('should have change notes textarea', async ({ page }) => {
			const changeNotesTextarea = page.locator('#change-notes-textarea');
			await expect(changeNotesTextarea).toBeVisible();
		});

		test('should show change notes label', async ({ page }) => {
			const changeNotesLabel = page.locator('#change-notes-label');
			await expect(changeNotesLabel).toContainText('Change Notes');
		});
	});

	test.describe('Prompt Metadata Form', () => {
		test('should display prompt metadata form section', async ({ page }) => {
			await expect(page.locator('#edit-prompt-metadata-form')).toBeVisible();
		});

		test('should have title input field', async ({ page }) => {
			const titleInput = page.locator('#edit-prompt-metadata-form input[id="title"]');
			await expect(titleInput).toBeVisible();
		});

		test('should have description textarea', async ({ page }) => {
			const descriptionTextarea = page.locator(
				'#edit-prompt-metadata-form textarea[id="description"]'
			);
			await expect(descriptionTextarea).toBeVisible();
		});

		test('should have purpose dropdown', async ({ page }) => {
			const purposeSelect = page.locator('#edit-prompt-metadata-form select[id="purpose"]');
			await expect(purposeSelect).toBeVisible();
		});

		test('should have tags input field', async ({ page }) => {
			const tagsInput = page.locator('#edit-prompt-metadata-form input[id="tags"]');
			await expect(tagsInput).toBeVisible();
		});

		test('should show title required indicator', async ({ page }) => {
			const titleLabel = page.locator('#edit-prompt-metadata-form label[for="title"]');
			await expect(titleLabel).toContainText('*');
		});
	});

	test.describe('Current Version Info', () => {
		test('should display current version info section', async ({ page }) => {
			await expect(page.locator('#current-version-section')).toBeVisible();
		});

		test('should show current version number', async ({ page }) => {
			const versionInfo = page.locator('#current-version-section');
			await expect(versionInfo.locator(`text=v${testPromptVersion}`)).toBeVisible();
		});

		test('should show current change type', async ({ page }) => {
			const versionInfo = page.locator('#current-version-section');
			await expect(versionInfo.locator(`text=${testPromptChangeType}`)).toBeVisible();
		});

		test('should show current change notes', async ({ page }) => {
			const versionInfo = page.locator('#current-version-section');
			await expect(versionInfo.locator(`text=${testPromptChangeNotes}`)).toBeVisible();
		});
	});

	test.describe('Tips Section', () => {
		test('should display tips section', async ({ page }) => {
			await expect(page.locator('#edit-tips-section')).toBeVisible();
		});

		test('should show tips icon', async ({ page }) => {
			const tipsIcon = page.locator('#edit-tips-section svg');
			await expect(tipsIcon).toBeVisible();
		});
	});

	test.describe('Keyboard Shortcuts', () => {
		test('should display keyboard shortcuts section', async ({ page }) => {
			await expect(page.locator('#edit-keyboard-shortcuts-section')).toBeVisible();
		});

		test('should show keyboard icon', async ({ page }) => {
			const keyboardIcon = page.locator('#edit-keyboard-shortcuts-section svg');
			await expect(keyboardIcon).toBeVisible();
		});

		test('should show Save shortcut (Cmd+S)', async ({ page }) => {
			const shortcutsList = page.locator('#edit-shortcuts-list');
			await expect(shortcutsList.locator('text=Save')).toBeVisible();
			await expect(shortcutsList.locator('kbd:has-text("⌘")')).toBeVisible();
		});

		test('should show Cancel shortcut (Escape)', async ({ page }) => {
			const shortcutsList = page.locator('#edit-shortcuts-list');
			await expect(shortcutsList.locator('text=Cancel')).toBeVisible();
			await expect(shortcutsList.locator('kbd:has-text("Esc")')).toBeVisible();
		});
	});

	test.describe('Page Layout', () => {
		test('should have main content area', async ({ page }) => {
			await expect(page.locator('#edit-prompt-main-content')).toBeVisible();
		});

		test('should have sidebar for metadata and version info', async ({ page }) => {
			await expect(page.locator('#edit-prompt-sidebar')).toBeVisible();
		});

		test('should have correct grid layout classes', async ({ page }) => {
			const layout = page.locator('#edit-prompt-layout');
			await expect(layout).toHaveClass(/grid/);
			await expect(layout).toHaveClass(/lg:grid-cols-3/);
		});

		test('should have main content span 2 columns', async ({ page }) => {
			const mainContent = page.locator('#edit-prompt-main-content');
			await expect(mainContent).toHaveClass(/lg:col-span-2/);
		});

		test('should have Prompt Content section in main area', async ({ page }) => {
			const promptContentSection = page.locator('#edit-prompt-main-content >> text=Prompt Content');
			await expect(promptContentSection).toBeVisible();
		});

		test('should have Version Information section in main area', async ({ page }) => {
			const versionInfoSection = page.locator(
				'#edit-prompt-main-content >> text=Version Information'
			);
			await expect(versionInfoSection).toBeVisible();
		});

		test('should have Prompt Details section in sidebar', async ({ page }) => {
			const promptDetailsSection = page.locator('#edit-prompt-sidebar >> text=Prompt Details');
			await expect(promptDetailsSection).toBeVisible();
		});

		test('should have Current Version section in sidebar', async ({ page }) => {
			const currentVersionSection = page.locator('#edit-prompt-sidebar >> text=Current Version');
			await expect(currentVersionSection).toBeVisible();
		});
	});

	test.describe('Form Actions', () => {
		test('should have Save Changes button', async ({ page }) => {
			const saveButton = page.locator('#save-changes-button:has-text("Save Changes")');
			await expect(saveButton).toBeVisible();
		});

		test('should have Cancel button', async ({ page }) => {
			const cancelButton = page.locator('#cancel-button:has-text("Cancel")');
			await expect(cancelButton).toBeVisible();
		});

		test('Save button should have save icon', async ({ page }) => {
			const saveButton = page.locator('#save-changes-button');
			await expect(saveButton.locator('svg')).toBeVisible();
		});
	});

	test.describe('Frontmatter YAML', () => {
		test('should persist frontmatter_yaml when saving', async ({ page }) => {
			const yaml = ['temperature: 0.2', 'max_tokens: 123', 'foo: bar'].join('\n');

			const textarea = page.locator('[data-testid="frontmatter-yaml"]');
			await expect(textarea).toBeVisible();
			await textarea.fill(yaml);

			await page.locator('#save-changes-button').click();
			await expect(page).toHaveURL(`/prompts/${testPromptId}`);

			// Reload edit page and ensure the YAML comes back
			await page.goto(`/prompts/${testPromptId}/edit`);
			await expect(page.locator('[data-testid="frontmatter-yaml"]')).toHaveValue(yaml);
		});
	});

	test.describe('Accessibility', () => {
		test('page header should have correct heading level', async ({ page }) => {
			const header = page.locator('#edit-prompt-page-section h1');
			await expect(header).toHaveCount(1);
		});

		test('form inputs should have labels', async ({ page }) => {
			const titleLabel = page.locator('#edit-prompt-metadata-form label[for="title"]');
			await expect(titleLabel).toBeVisible();
		});

		test('buttons should be focusable', async ({ page }) => {
			const cancelButton = page.locator('#cancel-button');
			await cancelButton.focus();
			await expect(cancelButton).toBeFocused();
		});

		test('change type selector should be accessible', async ({ page }) => {
			const patchButton = page.locator('#change-type button:has-text("Patch")');
			await expect(patchButton).toBeVisible();
		});
	});

	test.describe('Console Error Check', () => {
		test('should not have console errors on edit page', async ({ page }) => {
			const cleanup = setupConsoleErrorCheck(page);
			try {
				await page.waitForTimeout(2000);
			} finally {
				await cleanup();
			}
		});
	});
});

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
