<!-- Context: testing/state-management | Priority: critical | Version: 1.0 | Updated: 2026-03-06 -->

# State Management Testing

**Doel**: Verifieer ALLE relevante states bij elke visual test (Fase 3)

---

## State Categories

| Category     | States to Test                              | Verification      |
| ------------ | ------------------------------------------- | ----------------- |
| UI States    | Loading, Success, Error, Empty, Disabled    | Visual + DOM      |
| Data States  | Initial, Populated, Updated, Deleted        | API + UI sync     |
| Navigation   | URL change, History, Active nav             | URL + element     |
| Session      | Authenticated, Anonymous, Expired           | Cookie + redirect |
| Form States  | Pristine, Dirty, Valid, Invalid, Submitting | Form validation   |
| Error States | Validation, Network, Server, Permission     | Error visibility  |

---

## State Transitions

### Form States

```typescript
test('Form: Pristine → Dirty → Valid → Submitting → Success', async ({ page }) => {
	await page.goto('/prompts/new');

	// State: Pristine
	await expect(page.locator('button[type="submit"]')).toBeDisabled();

	// Transition: Pristine → Dirty
	await page.fill('[name="title"]', 'Test');
	await expect(page.locator('[data-testid="form-status"]')).toHaveText('Dirty');

	// Transition: Dirty → Valid
	await page.fill('[name="content"]', 'Test content');
	await expect(page.locator('button[type="submit"]')).toBeEnabled();

	// Transition: Valid → Submitting
	await page.click('button[type="submit"]');
	await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

	// Transition: Submitting → Success
	await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

### Data States

```typescript
test('List: Empty → Populated → Updated → Deleted', async ({ page }) => {
	// State: Empty
	await page.goto('/prompts');
	await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();

	// Transition: Empty → Populated
	await page.click('[data-testid="create-first-prompt"]');
	await createPrompt(page, 'First Prompt');
	await expect(page.locator('[data-testid="prompt-card"]')).toHaveCount(1);

	// Transition: Updated → Deleted (back to empty)
	await page.click('[data-testid="delete"]');
	await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
});
```

### Session States

```typescript
test('Session: Authenticated → Expired → Re-auth', async ({ page }) => {
	await loginAsCustomer(page);
	await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

	// Simulate session expiry
	await page.context().clearCookies();

	// Try authenticated action
	await page.click('[data-testid="create-prompt"]');

	// Transition: Authenticated → Expired (redirect)
	await expect(page).toHaveURL('/login');
});
```

---

## Loading State Testing

```typescript
test('Shows loading skeleton during data fetch', async ({ page }) => {
	// Slow down API
	await page.route('**/api/prompts', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 2000));
		route.continue();
	});

	await page.goto('/prompts');

	// Loading state visible
	await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible();

	// Wait for data
	await expect(page.locator('[data-testid="prompt-card"]')).toBeVisible();
	await expect(page.locator('[data-testid="skeleton-loader"]')).not.toBeVisible();
});
```

---

## State Verification Checklist

```
□ UI States        □ Data States        □ Navigation States
□ Session States   □ Error States       □ Loading States
```

---

## Related

- `testing/fases.md` - Testing phases
- `testing/actor-testing.md` - Actor test matrix
- `testing/state-analysis.md` - Analysis template
