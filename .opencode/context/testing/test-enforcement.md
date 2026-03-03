# Test Enforcement Guideline

**Versie:** 2.1 | **Type:** Multi-Project Agnostisch | **Runtime:** Bun | **Doel:** Gefaseerde test compliance met kwaliteitsgarantie

---

## 🎯 Testing Philosophy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   TESTING IN 3 FASEN = COMPLETE FEATURE VALIDATION                          │
│                                                                             │
│   Fase 1: CLI/Unit Testing        → Playwright headless / Vitest            │
│   Fase 2: Server-Side Testing     → Playwright headless (server focus)      │
│   Fase 3: Visual Frontend Testing → Playwright headed (browser zichtbaar)   │
│                                                                             │
│   Elke fase MOET passeren voordat de volgende start                         │
│   Geen fase mag worden overgeslagen                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ CRITICAL: Multi-Project Environment

Dit systeem draait **meerdere projecten** simultaan. Volg deze regels STRICT:

### Service Isolation Protocol

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REGEL: Ken je project → Ken je poorten → Kill alleen jouw services         │
│                                                                             │
│  VERBODEN: Global kills die andere projecten beïnvloeden                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Service Registry

Elk project registreert actieve services:

```bash
# Locatie: .tmp/services/{project-name}/registry.json
{
  "project": "prompt-manager",
  "pid": 12345,
  "services": [
    {
      "name": "dev-server",
      "type": "sveltekit",
      "port": 45678,
      "pid": 12346,
      "started": "2026-03-03T10:00:00Z",
      "command": "npm run dev"
    }
  ]
}
```

### Safe Service Operations

| Actie                 | ✅ Correct                                       | ❌ Verboden                    |
| --------------------- | ------------------------------------------------ | ------------------------------ |
| Server starten        | `npm run dev` → noteer port in registry          | Zonder registry update         |
| Server stoppen        | `lsof -ti:45678 \| xargs kill` (specifieke port) | `killall node`                 |
| Port checken          | `lsof -i :45678`                                 | Aannemen dat port vrij is      |
| Cleanup alle services | Alleen eigen project services uit registry       | `pkill -f "vite"` of `killall` |

### Service Kill Procedure

```bash
# ✅ CORRECT - Project-specifieke service kill
kill_project_service() {
  local project=$1
  local service_name=$2
  local registry=".tmp/services/${project}/registry.json"

  if [ -f "$registry" ]; then
    local port=$(jq -r ".services[] | select(.name == \"$service_name\") | .port" "$registry")
    if [ -n "$port" ] && [ "$port" != "null" ]; then
      lsof -ti:$port | xargs kill -9 2>/dev/null || true
      echo "Killed $service_name on port $port for project $project"
    fi
  fi
}

# ❌ NOOIT DOEEN - Globale kills
killall node           # VERBODEN - killt ALLE projecten
pkill -f "vite"        # VERBODEN - killt ALLE vite servers
pkill -f "sveltekit"   # VERBODEN - killt ALLE sveltekit servers
```

### 🎭 Playwright Multi-Project Isolatie

Playwright draait **veilig** in multi-project omgevingen, maar dev servers moeten geïsoleerd blijven:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Playwright: Stateless, geen conflicts tussen projecten                     │
│  Dev Server: Moet project-specifiek worden beheerd                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Resource               | Gedrag                           | Isolatie                  |
| ---------------------- | -------------------------------- | ------------------------- |
| **Playwright Browser** | Nieuwe instance per test run     | ✅ Geen actie nodig       |
| **Browser Context**    | Geïsoleerd per test              | ✅ Geen actie nodig       |
| **Dev Server**         | Moet draaien op specifieke poort | ❌ Moet handmatig beheren |
| **Test Artifacts**     | `playwright-report/` per run     | ✅ Geen conflict          |

**Wanneer Playwright draait:**

