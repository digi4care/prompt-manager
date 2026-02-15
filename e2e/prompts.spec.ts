import { test, expect } from '@playwright/test';

test.describe('PromptList Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
		await page.waitForLoadState('networkidle');
	});

	test('should display prompt list section', async ({ page }) => {
		const section = page.locator('#prompts-section #prompt-list-container').first();
		await expect(section).toBeVisible();
	});

	test('should display prompts in grid', async ({ page }) => {
		// Grid container should be visible
		const grid = page.locator('#prompts-section #prompt-list-container .grid');
		await expect(grid.first()).toBeVisible();
	});

	test('should display at least one prompt card', async ({ page }) => {
		// Check that at least one card is rendered in list
		const cards = page.locator('#prompts-section [role="button"]');
		await expect(cards.first()).toBeVisible();
	});

	test('should show purpose badges', async ({ page }) => {
		// Purpose badges should be visible in cards
		const badges = page.locator('#prompts-section [role="button"] span[class*="rounded"]');
		await expect(badges.first()).toBeVisible();
	});
});

test.describe('PromptCard Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
		await page.waitForLoadState('networkidle');
		setupConsoleErrorCheck(page);
	});

	test('should render prompt cards', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const cards = listContainer.locator('[role="button"]');
		await expect(cards).toHaveCount(3);
	});

	test('should display prompt title on first card', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const firstCard = listContainer.locator('[role="button"]').first();
		await expect(firstCard.locator('h3')).toHaveText('SQL Query Generator');
	});

	test('should display prompt description', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const firstCard = listContainer.locator('[role="button"]').first();
		await expect(firstCard.locator('p')).toHaveText(
			'Generates optimized SQL queries based on natural language descriptions of data requirements.'
		);
	});

	test('should display metadata', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const firstCard = listContainer.locator('[role="button"]').first();
		// Check for tags display
		await expect(firstCard.locator('span').filter({ hasText: 'sql' }).first()).toBeVisible();
	});

	test('should be clickable', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const card = listContainer.locator('[role="button"]').first();
		await card.click();
		// Check if navigation occurred
	});

	test('should show edit button', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const card = listContainer.locator('[role="button"]').first();
		await card.hover();
		const menuTrigger = card.locator('button').first();
		await menuTrigger.click({ force: true });
		const editItem = page.locator('[role="menuitem"]').filter({ hasText: 'Edit' });
		await expect(editItem).toBeVisible();
	});

	test('should show delete button', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const card = listContainer.locator('[role="button"]').first();
		await card.hover();
		const menuTrigger = card.locator('button').first();
		await menuTrigger.click({ force: true });
		const deleteItem = page.locator('[role="menuitem"]').filter({ hasText: 'Delete' });
		await expect(deleteItem).toBeVisible();
	});

	test('should display tags', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const card = listContainer.locator('[role="button"]').first();
		// Look for tags in span elements specifically
		await expect(card.locator('span').filter({ hasText: 'sql' }).first()).toBeVisible();
	});
});

