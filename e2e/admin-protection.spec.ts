import { test, expect } from '@playwright/test';
import { authenticateAdmin } from './auth-helper';
import { generateTestPrompt } from './helpers';

test.describe('Admin Route Protection', () => {
	test('should redirect unauthenticated users to login', async ({ page }) => {
		// Try to access admin without authentication
		await page.goto('/admin');

		// Should be redirected to login
		await expect(page).toHaveURL(/.*login.*/);

		// Verify login form is visible
		await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
	});

	test('should allow authenticated users to access admin', async ({ page }) => {
		await authenticateAdmin(page, '/admin');

		// Should be on admin page
		await expect(page).toHaveURL('/admin');

		// Verify admin page is accessible
		await expect(page.getByRole('heading', { name: /settings|admin/i })).toBeVisible();
	});

	test('should protect API endpoints without authentication', async ({ request }) => {
		// Try to access protected API without auth
		const testPrompt = generateTestPrompt();
		const response = await request.post('/api/prompts', {
			data: testPrompt
		});

		// Should return 401
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toContain('Authentication required');
	});

	test('should allow API access with valid session', async ({ page, request, context }) => {
		await authenticateAdmin(page);

		// Get session cookies from browser context
		const cookies = await context.cookies();
		const sessionCookie = cookies.find(
			(c) => c.name.includes('better-auth') || c.name.includes('session')
		);

		// Make request with session cookie
		const testPrompt = generateTestPrompt();
		const response = await request.post('/api/prompts', {
			headers: {
				Cookie: sessionCookie ? `${sessionCookie.name}=${sessionCookie.value}` : '',
				'Content-Type': 'application/json'
			},
			data: testPrompt
		});

		// Should succeed (or fail for other reasons, not auth)
		expect(response.status()).not.toBe(401);
	});

	test('should show login button when logged out and hide admin links', async ({ page }) => {
		// Before login - should show login button
		await page.goto('/');
		await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();

		// Admin links should NOT be visible
		await expect(page.getByRole('link', { name: 'Profile' })).not.toBeVisible();
		await expect(page.getByRole('button', { name: 'Logout' })).not.toBeVisible();

		await authenticateAdmin(page);

		// After login - should show logout button
		await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Login' })).not.toBeVisible();
	});

	test('should protect all admin sub-routes when logged out', async ({ page }) => {
		const adminRoutes = ['/admin/ai-settings', '/admin/profile', '/admin/snippets'];

		for (const route of adminRoutes) {
			await page.goto(route);
			await expect(page).toHaveURL(/.*login.*/);
		}
	});

	test('should clear session on logout', async ({ page }) => {
		await authenticateAdmin(page);

		// Logout
		await page.getByRole('button', { name: 'Logout' }).click();

		// Should redirect to login after logout
		await expect(page).toHaveURL(/.*login.*/);

		// Try to access admin again
		await page.goto('/admin');

		// Should be redirected to login
		await expect(page).toHaveURL(/.*login.*/);
	});

	test('should handle invalid JWT tokens', async ({ request }) => {
		// Make request to protected admin endpoint with invalid token
		const response = await request.get('/api/admin/settings', {
			headers: {
				Authorization: 'Bearer invalid-token-123',
				Accept: 'application/json'
			}
		});

		// Should return 401
		expect(response.status()).toBe(401);
	});

	test('should handle expired JWT tokens', async ({ request }) => {
		// Use a mock expired token
		const expiredToken =
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AbG9jYWxob3N0Iiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid-signature';

		const response = await request.get('/api/admin/settings', {
			headers: {
				Authorization: `Bearer ${expiredToken}`,
				Accept: 'application/json'
			}
		});

		// Should return 401
		expect(response.status()).toBe(401);
	});
});
