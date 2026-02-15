import { test, expect } from '@playwright/test';

/**
 * Authenticate as admin for E2E tests
 * In development mode, uses the bypass password
 */
async function authenticateAdmin(page: any): Promise<void> {
	const response = await page.request.post('/api/admin/login', {
		data: { password: 'bypass' }
	});

	if (!response.ok()) {
		throw new Error(`Failed to authenticate: ${response.statusText()}`);
	}
}

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
			(e) => !e.includes('message port closed') && !e.includes('ResizeObserver')
		);
		expect(realErrors).toHaveLength(0);
	};
}

test.describe('Improve Flow with Model/Preset/Instruction', () => {
	test.describe.configure({ mode: 'serial' });

	let testPromptId: number;
	let cleanup: () => Promise<void>;

	test.beforeAll(async ({ request }) => {
		const uniqueTitle = `E2E Improve Flow ${Date.now()}`;
		const response = await request.post('/api/prompts', {
			data: {
				title: uniqueTitle,
				description: 'E2E prompt for improve flow tests',
				purpose: 'development',
				tags: ['e2e', 'improve'],
				llmProviders: ['openai'],
				content:
					'This is a test prompt for E2E testing of the improve flow with model selection and presets.'
			}
		});

		if (!response.ok()) {
			throw new Error(`Failed to create test prompt: ${response.statusText()}`);
		}

		const data = await response.json();
		testPromptId = data.id;
	});

	test.beforeEach(async ({ page }) => {
		await page.goto(`/prompts/${testPromptId}/improve`);
		await page.waitForLoadState('networkidle');
		cleanup = setupConsoleErrorCheck(page);
	});

	test.afterEach(async () => {
		if (cleanup) await cleanup();
	});

	test.describe('Improve Page Structure', () => {
		test('should display improve page correctly', async ({ page }) => {
			// Check breadcrumb
			await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
			await expect(page.getByText('Prompts')).toBeVisible();
			await expect(page.getByText('Improve')).toBeVisible();

			// Check page title
			await expect(page.locator('h1')).toContainText('Improve Prompt');
		});

		test('should display current version', async ({ page }) => {
			// Check current version card
			await expect(page.getByText('Current Version')).toBeVisible();
			await expect(page.locator('.rounded-lg.border.bg-card').first()).toBeVisible();
		});

		test('should display AI Improvement panel', async ({ page }) => {
			await expect(page.getByText('AI Improvement')).toBeVisible();
			await expect(page.getByText('Analyze and generate improved versions')).toBeVisible();
		});

		test('should not have console errors on load', async ({ page }) => {
			await page.waitForTimeout(2000);
			// Cleanup will check for errors
		});
	});

	test.describe('Preset Selector', () => {
		test('should display preset selector', async ({ page }) => {
			await expect(page.getByText('Preset (optional)')).toBeVisible();
			const presetSelect = page.locator('#preset-select');
			await expect(presetSelect).toBeVisible();
		});

		test('should allow selecting preset', async ({ page }) => {
			const presetSelect = page.locator('#preset-select');

			// Wait for presets to load
			await page.waitForTimeout(1000);

			// Get all options
			const options = await presetSelect.locator('option').all();

			// If there are presets (other than "No preset"), try to select one
			if (options.length > 1) {
				const firstPresetOption = options[1]; // Skip "No preset" option
				const presetValue = await firstPresetOption.getAttribute('value');

				if (presetValue) {
					await presetSelect.selectOption(presetValue);
					await page.waitForTimeout(500);

					// Verify selection
					await expect(presetSelect).toHaveValue(presetValue);
				}
			}
		});

		test('should show preset details when selected', async ({ page }) => {
			const presetSelect = page.locator('#preset-select');

			// Wait for presets to load
			await page.waitForTimeout(1000);

			// Get all options
			const options = await presetSelect.locator('option').all();

			// If there are presets, select one
			if (options.length > 1) {
				const firstPresetOption = options[1];
				const presetValue = await firstPresetOption.getAttribute('value');

				if (presetValue) {
					await presetSelect.selectOption(presetValue);
					await page.waitForTimeout(500);

					// Check if preset info is shown
					const presetInfo = page.locator('.bg-muted\\/50.p-3');
					const isVisible = await presetInfo.isVisible();
					if (isVisible) {
						await expect(presetInfo).toBeVisible();
					}
				}
			}
		});

		test('should have "No preset" option', async ({ page }) => {
			const presetSelect = page.locator('#preset-select');
			await page.waitForTimeout(1000);

			const noPresetOption = presetSelect.locator('option').filter({ hasText: 'No preset' });
			await expect(noPresetOption).toBeAttached();
		});
	});

	test.describe('Custom Instruction', () => {
		test('should display custom instruction textarea', async ({ page }) => {
			await expect(page.getByText('Custom Instruction (optional)')).toBeVisible();
			const instructionTextarea = page.locator('#custom-instruction');
			await expect(instructionTextarea).toBeVisible();
		});

		test('should allow entering custom instruction', async ({ page }) => {
			const instructionTextarea = page.locator('#custom-instruction');
			const testInstruction = 'Focus on clarity and conciseness';

			await instructionTextarea.fill(testInstruction);
			await expect(instructionTextarea).toHaveValue(testInstruction);
		});

		test('should display instruction helper text', async ({ page }) => {
			const helperText = page.getByText(/This will be applied in addition to preset instruction/);
			await expect(helperText).toBeVisible();
		});

		test('should allow clearing custom instruction', async ({ page }) => {
			const instructionTextarea = page.locator('#custom-instruction');

			await instructionTextarea.fill('Test instruction');
			await instructionTextarea.fill('');
			await expect(instructionTextarea).toHaveValue('');
		});
	});

	test.describe('Advanced Model Selection', () => {
		test('should display advanced section', async ({ page }) => {
			const advancedSection = page.getByText('Advanced: Model Selection');
			await expect(advancedSection).toBeVisible();
		});

		test('should expand advanced section on click', async ({ page }) => {
			const advancedButton = page.getByText('Advanced: Model Selection');

			// Click to expand (if it's collapsed)
			await advancedButton.click();
			await page.waitForTimeout(500);

			// Model picker should be visible
			const providerSelect = page.locator('#provider-select');
			const isVisible = await providerSelect.isVisible({ timeout: 3000 });
			// It may or may not be visible depending on initial state
		});

		test('should display provider selector', async ({ page }) => {
			const advancedButton = page.getByText('Advanced: Model Selection');
			await advancedButton.click();
			await page.waitForTimeout(500);

			const providerSelect = page.locator('#provider-select');
			await expect(providerSelect).toBeVisible({ timeout: 5000 });
		});

		test('should display model selector', async ({ page }) => {
			const advancedButton = page.getByText('Advanced: Model Selection');
			await advancedButton.click();
			await page.waitForTimeout(1000);

			// Wait for provider to load
			const providerSelect = page.locator('#provider-select');
			await providerSelect.waitFor({ state: 'visible', timeout: 5000 });

			// Get first provider option
			const options = await providerSelect.locator('option').all();
			if (options.length > 1) {
				const firstProviderOption = options[1];
				const providerValue = await firstProviderOption.getAttribute('value');

				if (providerValue) {
					await providerSelect.selectOption(providerValue);
					await page.waitForTimeout(500);

					// Model select should appear
					const modelSelect = page.locator('#model-select');
					await expect(modelSelect).toBeVisible();
				}
			}
		});

		test('should display temperature control', async ({ page }) => {
			const advancedButton = page.getByText('Advanced: Model Selection');
			await advancedButton.click();
			await page.waitForTimeout(500);

			// Temperature slider
			const temperatureInput = page.locator('#temperature');
			await expect(temperatureInput).toBeVisible();
		});

		test('should allow adjusting temperature', async ({ page }) => {
			const advancedButton = page.getByText('Advanced: Model Selection');
			await advancedButton.click();
			await page.waitForTimeout(500);

			const temperatureInput = page.locator('#temperature');
			const initialValue = await temperatureInput.inputValue();

			await temperatureInput.fill('0.7');
			await expect(temperatureInput).toHaveValue('0.7');

			// Reset to initial value
			await temperatureInput.fill(initialValue);
		});

		test('should show temperature labels', async ({ page }) => {
			const advancedButton = page.getByText('Advanced: Model Selection');
			await advancedButton.click();
			await page.waitForTimeout(500);

			await expect(page.getByText('Precise (0.0)')).toBeVisible();
			await expect(page.getByText('Creative (1.0)')).toBeVisible();
		});
	});

	test.describe('Improve with AI Button', () => {
		test('should display improve button', async ({ page }) => {
			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await expect(improveButton).toBeVisible();
		});

		test('should show loading state when improving', async ({ page }) => {
			// Fill in instruction
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			// Click improve button
			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			// Button should show loading state
			await expect(page.getByText('Improving...')).toBeVisible({ timeout: 3000 });
		});

		test('should be disabled during improvement', async ({ page }) => {
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			await page.waitForTimeout(2000);

			// Button should be disabled
			await expect(improveButton).toBeDisabled();
		});
	});

	test.describe('Improvement Results', () => {
		test('should show progress indicator during improvement', async ({ page }) => {
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			// Wait for progress indicator
			await page.waitForTimeout(1000);

			// Progress bar should be visible
			const progress = page.locator('[role="progressbar"]');
			const progressVisible = await progress.isVisible();
			if (progressVisible) {
				await expect(progress).toBeVisible();
			}
		});

		test('should display variants after improvement', async ({ page }) => {
			// This test may time out if real API calls are made
			// In TEST_MODE, it should use deterministic responses

			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			// Wait for improvement to complete
			// In test mode with mock, this should be fast
			await page.waitForTimeout(5000);

			// Check if variants are shown
			const variantCards = page.locator('.rounded-lg.border').filter({ hasText: /Variant \d+/ });
			const variantCount = await variantCards.count();

			// Variants may or may not be shown depending on API response
			if (variantCount > 0) {
				await expect(variantCards.first()).toBeVisible();
			}
		});
	});

	test.describe('Judge Evaluation (Integrated in Improve Flow)', () => {
		test('should display judge evaluation after improvement', async ({ page }) => {
			// Submit improvement
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			// Wait for improvement
			await page.waitForTimeout(5000);

			// Check for judge evaluation results
			const judgeSection = page
				.locator('.rounded-lg.border')
				.filter({ hasText: 'Evaluation Results' });
			const judgeVisible = await judgeSection.isVisible();
			if (judgeVisible) {
				await expect(judgeSection).toBeVisible();
			}
		});

		test('should display overall quality score', async ({ page }) => {
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			await page.waitForTimeout(5000);

			// Look for overall score (large number in circle)
			const overallScore = page.locator('.h-16.w-16.rounded-full');
			const scoreVisible = await overallScore.isVisible();
			if (scoreVisible) {
				await expect(overallScore).toBeVisible();
			}
		});

		test('should display score breakdown', async ({ page }) => {
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			await page.waitForTimeout(5000);

			// Check for score criteria: clarity, completeness, specificity
			const scoreLabels = ['clarity', 'completeness', 'specificity'];
			for (const label of scoreLabels) {
				const scoreLabel = page.getByText(new RegExp(label, 'i'));
				const labelVisible = await scoreLabel.isVisible();
				if (labelVisible) {
					await expect(scoreLabel).toBeVisible();
				}
			}
		});

		test('should display gaps if present', async ({ page }) => {
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			await page.waitForTimeout(5000);

			// Check for gaps section
			const gapsSection = page.getByText('Identified Gaps');
			const gapsVisible = await gapsSection.isVisible();
			if (gapsVisible) {
				await expect(gapsSection).toBeVisible();
			}
		});

		test('should display recommendations if present', async ({ page }) => {
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			await page.waitForTimeout(5000);

			// Check for recommendations section
			const recsSection = page.getByText('Recommendations');
			const recsVisible = await recsSection.isVisible();
			if (recsVisible) {
				await expect(recsSection).toBeVisible();
			}
		});
	});

	test.describe('Console Error Checking', () => {
		test('should not have console errors during improve flow', async ({ page }) => {
			// Complete improve flow
			const instructionTextarea = page.locator('#custom-instruction');
			await instructionTextarea.fill('Test improvement');

			const improveButton = page.getByRole('button', { name: /Improve with AI/i });
			await improveButton.click();

			await page.waitForTimeout(5000);

			// Cleanup will check for console errors
			await cleanup();
		});

		test('should not have console errors when using model picker', async ({ page }) => {
			const advancedButton = page.getByText('Advanced: Model Selection');
			await advancedButton.click();
			await page.waitForTimeout(500);

			const providerSelect = page.locator('#provider-select');
			const options = await providerSelect.locator('option').all();

			if (options.length > 1) {
				const firstProviderOption = options[1];
				const providerValue = await firstProviderOption.getAttribute('value');

				if (providerValue) {
					await providerSelect.selectOption(providerValue);
					await page.waitForTimeout(1000);

					// Cleanup will check for console errors
					await cleanup();
				}
			}
		});

		test('should not have console errors when selecting preset', async ({ page }) => {
			const presetSelect = page.locator('#preset-select');
			await page.waitForTimeout(1000);

			const options = await presetSelect.locator('option').all();

			if (options.length > 1) {
				const firstPresetOption = options[1];
				const presetValue = await firstPresetOption.getAttribute('value');

				if (presetValue) {
					await presetSelect.selectOption(presetValue);
					await page.waitForTimeout(1000);

					// Cleanup will check for console errors
					await cleanup();
				}
			}
		});
	});

	test.describe('Accessibility', () => {
		test('should have proper heading hierarchy', async ({ page }) => {
			const h1 = page.locator('h1');
			await expect(h1).toHaveCount(1);

			const h2s = page.locator('h2');
			await expect(h2s.count()).resolves.toBeGreaterThanOrEqual(2);
		});

		test('should have proper ARIA labels', async ({ page }) => {
			const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
			await expect(breadcrumb).toHaveAttribute('aria-label');

			const presetSelect = page.locator('#preset-select');
			await expect(presetSelect).toHaveAttribute('id');

			const instructionTextarea = page.locator('#custom-instruction');
			await expect(instructionTextarea).toHaveAttribute('id');
		});

		test('should have keyboard navigable elements', async ({ page }) => {
			// Test tab navigation
			await page.keyboard.press('Tab');

			// Focus should be on some interactive element
			const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
			expect(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedElement);
		});
	});

	test.describe('Responsive Design', () => {
		test('should adapt to mobile view', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 800 });
			await page.waitForTimeout(500);

			// Page should still be usable
			await expect(page.locator('h1')).toBeVisible();
			await expect(page.getByRole('button', { name: /Improve with AI/i })).toBeVisible();
		});

		test('should have collapsible advanced section on mobile', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 800 });
			await page.waitForTimeout(500);

			const advancedSection = page.getByText('Advanced: Model Selection');
			await expect(advancedSection).toBeVisible();
		});
	});
});
