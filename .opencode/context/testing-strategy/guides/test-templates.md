<!-- Context: testing/test-templates | Priority: high | Version: 1.0 | Updated: 2026-03-06 -->

# Test Templates

**Doel**: Complete feature test templates voor consistentie

---

## Feature Test Template

```typescript
// tests/e2e/features/[feature-name].spec.ts
import { test, expect } from '../fixtures/test-helpers';

test.describe('[Feature Name]', () => {
	// FASE 2: Server-Side Tests (Headless)
	test('[F01-S] API returns correct response @server', async ({ request }) => {
		const response = await request.get('/api/prompts');
		expect(response.status()).toBe(200);
		const data = await response.json();
		expect(data).toHaveProperty('prompts');
	});

	test('[F02-S] API validates input @server', async ({ request }) => {
		const response = await request.post('/api/prompts', {
			data: { title: '' } // Invalid
		});
		expect(response.status()).toBe(400);
	});

	// FASE 3: Visual/Frontend Tests (Headed)
	test('[F04-V] Feature renders correctly @visual', async ({
		page,
		consoleErrors,
		networkErrors
	}) => {
		await page.goto('/prompts');
		await page.waitForLoadState('networkidle');
		await expect(page.locator('[data-testid="prompts-list"]')).toBeVisible();
		expect(consoleErrors).toHaveLength(0);
	});

	// ACTOR TESTS
	test('[F07-A] Guest cannot access @actor', async ({ page }) => {
		await page.goto('/prompts');
		await expect(page).toHaveURL('/login');
	});
});
```

---

## Monitoring Fixture

```typescript
// tests/fixtures/test-helpers.ts
import { test as base, expect, type Page } from '@playwright/test';

interface TestFixtures {
	consoleErrors: string[];
	networkErrors: string[];
}

export const test = base.extend<TestFixtures>({
	consoleErrors: [
		async ({ page }, use) => {
			const errors: string[] = [];
			page.on('console', (msg) => {
				if (msg.type() === 'error') errors.push(msg.text());
			});
			await use(errors);
		},
		{ auto: true }
	],

	networkErrors: [
		async ({ page }, use) => {
			const errors: string[] = [];
			page.on('requestfailed', (req) => errors.push(`${req.method()} ${req.url()}`));
			page.on('response', (res) => {
				if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`);
			});
			await use(errors);
		},
		{ auto: true }
	]
});

export { expect };
```

---

## Login Helpers

```typescript
export async function loginAsCustomer(page: Page) {
	await page.goto('/login');
	await page.fill('[name="email"]', 'customer@test.com');
	await page.fill('[name="password"]', 'customer-password');
	await page.click('button[type="submit"]');
	await page.waitForURL('/dashboard');
}

export async function loginAsAdmin(page: Page) {
	await page.goto('/login');
	await page.fill('[name="email"]', 'admin@test.com');
	await page.fill('[name="password"]', 'admin-password');
	await page.click('button[type="submit"]');
	await page.waitForURL('/admin');
}
```

---

## Test ID Convention

```
[Category][Number]-[Phase] [Description]

Categories: F=Feature, U=Unit, V=Visual, A=Actor, S=Server, G=Guest, C=Customer, AD=Admin
Phases: S=Server (Fase 2), V=Visual (Fase 3)

Examples:
  F01-S API returns correct response
  C01 Customer can login successfully
  G04 Guest cannot access dashboard
```

---

## Related

- `testing/fases.md` - Testing phases
- `testing/actor-testing.md` - Actor test matrix
- `testing/state-management.md` - State transitions