```bash
# ✅ CORRECT - Start dev server voor test, stop daarna
bun run dev &
sleep 5
bun run test:e2e
lsof -ti:45678 | xargs kill -9

# ❌ VERBODEN - Andere project servers doden
killall node           # VERBODEN
pkill -f "playwright"  # VERBODEN - Playwright is stateless
```

**Dev Server + Playwright Workflow:**

```bash
# Stap 1: Start dev server en registreer
bun run dev
echo '{"project":"prompt-manager","services":[{"name":"dev-server","port":45678}]}' > .tmp/services/prompt-manager/registry.json

# Stap 2: Run Playwright tests
bun run test:e2e

# Stap 3: Stop ALLEEN jouw server
lsof -ti:45678 | xargs kill -9
# ✅ Andere projecten blijven draaien!
```

---

## 📊 Testing Fasen

### Fase 1: CLI/Unit Testing

**Doel:** Pure logica, utilities, services zonder UI/server dependency

| Aspect          | Specificatie                                           |
| --------------- | ------------------------------------------------------ | ---------- | ------------ |
| Tool            | Vitest (unit) / Playwright CLI (integration)           |
| Mode            | Headless (geen browser, geen server)                   |
| Focus           | Business logic, pure functions, API contracts, schemas |
| Coverage target | Critical: 100%                                         | High: 90%+ | Medium: 80%+ |
| Server required | NEE                                                    |

**Wanneer uitvoeren:**

- Na elke code wijziging (watch mode)
- Pre-commit hook
- CI/CD pipeline eerste stap

```bash
# Commando's (Bun)
bun run test              # Vitest unit tests
bun run test:watch        # Watch mode tijdens development
bun run test:coverage     # Met coverage rapport
```

**Fase 1 Complete Checklist:**

```
□ Alle unit tests pass
□ Coverage target behaald
□ Geen TypeScript errors
□ Geen console errors/warnings
□ Pre-commit hooks pass
```

---

### Fase 2: Server-Side Integration Testing

**Doel:** Server routes, API endpoints, database operaties, authentication

| Aspect          | Specificatie                                        |
| --------------- | --------------------------------------------------- |
| Tool            | Playwright (headless mode)                          |
| Mode            | Headless (browser onzichtbaar, snel)                |
| Focus           | HTTP responses, auth flows, API contracts, database |
| Server required | JA - Dev server MOET draaien                        |
| Browser visible | NEE - headless                                      |

**Procedure:**

```bash
# Stap 1: Start dev server (noteer port!)
bun run dev
# Output: Server started on http://127.0.0.1:45678

# Stap 2: Registreer service
echo '{"project":"prompt-manager","services":[{"name":"dev-server","port":45678}]}' > .tmp/services/prompt-manager/registry.json

# Stap 3: Run server tests
bun run test:e2e -- --grep "@server" --project=chromium

# Stap 4: Stop server (ALLEEN deze port!)
lsof -ti:45678 | xargs kill -9
```

**Test Focus Areas:**

- API response codes (200, 201, 400, 401, 403, 404, 500)
- Request/response payload validation
- Authentication token flows (login, refresh, logout)
- Authorization checks per actor type
- Rate limiting behavior
- Database CRUD operations
- Error handling en error messages

**Fase 2 Complete Checklist:**

```
□ Dev server gestart (port genoteerd in registry)
□ Alle server-side tests pass
□ API responses correct
□ Auth flows werken
□ Error handling correct
□ Geen console errors
□ Geen network errors (4xx/5xx onverwacht)
□ Server gestopt (alleen deze poort!)
```

---

### Fase 3: Visual Frontend Testing

**Doel:** UI rendering, user interactions, state transitions, actor flows, visual regression

| Aspect             | Specificatie                                            |
| ------------------ | ------------------------------------------------------- |
| Tool               | Playwright (headed mode, UI mode)                       |
| Mode               | **HEADED** (browser zichtbaar, kan interacteren)        |
| Focus              | Visual states, actor scenarios, UX flows, accessibility |
| Server required    | JA - Dev server MOET draaien                            |
| Browser visible    | JA - browser opent visueel                              |
| Human verification | Aanbevolen voor critical visual changes                 |

