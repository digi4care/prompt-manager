import { test, expect } from '@playwright/test';

function setupConsoleErrorCheck(page: any): () => Promise<void> {
	const errors: string[] = [];
	const handler = (msg: any) => {
		if (msg.type() === 'error') errors.push(msg.text());
	};
	page.on('console', handler);

	return async () => {
		page.off('console', handler);
		const realErrors = errors.filter((e) => !e.includes('message port closed'));
		expect(realErrors).toHaveLength(0);
	};
}

test.describe('Smoke - Settings + Edit Page', () => {
	test('settings loads and edit flow has no console errors', async ({ page, request }) => {
		test.setTimeout(90_000);
		const cleanup = setupConsoleErrorCheck(page);
		try {
			// Settings
			await page.goto('/admin');
			await expect(page.getByRole('heading', { name: /admin settings/i })).toBeVisible();
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(500);

			// Resolve a prompt id via API (more stable than UI click navigation).
			const listRes = await request.get('/api/prompts?limit=1&offset=0');
			expect(listRes.ok()).toBe(true);
			const listJson = (await listRes.json()) as any;

			let promptId: number | undefined = listJson?.data?.prompts?.[0]?.id;
			if (!promptId) {
				const uniqueTitle = `Smoke Prompt ${Date.now()}`;
				const createRes = await request.post('/api/prompts', {
					data: {
						title: uniqueTitle,
						content: 'Hello from smoke test',
						tags: [],
						llmProviders: []
					}
				});
				expect(createRes.ok()).toBe(true);
				const created = (await createRes.json()) as any;
				promptId = created?.id;
			}

			if (promptId) {
				const detailRes = await request.get(`/api/prompts/${promptId}`);
				if (!detailRes.ok()) {
					const uniqueTitle = `Smoke Prompt ${Date.now()}`;
					const createRes = await request.post('/api/prompts', {
						data: {
							title: uniqueTitle,
							content: 'Hello from smoke test',
							tags: [],
							llmProviders: []
						}
					});
					expect(createRes.ok()).toBe(true);
					const created = (await createRes.json()) as any;
					promptId = created?.id;
				}
			}

			expect(typeof promptId).toBe('number');

			await page.goto(`/prompts/${promptId}`);
			await expect(page.getByRole('button', { name: /^edit$/i })).toBeVisible();

			// Navigate to edit page directly (smoke goal is that the edit route loads)
			await page.goto(`/prompts/${promptId}/edit`);
			await expect(page.locator('#save-changes-button')).toBeVisible();
		} finally {
			await cleanup();
		}
	});
});