test.describe('Prompt Library Page', () => {
	// TODO: Skip these tests temporarily due to empty database
	// Will implement Optie 2 (test data seeding) after pagination feature
	test.beforeEach(async ({ page }) => {
		await page.goto('/prompts');
	});

	test.skip('should display prompt library section', async ({ page }) => {
		await expect(page.locator('#prompt-library-section')).toBeVisible();
	});

	test.skip('should show page header', async ({ page }) => {
		const header = page.locator('#prompt-library-section >> h1:has-text("Prompt Library")');
		await expect(header).toBeVisible();
	});

	test.skip('should show page description', async ({ page }) => {
		const description = page.locator(
			'#prompt-library-section >> text=Browse and manage your collection'
		);
		await expect(description).toBeVisible();
	});

	test.skip('should have New Prompt button', async ({ page }) => {
		const newPromptButton = page
			.locator('#prompt-library-section button, #prompt-library-section a')
			.filter({ hasText: 'New Prompt' });
		await expect(newPromptButton.first()).toBeVisible();
	});

	test.skip('should show prompt count display', async ({ page }) => {
		const countDisplay = page
			.locator('text=/\\d+ prompt/')
			.filter({ hasText: 'in your library' })
			.first();
		await expect(countDisplay).toBeVisible();
	});

	test.skip('should show prompt count value', async ({ page }) => {
		const countValue = page.locator('#prompt-count');
		await expect(countValue).toBeVisible();
		expect(await countValue.textContent()).toMatch(/\\d+ prompt/);
	});

	test.skip('should have sidebar with search section', async ({ page }) => {
		const searchSection = page.locator('#search-sidebar-section');
		await expect(searchSection).toBeVisible();
	});

	test.skip('should have sidebar with filter section', async ({ page }) => {
		const filterSection = page.locator('#filter-sidebar-section');
		await expect(filterSection).toBeVisible();
	});

	test.skip('should have sidebar with sort section', async ({ page }) => {
		const sortSection = page.locator('#sort-sidebar-section');
		await expect(sortSection).toBeVisible();
	});

	test.skip('should have sidebar with quick actions section', async ({ page }) => {
		const quickActionsSection = page.locator('#quick-actions-sidebar-section');
		await expect(quickActionsSection).toBeVisible();
	});

	test.skip('should have Create New Prompt quick action', async ({ page }) => {
		const createButton = page.locator(
			'#quick-actions-sidebar-section >> button:has-text("Create New Prompt")'
		);
		await expect(createButton).toBeVisible();
	});

	test.skip('should have Back to Home quick action', async ({ page }) => {
		const backButton = page.locator(
			'#quick-actions-sidebar-section >> button:has-text("Back to Home")'
		);
		await expect(backButton).toBeVisible();
	});

	test.skip('should have correct sidebar grid layout', async ({ page }) => {
		// The sidebar should be in a 4-column grid layout
		const sidebar = page.locator('#prompt-library-section aside');
		await expect(sidebar).toBeVisible();
	});

	test.skip('should have main content area', async ({ page }) => {
		const mainContent = page.locator('#prompt-library-section main');
		await expect(mainContent).toBeVisible();
	});

	test.skip('should display PromptList in main content', async ({ page }) => {
		const promptList = page.locator('#prompt-library-section #prompt-list-container');
		await expect(promptList).toBeVisible();
	});

	test.skip('should show sidebar section icons', async ({ page }) => {
		// Check that search icon is visible
		const searchIcon = page.locator('#search-sidebar-section svg');
		await expect(searchIcon).toBeVisible();

		// Check that filter icon is visible
		const filterIcon = page.locator('#filter-sidebar-section svg');
		await expect(filterIcon).toBeVisible();
	});

	test.skip('should have responsive grid layout', async ({ page }) => {
		// On desktop, sidebar and main should be side by side
		// The first grid is the main layout grid
		const gridContainer = page.locator('#prompt-library-section .grid').first();
		await expect(gridContainer).toBeVisible();
	});
});

test.describe.skip('Prompt Library Page Navigation', () => {
	// TODO: Skip these tests temporarily due to empty database
	// Will implement Optie 2 (test data seeding) after pagination feature
	test.beforeEach(async ({ page }) => {
		await page.goto('/prompts');
	});

	test.skip('New Prompt button should exist', async ({ page }) => {
		const newPromptButton = page
			.locator('#prompt-library-section button, #prompt-library-section a')
			.filter({ hasText: 'New Prompt' });
		await expect(newPromptButton.first()).toBeVisible();
	});

	test.skip('Create New Prompt quick action should be visible', async ({ page }) => {
		const createButton = page
			.locator('#quick-actions-sidebar-section button')
			.filter({ hasText: 'Create New Prompt' });
		await expect(createButton).toBeVisible();
	});

	test.skip('Back to Home quick action should be visible', async ({ page }) => {
		const backButton = page
			.locator('#quick-actions-sidebar-section button')
			.filter({ hasText: 'Back to Home' });
		await expect(backButton).toBeVisible();
	});
});

test.describe.skip('Prompt Library Page Accessibility', () => {
	// TODO: Skip these tests temporarily due to empty database
	// Will implement Optie 2 (test data seeding) after pagination feature
	test.beforeEach(async ({ page }) => {
		await page.goto('/prompts');
	});

	test.skip('page header should have correct heading level', async ({ page }) => {
		const header = page.locator('#prompt-library-section h1');
		await expect(header).toHaveCount(1);
	});

	test.skip('sidebar sections should have headings', async ({ page }) => {
		const sidebarHeadings = page.locator('#prompt-library-section aside h3');
		await expect(sidebarHeadings).toHaveCount(4);
	});

	test('buttons should be focusable', async ({ page }) => {
		const newPromptButton = page
			.locator('#prompt-library-section button, #prompt-library-section a')
			.filter({ hasText: 'New Prompt' });
		await newPromptButton.first().focus();
		await expect(newPromptButton.first()).toBeFocused();
	});

	test('quick action buttons should be focusable', async ({ page }) => {
		const createButton = page.locator('#quick-actions-sidebar-section button').first();
		await createButton.focus();
		await expect(createButton).toBeFocused();
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