**Procedure:**

```bash
# Stap 1: Start dev server (indien niet al draaiend)
bun run dev

# Stap 2: Run visual tests in UI mode (browser opent)
bun run test:e2e -- --ui --headed

# Of specifiek voor visual/actor tests
bun run test:e2e -- --grep "@visual|@actor" --headed --project=chromium

# Stap 3: Observe en verifieer visueel
# - Browser opent
# - States veranderen correct
# - Actor transitions werken
# - Error states tonen juist
# - Accessibility checks pass

# Stap 4: Stop server (ALLEEN deze port!)
lsof -ti:45678 | xargs kill -9
```

**Fase 3 Complete Checklist:**

```
□ Browser tests uitgevoerd (headed mode)
□ Alle actors getest (zie Actor-Based Testing)
□ Good states geverifieerd
□ Bad states geverifieerd
□ State transitions correct
□ Cross-actor access control werkt
□ Loading/Success/Error states visueel correct
□ Geen visuele regressies
□ Accessibility checks pass
□ Server gestopt (alleen deze poort!)
```

---

## 🎭 Actor-Based Testing

### Concept: Multi-Actor System Testing

Projecten hebben vaak **meerdere actors** (user types). Elke actor MOET apart getest worden:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ACTOR TESTING MATRIX                                                       │
│                                                                             │
│  Elke actor test: Good States ✅ + Bad States ❌ + Cross-Actor Access 🚫    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Actor Types Template

| Actor Type      | Beschrijving            | Rechten                | Test Focus               |
| --------------- | ----------------------- | ---------------------- | ------------------------ |
| Guest           | Niet-ingelogde bezoeker | Public pages only      | Redirects, public access |
| Customer        | Ingelogde gebruiker     | Eigen data             | Dashboard, CRUD eigen    |
| Admin           | Beheerder               | Alle data, admin panel | Admin routes, alle data  |
| Service Account | API consumer (machine)  | API access             | Token auth, rate limits  |

### Actor Test Matrix Voorbeeld

```markdown
## Project: Prompt Manager

### Actor: Guest (Niet-ingelogd)

#### Good States ✅

| Test ID | Scenario               | Expected Result        | Fase |
| ------- | ---------------------- | ---------------------- | ---- |
| G01     | Homepage laden         | 200 OK, public content | 3    |
| G02     | Login pagina openen    | 200 OK, login form     | 3    |
| G03     | Public prompt bekijken | 200 OK, prompt content | 3    |

#### Bad States ❌

| Test ID | Scenario              | Expected Result      | Fase |
| ------- | --------------------- | -------------------- | ---- |
| G04     | Dashboard toegang     | Redirect naar /login | 2,3  |
| G05     | API call zonder token | 401 Unauthorized     | 2    |
| G06     | Admin route toegang   | Redirect naar /login | 2,3  |

---

### Actor: Customer (Ingelogde gebruiker)

#### Good States ✅

| Test ID | Scenario                 | Expected Result              | Fase |
| ------- | ------------------------ | ---------------------------- | ---- |
| C01     | Login met geldige creds  | Redirect naar /dashboard     | 2,3  |
| C02     | Eigen prompts ophalen    | 200 OK, lijst met prompts    | 2    |
| C03     | Nieuwe prompt aanmaken   | 201 Created, prompt saved    | 2,3  |
| C04     | Eigen prompt bewerken    | 200 OK, wijziging opgeslagen | 2,3  |
| C05     | Eigen prompt verwijderen | 204 No Content, prompt weg   | 2,3  |

#### Bad States ❌

| Test ID | Scenario                      | Expected Result             | Fase |
| ------- | ----------------------------- | --------------------------- | ---- |
| C06     | Login met foute creds         | 401, error message          | 2,3  |
| C07     | Andere user's prompt bekijken | 403 Forbidden OF 404        | 2    |
| C08     | Admin route toegang           | 403 Forbidden / redirect    | 2,3  |
| C09     | Session expired               | Redirect naar /login        | 2,3  |
| C10     | Invalid data submit           | 400 Bad Request, validation | 2,3  |

---

### Actor: Admin

#### Good States ✅

| Test ID | Scenario                 | Expected Result          | Fase |
| ------- | ------------------------ | ------------------------ | ---- |
| A01     | Admin login              | Redirect naar /admin     | 2,3  |
| A02     | Alle users bekijken      | 200 OK, alle users       | 2,3  |
| A03     | Alle prompts bekijken    | 200 OK, alle prompts     | 2,3  |
| A04     | User blokkeren           | 200 OK, user geblokkeerd | 2,3  |
| A05     | Prompt verwijderen (any) | 204 No Content           | 2,3  |

#### Bad States ❌

| Test ID | Scenario             | Expected Result             | Fase |
| ------- | -------------------- | --------------------------- | ---- |
| A06     | Invalid admin action | 400/500, error message      | 2,3  |
| A07     | Zichzelf deadminisen | 403 Forbidden (bescherming) | 2,3  |
```

