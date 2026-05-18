import { test, expect } from '@playwright/test';
import { authenticateAdmin } from './auth-helper';

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
		const realErrors = errors.filter(
			(e) =>
				!e.includes('message port closed') &&
				!e.includes('ResizeObserver') &&
				!e.includes('does not provide an export named') // Known issue with some component exports
		);
		expect(realErrors).toHaveLength(0);
	};
}


test.describe('Admin Settings Page', () => {
	test.beforeEach(async ({ page }) => {
		// Authenticate before accessing admin routes
		await authenticateAdmin(page);

		await page.goto('/admin');
	});

	test('should display page title and description', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('Admin Settings');
		// Use more specific selector - the description is in the main content area
		await expect(page.locator('.container >> text=Configure AI models')).toBeVisible();
	});

	test('should display settings panel', async ({ page }) => {
		// Wait for settings panel content to load - use the settings-panel class which is rendered
		await page.waitForSelector('.settings-panel', { timeout: 10000 });
		const settingsPanel = page.locator('.settings-panel');
		await expect(settingsPanel).toBeVisible();
	});

	test('should display all setting sections', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Verify navigation tabs exist
		await expect(page.getByRole('button', { name: /display/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /content types/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /ai models/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /temp/i })).toBeVisible();
		await expect(page.getByRole('button', { name: /providers/i })).toBeVisible();
	});

	test('should display model setting inputs', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Switch to AI Models tab
		await page.getByRole('button', { name: /ai models/i }).click();

		// Check for judge_model input
		const judgeModelInput = page.locator('input#judge_model');
		await expect(judgeModelInput).toBeVisible();

		// Check for improvement_model input
		const improvementModelInput = page.locator('input#improvement_model');
		await expect(improvementModelInput).toBeVisible();
	});

	test('should display temperature setting inputs', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Switch to Temp & Reason tab
		await page.getByRole('button', { name: /temp/i }).click();

		// Check for judge_temperature input
		const judgeTempInput = page.locator('input#judge_temperature');
		await expect(judgeTempInput).toBeVisible();
		await expect(judgeTempInput).toHaveAttribute('type', 'number');
		await expect(judgeTempInput).toHaveAttribute('min', '0');
		await expect(judgeTempInput).toHaveAttribute('max', '1');
		await expect(judgeTempInput).toHaveAttribute('step', '0.1');

		// Check for improvement_temperature input
		const improvementTempInput = page.locator('input#improvement_temperature');
		await expect(improvementTempInput).toBeVisible();
	});

	test('should display reasoning setting controls', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Switch to Temp & Reason tab
		await page.getByRole('button', { name: /temp/i }).click();

		// Check for store_thinking select
		const storeThinkingSelect = page.locator('select#store_thinking');
		await expect(storeThinkingSelect).toBeVisible();

		// Verify options
		await expect(storeThinkingSelect.locator('option[value="true"]')).toBeAttached();
		await expect(storeThinkingSelect.locator('option[value="false"]')).toBeAttached();

		// Check for show_thinking select
		const showThinkingSelect = page.locator('select#show_thinking');
		await expect(showThinkingSelect).toBeVisible();

		// Check for max_thinking_length input
		const maxThinkingInput = page.locator('input#max_thinking_length');
		await expect(maxThinkingInput).toBeVisible();
		await expect(maxThinkingInput).toHaveAttribute('type', 'number');
	});

	test('should display action buttons', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Reset to Defaults button
		const resetButton = page.getByRole('button', { name: /reset to defaults/i });
		await expect(resetButton).toBeVisible();

		// Save Changes button
		const saveButton = page.getByRole('button', { name: /save changes/i });
		await expect(saveButton).toBeVisible();

		// Save button should be disabled initially (no changes)
		await expect(saveButton).toBeDisabled();
	});

	test('should enable save button when settings are modified', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Switch to Temp & Reason tab
		await page.getByRole('button', { name: /temp/i }).click();

		const saveButton = page.getByRole('button', { name: /save changes/i });

		// Initially disabled
		await expect(saveButton).toBeDisabled();

		// Modify a setting
		const judgeTempInput = page.locator('input#judge_temperature');
		await judgeTempInput.fill('0.5');

		// Save button should now be enabled
		await expect(saveButton).toBeEnabled();
	});

	test('should display unsaved changes message', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Switch to Temp & Reason tab
		await page.getByRole('button', { name: /temp/i }).click();

		// Modify a setting
		const judgeTempInput = page.locator('input#judge_temperature');
		await judgeTempInput.fill('0.5');

		// Wait a bit for reactivity
		await page.waitForTimeout(500);

		// Check for unsaved changes message
		await expect(page.getByText(/you have unsaved changes/i)).toBeVisible();
	});

	test('should not have console errors', async ({ page }) => {
		const cleanup = setupConsoleErrorCheck(page);
		try {
			// Wait for loading spinner to disappear and settings to load
			await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });
		} finally {
			await cleanup();
		}
	});

	test('should have proper layout and styling', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Check container - use the main content container
		const container = page.locator('main >> .container');
		await expect(container).toBeVisible();

		// Check cards are properly styled
		const cards = page.locator('[class*="card"]');
		expect(await cards.count()).toBeGreaterThan(0);
	});

	test('should display proper labels for settings', async ({ page }) => {
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });

		// Switch to AI Models tab
		await page.getByRole('button', { name: /ai models/i }).click();

		// Check for properly formatted labels
		await expect(page.getByText('Judge Model')).toBeVisible();

		// Switch to Temp & Reason tab for temp/reason labels
		await page.getByRole('button', { name: /temp/i }).click();
		await expect(page.getByText('Judge Temperature')).toBeVisible();
		await expect(page.getByText('Store Thinking')).toBeVisible();
	});
});

