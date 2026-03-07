<!-- Context: testing/actor-testing | Priority: critical | Version: 1.0 | Updated: 2026-03-06 -->

# Actor-Based Testing

**Doel**: Elke actor apart testen met good states, bad states, en cross-actor access

---

## Concept

```
ACTOR TESTING MATRIX

Elke actor test: Good States ✅ + Bad States ❌ + Cross-Actor Access 🚫
```

---

## Actor Types Template

| Actor Type      | Beschrijving   | Rechten           | Test Focus               |
| --------------- | -------------- | ----------------- | ------------------------ |
| Guest           | Niet-ingelogd  | Public pages only | Redirects, public access |
| Customer        | Ingelogde user | Eigen data        | Dashboard, CRUD eigen    |
| Admin           | Beheerder      | Alle data         | Admin routes, alle data  |
| Service Account | API consumer   | API access        | Token auth, rate limits  |

---

## Test Matrix Example

### Actor: Guest (Niet-ingelogd)

**Good States ✅**
| Test ID | Scenario | Expected Result | Fase |
|---------|----------|-----------------|------|
| G01 | Homepage laden | 200 OK, public content | 3 |
| G02 | Login pagina | 200 OK, login form | 3 |
| G03 | Public prompt bekijken | 200 OK, prompt content | 3 |

**Bad States ❌**
| Test ID | Scenario | Expected Result | Fase |
|---------|----------|-----------------|------|
| G04 | Dashboard toegang | Redirect naar /login | 2,3 |
| G05 | API call zonder token | 401 Unauthorized | 2 |
| G06 | Admin route toegang | Redirect naar /login | 2,3 |

---

### Actor: Customer (Ingelogde gebruiker)

**Good States ✅**
| Test ID | Scenario | Expected Result | Fase |
|---------|----------|-----------------|------|
| C01 | Login met geldige creds | Redirect naar /dashboard | 2,3 |
| C02 | Eigen prompts ophalen | 200 OK, lijst met prompts | 2 |
| C03 | Nieuwe prompt aanmaken | 201 Created | 2,3 |

**Bad States ❌**
| Test ID | Scenario | Expected Result | Fase |
|---------|----------|-----------------|------|
| C06 | Login met foute creds | 401, error message | 2,3 |
| C07 | Andere user's prompt | 403 Forbidden OF 404 | 2 |
| C08 | Admin route toegang | 403 Forbidden / redirect | 2,3 |

---

## Implementation

```typescript
// tests/e2e/actors/customer.spec.ts
import { test, expect } from '../fixtures/test-helpers';

test.describe('Actor: Customer', () => {
	test('[C01] Customer can login successfully', async ({ page, consoleErrors }) => {
		await page.goto('/login');
		await page.fill('[name="email"]', 'customer@test.com');
		await page.fill('[name="password"]', 'valid-password');
		await page.click('button[type="submit"]');

		await expect(page).toHaveURL('/dashboard');
		expect(consoleErrors).toHaveLength(0);
	});

	test('[C08] Customer cannot access admin routes', async ({ page }) => {
		await loginAsCustomer(page);
		await page.goto('/admin');
		await expect(page).not.toHaveURL('/admin');
	});
});

async function loginAsCustomer(page: Page) {
	await page.goto('/login');
	await page.fill('[name="email"]', 'customer@test.com');
	await page.fill('[name="password"]', 'valid-password');
	await page.click('button[type="submit"]');
	await page.waitForURL('/dashboard');
}
```

---

## Related

- `testing/fases.md` - Testing phases
- `testing/test-templates.md` - Complete test templates