### Actor Test Implementation

```typescript
// tests/e2e/actors/customer.spec.ts
import { test, expect } from '../fixtures/test-helpers';

test.describe('Actor: Customer', () => {
	// ===========================================
	// GOOD STATES ✅
	// ===========================================

	test('[C01] Customer can login successfully', async ({ page, consoleErrors, networkErrors }) => {
		// Arrange
		await page.goto('/login');

		// Act
		await page.fill('[name="email"]', 'customer@test.com');
		await page.fill('[name="password"]', 'valid-password');
		await page.click('button[type="submit"]');

		// Assert - Redirect
		await expect(page).toHaveURL('/dashboard');
		await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();

		// Assert - No errors
		expect(consoleErrors).toHaveLength(0);
		expect(networkErrors).toHaveLength(0);
	});

	test('[C03] Customer can create new prompt', async ({ page }) => {
		// Arrange - Login first
		await loginAsCustomer(page);
		await page.goto('/prompts/new');

		// Act
		await page.fill('[name="title"]', 'Test Prompt');
		await page.fill('[name="content"]', 'This is test content');
		await page.click('button[type="submit"]');

		// Assert
		await expect(page).toHaveURL(/\/prompts\/[\w-]+/);
		await expect(page.locator('text=Test Prompt')).toBeVisible();
	});

	// ===========================================
	// BAD STATES ❌
	// ===========================================

	test('[C06] Customer login fails with invalid credentials', async ({ page }) => {
		await page.goto('/login');

		await page.fill('[name="email"]', 'customer@test.com');
		await page.fill('[name="password"]', 'wrong-password');
		await page.click('button[type="submit"]');

		// Assert - Error state visible
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
		await expect(page).toHaveURL('/login'); // Stays on login
	});

	test('[C08] Customer cannot access admin routes', async ({ page }) => {
		// Arrange - Login as customer
		await loginAsCustomer(page);

		// Act - Try admin route
		await page.goto('/admin');

		// Assert - Blocked
		await expect(page).not.toHaveURL('/admin');
		// OF: await expect(page.locator('text=403')).toBeVisible();
		// OF: await expect(page.locator('text=Forbidden')).toBeVisible();
	});

	test('[C07] Customer cannot view other users prompts', async ({ page }) => {
		await loginAsCustomer(page);

		// Act - Try to access another user's prompt
		const response = await page.goto('/prompts/other-user-prompt-id');

		// Assert - Forbidden or Not Found
		expect([403, 404]).toContain(response?.status() || 0);
	});
});

// Helper function
async function loginAsCustomer(page: Page) {
	await page.goto('/login');
	await page.fill('[name="email"]', 'customer@test.com');
	await page.fill('[name="password"]', 'valid-password');
	await page.click('button[type="submit"]');
	await page.waitForURL('/dashboard');
}
```