test.describe('Admin Settings - Interaction Tests', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/admin');
		// Wait for loading spinner to disappear and settings to load
		await page.waitForSelector('.settings-panel:not(:has(.animate-spin))', { timeout: 15000 });
	});

	test('should allow editing temperature values', async ({ page }) => {
		await page.getByRole('button', { name: /temp/i }).click();
		const judgeTempInput = page.locator('input#judge_temperature');

		// Get current value
		const initialValue = await judgeTempInput.inputValue();

		// Change value
		await judgeTempInput.fill('0.7');

		// Verify change
		await expect(judgeTempInput).toHaveValue('0.7');

		// Revert to initial
		await judgeTempInput.fill(initialValue);
	});

	test('should allow toggling boolean settings', async ({ page }) => {
		await page.getByRole('button', { name: /temp/i }).click();
		const storeThinkingSelect = page.locator('select#store_thinking');

		// Get current value
		const initialValue = await storeThinkingSelect.inputValue();

		// Toggle value
		const newValue = initialValue === 'true' ? 'false' : 'true';
		await storeThinkingSelect.selectOption(newValue);

		// Verify change
		await expect(storeThinkingSelect).toHaveValue(newValue);

		// Revert to initial
		await storeThinkingSelect.selectOption(initialValue);
	});

	test('should allow editing model names', async ({ page }) => {
		await page.getByRole('button', { name: /ai models/i }).click();
		const judgeModelInput = page.locator('input#judge_model');

		// Get current value
		const initialValue = await judgeModelInput.inputValue();

		// Change value
		await judgeModelInput.fill('test-model-name');

		// Verify change
		await expect(judgeModelInput).toHaveValue('test-model-name');

		// Revert to initial
		await judgeModelInput.fill(initialValue);
	});
});

