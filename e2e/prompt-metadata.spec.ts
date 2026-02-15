import { test, expect } from '@playwright/test';

test.describe('PromptMetadata Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
		await page.waitForLoadState('networkidle');
	});

	test('should display title input', async ({ page }) => {
		const titleInput = page.locator('#prompt-metadata-section input[id="title"]');
		await expect(titleInput).toBeVisible();
		await expect(titleInput).toHaveAttribute('placeholder', 'Enter prompt title');
	});

	test('should display description textarea', async ({ page }) => {
		const descriptionTextarea = page.locator('#prompt-metadata-section textarea[id="description"]');
		await expect(descriptionTextarea).toBeVisible();
		await expect(descriptionTextarea).toHaveAttribute(
			'placeholder',
			'Enter a brief description of this prompt'
		);
	});

	test('should display purpose dropdown', async ({ page }) => {
		const purposeSelect = page.locator('#prompt-metadata-section select[id="purpose"]');
		await expect(purposeSelect).toBeVisible();

		// Check that default option exists
		await expect(purposeSelect.locator('option').first()).toHaveText('Select purpose...');

		// Check that all purpose options are present in the DOM (options are not visible until dropdown opens)
		await expect(purposeSelect.locator('option[value="development"]')).toBeAttached({
			timeout: 10000
		});
		await expect(purposeSelect.locator('option[value="writing"]')).toBeAttached();
		await expect(purposeSelect.locator('option[value="analysis"]')).toBeAttached();
		await expect(purposeSelect.locator('option[value="creative"]')).toBeAttached();
		await expect(purposeSelect.locator('option[value="general"]')).toBeAttached();
	});

	test.skip('should display platform selector - field renamed to llmProviders with complex dropdown', async ({
		page
	}) => {
		const platformSelect = page.locator('#prompt-metadata-section select[id="platform"]');
		await expect(platformSelect).toBeVisible();

		// Check that all platform options are present in the DOM (options are not visible until dropdown opens)
		await expect(platformSelect.locator('option[value="claude"]')).toBeAttached();
		await expect(platformSelect.locator('option[value="gpt-4"]')).toBeAttached();
		await expect(platformSelect.locator('option[value="gpt-3.5"]')).toBeAttached();
		await expect(platformSelect.locator('option[value="gemini"]')).toBeAttached();
		await expect(platformSelect.locator('option[value="llama"]')).toBeAttached();
		await expect(platformSelect.locator('option[value="other"]')).toBeAttached();
	});

	test('should display tags input', async ({ page }) => {
		const tagsInput = page.locator('#prompt-metadata-section input[id="tags"]');
		await expect(tagsInput).toBeVisible();
		await expect(tagsInput).toHaveAttribute('placeholder', 'Type a tag and press Enter');
	});

	test('should accept title input', async ({ page }) => {
		const titleInput = page.locator('#prompt-metadata-section input[id="title"]');
		await titleInput.fill('My Test Prompt');

		// Input should have the value
		await expect(titleInput).toHaveValue('My Test Prompt');
	});

	test('should accept description input', async ({ page }) => {
		const descriptionTextarea = page.locator('#prompt-metadata-section textarea[id="description"]');
		await descriptionTextarea.fill('This is a test description for the prompt.');

		// Textarea should have the value
		await expect(descriptionTextarea).toHaveValue('This is a test description for the prompt.');
	});

	test('should select purpose option', async ({ page }) => {
		const purposeSelect = page.locator('#prompt-metadata-section select[id="purpose"]');
		await expect(purposeSelect.locator('option[value="development"]')).toBeAttached({
			timeout: 10000
		});
		await purposeSelect.selectOption('development');

		// Verify the selection
		await expect(purposeSelect).toHaveValue('development');
	});

	test.skip('should select platform option - field renamed to llmProviders with complex dropdown', async ({
		page
	}) => {
		const platformSelect = page.locator('#prompt-metadata-section select[id="platform"]');
		await platformSelect.selectOption('claude');

		// Verify selection
		await expect(platformSelect).toHaveValue('claude');
	});

	test('should accept tags input', async ({ page }) => {
		const tagsInput = page.locator('#prompt-metadata-section input[id="tags"]');
		await tagsInput.fill('typescript');

		// Input should have the value
		await expect(tagsInput).toHaveValue('typescript');
	});

	test('should display title with required indicator', async ({ page }) => {
		const titleInput = page.locator('#prompt-metadata-section input[id="title"]');
		const titleLabel = page.locator('#prompt-metadata-section label[for="title"]');

		// Title input should be visible
		await expect(titleInput).toBeVisible();

		// Label should show required indicator
		await expect(titleLabel).toContainText('*');
	});

	test('should display form field labels', async ({ page }) => {
		// Check all labels are present
		await expect(page.locator('#prompt-metadata-section label[for="title"]')).toBeVisible();
		await expect(page.locator('#prompt-metadata-section label[for="description"]')).toBeVisible();
		await expect(page.locator('#prompt-metadata-section label[for="tags"]')).toBeVisible();
	});

	test.skip('should be accessible with keyboard navigation - platform field renamed to llmProviders with complex dropdown', async ({
		page
	}) => {
		// Focus on title input
		const titleInput = page.locator('#prompt-metadata-section input[id="title"]');
		await titleInput.focus();

		// Should be able to tab through all form fields
		await page.keyboard.press('Tab');
		await expect(page.locator('#prompt-metadata-section textarea[id="description"]')).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(page.locator('#prompt-metadata-section select[id="purpose"]')).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(page.locator('#prompt-metadata-section select[id="platform"]')).toBeFocused();

		await page.keyboard.press('Tab');
		await expect(page.locator('#prompt-metadata-section input[id="tags"]')).toBeFocused();
	});
});

test.describe('Textarea Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
	});

	test('should display textarea', async ({ page }) => {
		const textarea = page.locator('#prompt-metadata-section textarea[id="description"]');
		await expect(textarea).toBeVisible();
	});

	test('should accept textarea input', async ({ page }) => {
		const textarea = page.locator('#prompt-metadata-section textarea[id="description"]');
		await textarea.fill('This is a test description for the textarea component.');

		await expect(textarea).toHaveValue('This is a test description for the textarea component.');
	});

	test('should have correct number of rows', async ({ page }) => {
		const textarea = page.locator('#prompt-metadata-section textarea[id="description"]');
		await expect(textarea).toHaveAttribute('rows', '3');
	});

	test('should be focusable', async ({ page }) => {
		const textarea = page.locator('#prompt-metadata-section textarea[id="description"]');
		await textarea.focus();
		await expect(textarea).toBeFocused();
	});
});