---

## 🔍 State Management Testing

### Frontend State Verification Matrix

Bij elke visual test (Fase 3), verifieer ALLE relevante states:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  STATE VERIFICATION CHECKLIST                                               │
│                                                                             │
│  □ UI States        □ Data States        □ Navigation States               │
│  □ Session States   □ Error States       □ Loading States                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Categories

| Category     | States to Test                               | Verification Method      |
| ------------ | -------------------------------------------- | ------------------------ |
| UI States    | Loading, Success, Error, Empty, Disabled     | Visual + DOM assertions  |
| Data States  | Initial, Populated, Updated, Deleted         | API + UI sync            |
| Navigation   | URL change, History, Active nav, Breadcrumbs | URL + element assertions |
| Session      | Authenticated, Anonymous, Expired, Refreshed | Cookie + redirect checks |
| Form States  | Pristine, Dirty, Valid, Invalid, Submitting  | Form validation + UI     |
| Error States | Validation, Network, Server, Permission      | Error message visibility |

### State Transition Testing

```typescript
// tests/e2e/states/form-states.spec.ts
test.describe('Form State Transitions', () => {
	test('Form: Pristine → Dirty → Valid → Submitting → Success', async ({ page }) => {
		await page.goto('/prompts/new');

		// State: Pristine
		await expect(page.locator('button[type="submit"]')).toBeDisabled();
		await expect(page.locator('[data-testid="form-status"]')).toHaveText('Pristine');

		// Transition: Pristine → Dirty
		await page.fill('[name="title"]', 'Test');
		await expect(page.locator('[data-testid="form-status"]')).toHaveText('Dirty');

		// State: Dirty + Invalid (missing content)
		await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();

		// Transition: Dirty → Valid
		await page.fill('[name="content"]', 'Test content');
		await expect(page.locator('button[type="submit"]')).toBeEnabled();
		await expect(page.locator('[data-testid="validation-error"]')).not.toBeVisible();

		// Transition: Valid → Submitting
		await page.click('button[type="submit"]');
		await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeDisabled();

		// Transition: Submitting → Success
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
		await expect(page).toHaveURL(/\/prompts\/[\w-]+/);
	});

	test('Form: Submitting → Error → Retry', async ({ page }) => {
		// Mock server error
		await page.route('**/api/prompts', (route) =>
			route.fulfill({ status: 500, body: 'Server Error' })
		);

		await page.goto('/prompts/new');
		await page.fill('[name="title"]', 'Test');
		await page.fill('[name="content"]', 'Test content');
		await page.click('button[type="submit"]');

		// Transition: Submitting → Error
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
		await expect(page.locator('button[data-testid="retry"]')).toBeEnabled();

		// Fix mock and retry
		await page.unroute('**/api/prompts');
		await page.click('button[data-testid="retry"]');

		// Transition: Error → Success
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
	});

	test('Session: Authenticated → Expired → Re-auth', async ({ page }) => {
		// Login
		await loginAsCustomer(page);
		await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

		// Simulate session expiry
		await page.context().clearCookies();

		// Try authenticated action
		await page.click('[data-testid="create-prompt"]');

		// Transition: Authenticated → Expired (redirect)
		await expect(page).toHaveURL('/login');
		await expect(page.locator('text=session expired')).toBeVisible();
	});
});

// tests/e2e/states/data-states.spec.ts
test.describe('Data State Transitions', () => {
	test('List: Empty → Populated → Updated → Deleted', async ({ page }) => {
		// State: Empty
		await page.goto('/prompts');
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
		await expect(page.locator('text=No prompts yet')).toBeVisible();

		// Transition: Empty → Populated
		await page.click('[data-testid="create-first-prompt"]');
		await createPrompt(page, 'First Prompt');
		await page.goto('/prompts');
		await expect(page.locator('[data-testid="prompt-card"]')).toHaveCount(1);

		// Transition: Populated → Updated
		await page.click('[data-testid="prompt-card"]:first-child [data-testid="edit"]');
		await page.fill('[name="title"]', 'Updated Title');
		await page.click('button[type="submit"]');
		await expect(page.locator('text=Updated Title')).toBeVisible();

		// Transition: Updated → Deleted (back to empty)
		await page.click('[data-testid="delete"]');
		await page.click('[data-testid="confirm-delete"]');
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
	});
});
```

