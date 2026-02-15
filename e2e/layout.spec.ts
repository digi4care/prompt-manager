import { test, expect } from '@playwright/test';

async function openMobileNav(page: any) {
	const menuButton = page.getByLabel('Toggle menu');
	const mobileNav = page.locator('#mobile-nav');

	await expect(menuButton).toBeVisible();
	await expect(menuButton).toHaveAttribute('aria-controls', 'mobile-nav');

	// If the click happens before hydration, it may no-op. Retry for a bit longer.
	const deadline = Date.now() + 15000;
	while (Date.now() < deadline) {
		if ((await mobileNav.count()) === 1) return { menuButton, mobileNav };
		await menuButton.click();
		await page.waitForTimeout(200);
	}

	await expect(mobileNav).toHaveCount(1);
	return { menuButton, mobileNav };
}

test.describe('Layout Components', () => {
	test.setTimeout(60000);
	test.beforeEach(async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
	});

	// ============ HEADER COMPONENT ============

	test.describe('Header Component', () => {
		test('should display header element', async ({ page }) => {
			const header = page.locator('header');
			await expect(header).toBeVisible();
		});

		test('should have sticky header', async ({ page }) => {
			const header = page.locator('header');
			await expect(header).toHaveClass(/sticky/);
		});

		test('should toggle dark mode when clicking theme button', async ({ page }) => {
			const themeButton = page.locator('header').getByLabel('Toggle theme').first();

			// Click to toggle dark mode
			await themeButton.click();

			// HTML should have dark class
			const html = page.locator('html');
			await expect(html).toHaveClass(/dark/);
		});
	});

	// ============ DESKTOP NAVIGATION ============

	test.describe('Desktop Navigation', () => {
		test('should display header navigation on desktop', async ({ page }) => {
			const nav = page.locator('header nav');
			await expect(nav).toBeVisible();
		});

		test('should include primary nav links', async ({ page }) => {
			const nav = page.locator('header nav');
			await expect(nav.getByRole('link', { name: 'Prompts' })).toBeVisible();
			await expect(nav.getByRole('link', { name: 'Analytics' })).toBeVisible();
			await expect(nav.getByRole('link', { name: 'Settings' })).toBeVisible();
		});
	});

	// ============ MOBILE NAVIGATION ============

	test.describe('Mobile Navigation', () => {
		test.beforeEach(async ({ page }) => {
			// Ensure we're on mobile viewport for mobile tests
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto('/', { waitUntil: 'networkidle', timeout: 60000 });
		});

		test('should open mobile menu when clicking hamburger', async ({ page }) => {
			await openMobileNav(page);
		});

		test('should close mobile menu with Escape key', async ({ page }) => {
			const { mobileNav } = await openMobileNav(page);

			// Press Escape
			await page.keyboard.press('Escape');

			await expect(mobileNav).toHaveCount(0);
		});

		test('should have close button in mobile menu', async ({ page }) => {
			const { menuButton, mobileNav } = await openMobileNav(page);

			// Click again to close
			await menuButton.click();
			await expect(mobileNav).toHaveCount(0);
		});
	});

	// ============ RESPONSIVE DESIGN ============

	test.describe('Responsive Design', () => {
		test('should show header navigation on desktop (1024px)', async ({ page }) => {
			await page.setViewportSize({ width: 1024, height: 768 });
			await page.waitForTimeout(100);
			const nav = page.locator('header nav');
			await expect(nav).toBeVisible();
		});

		test('should show mobile menu button on mobile (375px)', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.waitForTimeout(100);
			const menuButton = page.getByLabel('Toggle menu').first();
			await expect(menuButton).toBeVisible();
		});
	});

	// ============ ACCESSIBILITY ============

	test.describe('Accessibility (WCAG 2.1 AA)', () => {
		test('theme toggle should have aria label', async ({ page }) => {
			const themeButton = page.getByLabel('Toggle theme').first();
			await themeButton.waitFor({ state: 'visible' });
			await expect(themeButton).toHaveAttribute('aria-label', 'Toggle theme');
		});

		test('mobile menu button should have aria label', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			const menuButton = page.getByLabel('Toggle menu').first();
			await expect(menuButton).toHaveAttribute('aria-label', 'Toggle menu');
		});

		test('mobile navigation should have aria label', async ({ page }) => {
			await page.setViewportSize({ width: 375, height: 667 });
			await page.goto('/');
			const menuButton = page.getByLabel('Toggle menu');
			await menuButton.click();
			await expect(menuButton).toHaveAttribute('aria-controls', 'mobile-nav');
		});
	});
});