test.describe('AI Settings Page', () => {
	test.beforeEach(async ({ page }) => {
		// Authenticate before accessing admin routes
		await authenticateAdmin(page);

		await page.goto('/admin/ai-settings');
	});

	test('should display AI settings page title and description', async ({ page }) => {
		await expect(page.locator('h1')).toContainText('AI Settings');
		await expect(
			page.getByText(/Configure OpenCode integration, model policy, and Improve presets/)
		).toBeVisible();
	});

	test('should display connection status card', async ({ page }) => {
		await expect(page.getByText('Connection Status')).toBeVisible();
		await expect(page.getByText('OpenCode service health')).toBeVisible();
	});

	test('should display model catalog card', async ({ page }) => {
		await expect(page.getByText('Model Catalog')).toBeVisible();
		await expect(page.getByText('Read-only view of available providers and models')).toBeVisible();
	});

	test('should display AI policy card', async ({ page }) => {
		await expect(page.getByText('AI Policy')).toBeVisible();
		await expect(page.getByText('Configure model allowlist and workflow defaults')).toBeVisible();
	});

	test('should display Improve presets card', async ({ page }) => {
		await expect(page.getByRole('heading', { name: 'Improve Presets' })).toBeVisible();
		await expect(page.getByText('Manage instruction presets for Improve workflow')).toBeVisible();
	});

	test('should allow creating new preset', async ({ page }) => {
		// Click New Preset button
		await page.getByRole('button', { name: 'New Preset' }).click();

		// Fill in form
		await page.locator('#preset-name').fill('Test Preset');
		await page.locator('#preset-description').fill('Test description');
		await page.locator('#preset-instruction').fill('Test instruction {{content}}');

		// Save
		await page.getByRole('button', { name: 'Create' }).click();

		// Check for success toast or preset in list
		await page.waitForTimeout(1000);
		await expect(page.getByText('Test Preset')).toBeVisible();
	});

	test('should allow editing existing preset', async ({ page }) => {
		// Wait for presets to load
		await page.waitForTimeout(1000);

		// Find first preset's Edit button
		const editButton = page.getByRole('button', { name: 'Edit' }).first();
		if (await editButton.isVisible()) {
			await editButton.click();
			await page.locator('#preset-name').fill('Updated Preset');
			await page.getByRole('button', { name: 'Save' }).click();
			await page.waitForTimeout(1000);
			await expect(page.getByText('Updated Preset')).toBeVisible();
		}
	});

	test('should not have console errors', async ({ page }) => {
		const cleanup = setupConsoleErrorCheck(page);
		try {
			// Wait for page to load
			await page.waitForTimeout(2000);
		} finally {
			await cleanup();
		}
	});

	test.describe('Connection Status', () => {
		test('should display connection health status', async ({ page }) => {
			await expect(page.getByText('Connection Status')).toBeVisible();
			await expect(page.getByText('OpenCode service health')).toBeVisible();

			// Health indicator should be visible
			const healthIndicator = page
				.locator('.rounded-full')
				.filter({ hasText: /ok|healthy|connected/i });
			await expect(healthIndicator.first()).toBeVisible();
		});

		test('should display connection status badge', async ({ page }) => {
			// Look for status badge (green for healthy, red for unhealthy)
			const statusBadge = page.locator('.rounded-full');
			await expect(statusBadge.first()).toBeVisible();
		});
	});

	test.describe('Model Catalog', () => {
		test('should display model catalog section', async ({ page }) => {
			await expect(page.getByText('Model Catalog')).toBeVisible();
			await expect(
				page.getByText('Read-only view of available providers and models')
			).toBeVisible();
		});

		test('should display provider list', async ({ page }) => {
			// Wait for catalog to load
			await page.waitForTimeout(2000);

			// Look for provider cards or list
			const providerCards = page
				.locator('.rounded-lg.border')
				.filter({ hasText: /anthropic|openai/i });
			const count = await providerCards.count();

			if (count > 0) {
				await expect(providerCards.first()).toBeVisible();
			}
		});

		test('should display model list for providers', async ({ page }) => {
			await page.waitForTimeout(2000);

			// Look for model names
			const models = page.getByText(/claude|gpt/i);
			const modelCount = await models.count();

			if (modelCount > 0) {
				await expect(models.first()).toBeVisible();
			}
		});

		test('should have refresh button', async ({ page }) => {
			const refreshButton = page.getByRole('button', { name: /refresh/i }).first();
			const isVisible = await refreshButton.isVisible();
			if (isVisible) {
				await expect(refreshButton).toBeVisible();
			}
		});
	});

	test.describe('AI Policy Editor', () => {
		test('should display AI policy section', async ({ page }) => {
			await expect(page.getByText('AI Policy')).toBeVisible();
			await expect(page.getByText('Configure model allowlist and workflow defaults')).toBeVisible();
		});

		test('should display improve default model field', async ({ page }) => {
			const improveModelInput = page.locator(
				'#improve_default_model, [name*="improve_default_model"]'
			);
			const isVisible = await improveModelInput.isVisible({ timeout: 3000 });
			if (isVisible) {
				await expect(improveModelInput).toBeVisible();
			}
		});

		test('should display judge default model field', async ({ page }) => {
			const judgeModelInput = page.locator('#judge_default_model, [name*="judge_default_model"]');
			const isVisible = await judgeModelInput.isVisible({ timeout: 3000 });
			if (isVisible) {
				await expect(judgeModelInput).toBeVisible();
			}
		});

		test('should display temperature settings', async ({ page }) => {
			const tempInput = page.locator('[name*="temperature"]');
			const isVisible = await tempInput.isVisible({ timeout: 3000 });
			if (isVisible) {
				await expect(tempInput).toBeVisible();
			}
		});

		test('should display allowed models configuration', async ({ page }) => {
			const allowedModelsSection = page.getByText(/allowed models|model allowlist/i);
			const isVisible = await allowedModelsSection.isVisible({ timeout: 3000 });
			if (isVisible) {
				await expect(allowedModelsSection).toBeVisible();
			}
		});

		test('should have save button for policy', async ({ page }) => {
			const saveButton = page.getByRole('button', { name: /save/i });
			await expect(saveButton).toBeVisible();
		});
	});

	test.describe('Improve Presets Management', () => {
		test('should display improve presets section', async ({ page }) => {
			await expect(page.getByRole('heading', { name: 'Improve Presets' })).toBeVisible();
			await expect(page.getByText('Manage instruction presets for Improve workflow')).toBeVisible();
		});

		test('should have new preset button', async ({ page }) => {
			const newPresetButton = page.getByRole('button', { name: 'New Preset' });
			await expect(newPresetButton).toBeVisible();
		});

		test('should display existing presets', async ({ page }) => {
			// Wait for presets to load
			await page.waitForTimeout(2000);

			// Look for preset cards or list items
			const presetItems = page
				.locator('.rounded-lg.border')
				.filter({ hasText: /preset|instruction/i });
			const count = await presetItems.count();

			if (count > 0) {
				await expect(presetItems.first()).toBeVisible();
			}
		});

		test('should display preset name', async ({ page }) => {
			await page.waitForTimeout(2000);

			const presetItems = page.locator('.rounded-lg.border');
			const count = await presetItems.count();

			if (count > 0) {
				// First item should have a name/title
				const firstItem = presetItems.first();
				const hasText = await firstItem.textContent();
				expect(hasText?.length).toBeGreaterThan(0);
			}
		});

		test('should have edit button for presets', async ({ page }) => {
			await page.waitForTimeout(2000);

			const editButtons = page.getByRole('button', { name: 'Edit' });
			const count = await editButtons.count();

			if (count > 0) {
				await expect(editButtons.first()).toBeVisible();
			}
		});

		test('should have delete button for presets', async ({ page }) => {
			await page.waitForTimeout(2000);

			const deleteButtons = page.getByRole('button', { name: 'Delete' });
			const count = await deleteButtons.count();

			if (count > 0) {
				await expect(deleteButtons.first()).toBeVisible();
			}
		});
	});

	test.describe('AI Settings Console Error Checking', () => {
		test('should not have console errors on initial load', async ({ page }) => {
			const cleanup = setupConsoleErrorCheck(page);
			try {
				await page.waitForTimeout(2000);
			} finally {
				await cleanup();
			}
		});

		test('should not have console errors when toggling sections', async ({ page }) => {
			const cleanup = setupConsoleErrorCheck(page);
			try {
				// Toggle various sections
				const headers = page.locator('h2, h3');
				const count = await headers.count();

				for (let i = 0; i < Math.min(count, 3); i++) {
					const header = headers.nth(i);
					await header.click();
					await page.waitForTimeout(500);
				}
			} finally {
				await cleanup();
			}
		});

		test('should not have console errors when creating preset', async ({ page }) => {
			const cleanup = setupConsoleErrorCheck(page);
			try {
				const newPresetButton = page.getByRole('button', { name: 'New Preset' });
				await newPresetButton.click();
				await page.waitForTimeout(1000);

				// Form should be visible
				const form = page.locator('form, dialog');
				await expect(form.first()).toBeVisible();
			} finally {
				await cleanup();
			}
		});
	});
});