### Loading State Testing

```typescript
test.describe('Loading States', () => {
	test('Shows loading skeleton during data fetch', async ({ page }) => {
		// Slow down API
		await page.route('**/api/prompts', async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			route.continue();
		});

		await page.goto('/prompts');

		// Loading state visible
		await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible();
		await expect(page.locator('[data-testid="prompt-card"]')).not.toBeVisible();

		// Wait for data
		await expect(page.locator('[data-testid="prompt-card"]')).toBeVisible();
		await expect(page.locator('[data-testid="skeleton-loader"]')).not.toBeVisible();
	});

	test('Shows inline loading for actions', async ({ page }) => {
		await loginAsCustomer(page);
		await page.goto('/prompts/new');

		await page.fill('[name="title"]', 'Test');
		await page.fill('[name="content"]', 'Content');

		// Before submit
		const submitBtn = page.locator('button[type="submit"]');
		await expect(submitBtn).toHaveText('Create Prompt');

		// During submit
		await page.click('button[type="submit"]');
		await expect(submitBtn).toHaveText('Creating...');
		await expect(submitBtn).toBeDisabled();

		// After submit
		await expect(submitBtn).not.toBeVisible(); // Redirected
	});
});
```

---

## 📋 Test Templates

### Complete Feature Test Template

```typescript
// tests/e2e/features/[feature-name].spec.ts
import { test, expect } from '../fixtures/test-helpers';

test.describe('[Feature Name]', () => {
	// ===========================================
	// FASE 1: Unit Tests (Vitest) - zie tests/unit/
	// ===========================================

	// ===========================================
	// FASE 2: Server-Side Tests (Headless)
	// ===========================================

	test('[F01-S] API returns correct response @server', async ({ request }) => {
		const response = await request.get('/api/prompts');
		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('prompts');
		expect(Array.isArray(data.prompts)).toBe(true);
	});

	test('[F02-S] API validates input @server', async ({ request }) => {
		const response = await request.post('/api/prompts', {
			data: { title: '' } // Invalid
		});
		expect(response.status()).toBe(400);
	});

	test('[F03-S] API requires authentication @server', async ({ request }) => {
		const response = await request.post('/api/prompts', {
			data: { title: 'Test', content: 'Test' }
		});
		expect(response.status()).toBe(401);
	});

	// ===========================================
	// FASE 3: Visual/Frontend Tests (Headed)
	// ===========================================

	test('[F04-V] Feature renders correctly @visual', async ({
		page,
		consoleErrors,
		networkErrors
	}) => {
		await page.goto('/prompts');
		await page.waitForLoadState('networkidle');

		// Visual check
		await expect(page.locator('[data-testid="prompts-list"]')).toBeVisible();

		// Screenshot (optional)
		await expect(page).toHaveScreenshot('prompts-list.png');

		// No errors
		expect(consoleErrors).toHaveLength(0);
		expect(networkErrors).toHaveLength(0);
	});

	test('[F05-V] Feature handles loading state @visual', async ({ page }) => {
		await page.route('**/api/prompts', (route) =>
			route.fulfill({ status: 200, body: JSON.stringify({ prompts: [] }) })
		);

		await page.goto('/prompts');
		await expect(page.locator('[data-testid="loading"]')).toBeVisible();
	});

	test('[F06-V] Feature handles error state @visual', async ({ page }) => {
		await page.route('**/api/prompts', (route) => route.fulfill({ status: 500, body: 'Error' }));

		await page.goto('/prompts');
		await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
	});

	// ===========================================
	// ACTOR TESTS
	// ===========================================

	test('[F07-A] Guest cannot access @actor', async ({ page }) => {
		await page.goto('/prompts');
		await expect(page).toHaveURL('/login');
	});

	test('[F08-A] Customer can access @actor', async ({ page }) => {
		await loginAsCustomer(page);
		await page.goto('/prompts');
		await expect(page).toHaveURL('/prompts');
	});

	test('[F09-A] Admin has extended access @actor', async ({ page }) => {
		await loginAsAdmin(page);
		await page.goto('/admin/prompts');
		await expect(page.locator('[data-testid="admin-controls"]')).toBeVisible();
	});
});
```

---

## 🔧 Test Fixtures

### Required: Monitoring Fixture

Elk project MOET deze fixture hebben:

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
				if (msg.type() === 'error') {
					errors.push(msg.text());
				}
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
				if (res.status() >= 400) {
					errors.push(`${res.status()} ${res.url()}`);
				}
			});
			await use(errors);
		},
		{ auto: true }
	]
});

export { expect };

// Helper: Login functions for actors
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

export async function logout(page: Page) {
	await page.click('[data-testid="user-menu"]');
	await page.click('[data-testid="logout"]');
	await page.waitForURL('/login');
}
```

---

## 📋 Enforcement Checklists

### Fase 1: CLI Testing Complete

```
□ Tests geschreven
  □ Unit tests voor alle modules
  □ Happy path tests
  □ Edge case tests
  □ Error case tests

□ Quality checks
  □ Alle tests pass
  □ Coverage target behaald
  □ Geen TypeScript errors
  □ Geen console warnings

□ Documentatie
  □ Test IDs toegevoegd
  □ Test matrix geüpdatet
```

### Fase 2: Server Testing Complete

```
□ Server setup
  □ Dev server gestart
  □ Port genoteerd in registry (.tmp/services/{project}/registry.json)
  □ Service geregistreerd

□ Tests uitgevoerd
  □ API endpoint tests
  □ Auth flow tests
  □ Authorization tests
  □ Error handling tests
  □ Database operation tests

□ Quality checks
  □ Alle tests pass
  □ Geen console errors
  □ Geen unexpected network errors
  □ API responses correct

□ Cleanup
  □ Server gestopt (alleen deze port!)
  □ Registry geüpdatet
```

### Fase 3: Visual Testing Complete

```
□ Browser setup
  □ Dev server draait (indien nodig)
  □ Tests in headed mode uitgevoerd

□ Actor tests
  □ Alle actors getest (Guest, Customer, Admin, etc.)
  □ Good states per actor
  □ Bad states per actor
  □ Cross-actor access control

□ State tests
  □ Loading states
  □ Success states
  □ Error states
  □ Empty states
  □ Form states
  □ Navigation states

□ Visual verification
  □ UI renders correct
  □ States transitions smooth
  □ Accessibility checks pass
  □ No visual regressions

□ Cleanup
  □ Server gestopt (alleen deze port!)
```

---

## 🚫 Verboden Acties

| Actie                                 | Waarom                            | Consequentie             |
| ------------------------------------- | --------------------------------- | ------------------------ |
| `killall node`                        | Killt ALLE projecten              | Data loss, crashes       |
| `pkill -f "vite"`                     | Killt ALLE vite servers           | Other projects down      |
| Server starten zonder registry        | Geen tracking, conflicts mogelijk | Port conflicts           |
| Tests runnen zonder server (Fase 2/3) | Tests failen                      | False negatives          |
| Alleen Fase 1 testen                  | Incomplete feature validation     | Bugs in production       |
| Headless voor visuele verificatie     | Kan niet visueel verifiëren       | Missed UI bugs           |
| Eén actor testen, andere negeren      | Incomplete access control         | Security vulnerabilities |
| Tests zonder monitoring fixture       | Verborgen errors                  | Silent failures          |

---

## 📊 Test ID Convention

```
[Category][Number]-[Phase] [Description]

Categories:
  F = Feature test
  U = Unit test
  V = Visual test
  A = Actor test
  S = Server/API test
  G = Guest actor
  C = Customer actor
  AD = Admin actor

Phases:
  S = Server (Fase 2)
  V = Visual (Fase 3)

Examples:
  F01-S API returns correct response
  F02-V Feature renders correctly
  C01 Customer can login successfully
  G04 Guest cannot access dashboard
  AD02 Admin can view all users
```

---

## 📁 Project Structure

```
project-root/
├── tests/
│   ├── e2e/
│   │   ├── features/
│   │   │   └── [feature].spec.ts       # Feature tests (all phases)
│   │   ├── actors/
│   │   │   ├── guest.spec.ts           # Guest actor tests
│   │   │   ├── customer.spec.ts        # Customer actor tests
│   │   │   └── admin.spec.ts           # Admin actor tests
│   │   ├── states/
│   │   │   ├── form-states.spec.ts     # Form state transitions
│   │   │   ├── data-states.spec.ts     # Data state transitions
│   │   │   └── loading-states.spec.ts  # Loading states
│   │   └── visual/
│   │       └── [feature]-visual.spec.ts # Visual regression
│   ├── unit/
│   │   └── [module].test.ts            # Vitest unit tests
│   ├── fixtures/
│   │   └── test-helpers.ts             # Monitoring + actor helpers
│   └── docs/
│       └── TEST-MATRIX.md              # Alle tests gedocumenteerd
├── .tmp/
│   └── services/
│       └── {project-name}/
│           └── registry.json           # Actieve services registry
└── playwright.config.ts
```

---

## 🎯 Samenvatting

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   TESTING BEST PRACTICES - MULTI-PROJECT ENVIRONMENT                       │
│                                                                             │
│   FASE 1: CLI/Unit Testing (headless)                                      │
│   ├── Vitest + Playwright CLI                                              │
│   ├── Pure logic, business rules, schemas                                  │
│   └── Coverage: Critical 100%, High 90%+, Medium 80%+                      │
│                                                                             │
│   FASE 2: Server Testing (headless)                                        │
│   ├── Playwright headless                                                  │
│   ├── API routes, auth, database, authorization                            │
│   └── Server op specifieke poort → alleen DIE killen                       │
│                                                                             │
│   FASE 3: Visual Testing (headed)                                          │
│   ├── Playwright UI mode (browser zichtbaar)                               │
│   ├── Alle actors, alle states, good & bad flows                           │
│   └── State transitions visueel verifiëren                                 │
│                                                                             │
│   PROJECT ISOLATION:                                                       │
│   ├── Service Registry bijhouden (.tmp/services/{project}/registry.json)   │
│   ├── Ken je project → Ken je poorten                                      │
│   └── Kill alleen JOUW services (nooit global killall/pkill)               │
│                                                                             │
│   ACTOR TESTING:                                                           │
│   ├── Elke actor apart testen (Guest, Customer, Admin, etc.)               │
│   ├── Good states ✅ + Bad states ❌ per actor                             │
│   └── Cross-actor access control verification                              │
│                                                                             │
│   STATE MANAGEMENT:                                                        │
│   ├── Loading → Success → Error transitions                                │
│   ├── Empty → Populated → Updated → Deleted                                │
│   └── Session: Authenticated → Expired → Re-auth                           │
│                                                                             │
│   QUALITY GATES:                                                           │
│   ├── Elke test MOET monitoring fixture gebruiken                          │
│   ├── Console errors = test failure                                        │
│   ├── Network errors (4xx/5xx) = test failure                              │
│   └── Geen fase mag worden overgeslagen                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**Versie History:**

- v2.1 - Bun runtime (niet npm)
- v2.0 - Multi-project support, 3-fase testing, actor-based testing, state management
- v1.0 - Initial version (basic test enforcement)
