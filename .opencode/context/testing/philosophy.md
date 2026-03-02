<!-- Context: testing/philosophy | Priority: critical | Version: 1.0 | Updated: 2026-02-27 -->

# Testing Philosophy: CLI + Browser = VERPLICHT

> Waarom zowel unit tests (CLI) als browser tests (E2E) verplicht zijn.

---

## Het Probleem

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   CLI Test (Vitest)     ≠      Browser Test (Playwright)        │
│   ═══════════════            ═════════════════════════          │
│   Logica werkt?               Ziet de gebruiker het ook?        │
│         ↓                              ↓                        │
│        ✅                            ❓                          │
│                                                                 │
│   Maar... wat als:                                              │
│   - Component A updated state                                   │
│   - Component B luistert naar die state                         │
│   - Component B re-rendert NIET                                 │
│   - CLI test: PASS (logica klopt)                               │
│   - Browser: FAIL (gebruiker ziet niks)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## CLI Tests (Vitest) - Logica Verificatie

**Wat ze testen:**

- Pure functions → output = f(input)
- Business logic → berekeningen, validaties
- Data transformations → correcte mapping
- Isolated units → geen UI, geen DOM

**Wat ze NIET zien:**

- ❌ Of component re-rendert bij state change
- ❌ Of andere components de state change detecteren
- ❌ Of UI visueel correct update
- ❌ Of gebruiker feedback krijgt

```typescript
// ✅ CLI test - logica werkt
it('userService.login() sets user state', () => {
	const service = new UserService(mockDb);
	service.login('john@test.com', 'password');
	expect(service.user).toEqual({ email: 'john@test.com' });
	// PASS ✅
});

// Maar... ziet de gebruiker dit ook?
```

---

## Browser Tests (Playwright) - Ervaring Verificatie

**Wat ze testen:**

- User interactions → click, type, scroll
- Component integration → A praat met B
- Visual feedback → loading, success, error states
- Real DOM → wat de gebruiker ZIET

**Wat ze WEL zien:**

- ✅ Component A triggert state change
- ✅ Component B reageert op state change
- ✅ UI update is zichtbaar
- ✅ Gebruiker krijgt feedback

```typescript
// ✅ Browser test - gebruiker ziet het
test('login shows user name in header', async ({ page }) => {
	await page.goto('/login');
	await page.fill('[name="email"]', 'john@test.com');
	await page.fill('[name="password"]', 'password');
	await page.click('button[type="submit"]');

	// Nu checken we wat de gebruiker ZIET
	await expect(page.locator('header .user-name')).toHaveText('John');
	// Dit faalt als:
	// - State niet reactive is
	// - Component niet re-render
	// - Header luistert niet naar user state
});
```

---

## Waarom CLI Tests Alleen Niet Genoeg Zijn

### Scenario 1: Svelte Reactivity Bug

```svelte
<!-- UserProfile.svelte -->
<script>
	let user = $state(null);

	// ❌ BUG: Vergeet $effect te gebruiken
	async function loadUser() {
		user = await fetchUser();
		// Header component luistert naar 'user' maar...
		// reactivity werkt niet zoals verwacht
	}
</script>
```

```typescript
// CLI test: PASS ✅
it('loadUser() sets user', async () => {
	await userProfile.loadUser();
	expect(userProfile.user).toBeTruthy();
});

// Browser test: FAIL ❌
test('header shows user after login', async ({ page }) => {
	await login(page);
	await expect(page.locator('header')).toContainText('Welcome');
	// FAIL: Header niet geupdate!
});
```

### Scenario 2: Cross-Component State

```svelte
<!-- Sidebar.svelte -->
<script>
	import { cartStore } from '$lib/stores/cart';
</script>

{#if $cartStore.items.length > 0}
	<span class="cart-badge">{$cartStore.items.length}</span>
{/if}
```

```typescript
// CLI test: PASS ✅
it('cartStore has items after add', () => {
	cartStore.addItem({ id: 1, name: 'Product' });
	expect(get(cartStore).items).toHaveLength(1);
});

// Browser test: FAIL ❌
test('sidebar shows cart badge', async ({ page }) => {
	await page.click('[data-testid="add-to-cart"]');
	await expect(page.locator('.cart-badge')).toBeVisible();
	// FAIL: Badge niet zichtbaar want:
	// - Store update niet gepropageerd
	// - Component niet reactive
	// - Svelte context issue
});
```

---

## De Regel: BEIDEN VERPLICHT

| Test Type                | Wat      | Waarom                      |
| ------------------------ | -------- | --------------------------- |
| **CLI (Vitest)**         | Logica   | Snel, isolatie, debug       |
| **Browser (Playwright)** | Ervaring | Echte gebruiker, integratie |

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Feature Complete =                                        │
│                                                             │
│   CLI Tests PASS  +  Browser Tests PASS                    │
│        ↓                    ↓                               │
│   Logica klopt    Gebruiker ziet het                        │
│                                                             │
│   Alleen CLI?     = Feature Incompleet                      │
│   Alleen Browser? = Feature Incompleet                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementatie

### Voor Elke Feature

```bash
# 1. CLI test voor logica
cd frontend && bun run test tests/unit/[feature].test.ts

# 2. Browser test voor ervaring
cd frontend && bun run test:e2e tests/e2e/[feature].spec.ts

# 3. Beide moeten pass
# CLI PASS + Browser PASS = Feature Complete ✅
```

### Test Matrix

| Feature   | CLI Test            | Browser Test        | Status |
| --------- | ------------------- | ------------------- | ------ |
| Login     | `auth.test.ts`      | `login.spec.ts`     | ⬜⬜   |
| Cart      | `cart.test.ts`      | `cart.spec.ts`      | ⬜⬜   |
| Dashboard | `dashboard.test.ts` | `dashboard.spec.ts` | ⬜⬜   |

**Status legenda:**

- ⬜⬜ = Geen tests
- ✅⬜ = Alleen CLI (incompleet)
- ⬜✅ = Alleen browser (incompleet)
- ✅✅ = Complete feature

---

## Quick Reference

| Vraag                         | CLI Test | Browser Test |
| ----------------------------- | -------- | ------------ |
| Werkt de logica?              | ✅       | -            |
| Ziet de gebruiker het?        | -        | ✅           |
| Reageren components op state? | -        | ✅           |
| Is de UI correct?             | -        | ✅           |
| Zijn er geen console errors?  | -        | ✅           |
| Integratie tussen components? | -        | ✅           |

---

## Samenvatting

```
CLI Tests    =  Logica verificatie (snel, geïsoleerd)
Browser Tests =  Gebruikerservaring (echt, geïntegreerd)

BEIDEN VERPLICHT = Feature Complete

"Ik heb de CLI tests" ≠ "Het werkt"
"Het werkt" = CLI PASS + Browser PASS
```

---

## VOORAF: State Dependency Analysis

> **CRUCIAAL**: Voordat je tests schrijft, moet je de pagina SNAPPEN.

### Waarom?

Je kunt niet testen wat je niet begrijpt. Voordat je een browser test schrijft, moet je weten:

1. **Wie** heeft welke state nodig?
2. **Wat** verandert er als state update?
3. **Wanneer** reageert welke component?
4. **Welke** components praten met elkaar?

### State Dependency Map

Maak een kaart VOORDAT je test:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAGINA: /dashboard                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐     user     ┌──────────────┐                │
│  │   authStore  │─────────────→│   Header     │                │
│  └──────────────┘              │  .user-name  │                │
│         │                      └──────────────┘                │
│         │ user                                                    │
│         ▼                                                         │
│  ┌──────────────┐     campaigns ┌──────────────┐                │
│  │  Dashboard   │──────────────→│ CampaignList │                │
│  │  +page.svelte│               │              │                │
│  └──────────────┘               └──────────────┘                │
│         │                              │                        │
│         │ campaigns                    │ selectedCampaign       │
│         ▼                              ▼                        │
│  ┌──────────────┐              ┌──────────────┐                │
│  │   Sidebar    │              │ CampaignStats│                │
│  │ .campaign-nav│              │              │                │
│  └──────────────┘              └──────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

STATE DEPENDENCIES:
┌────────────────┬─────────────────┬───────────────────────────┐
│ Component      │ State Needed    │ Reacts To                 │
├────────────────┼─────────────────┼───────────────────────────┤
│ Header         │ user            │ authStore.user change     │
│ CampaignList   │ campaigns       │ campaignStore.load()      │
│ CampaignStats  │ selectedCampaign│ CampaignList.onSelect()   │
│ Sidebar        │ user, campaigns │ authStore, campaignStore  │
└────────────────┴─────────────────┴───────────────────────────┘

WHAT HAPPENS WHEN USER LOGS IN?
1. authStore.setUser(user) triggered
2. Header re-renders with user.name
3. Dashboard load() fetches campaigns
4. CampaignList re-renders with campaigns
5. Sidebar shows campaign navigation
```

### Analysis Template

```markdown
## Page: /[route]

### Components

| Component | File          | Purpose                 |
| --------- | ------------- | ----------------------- |
| Header    | Header.svelte | Shows user name, logout |
| ...       | ...           | ...                     |

### State Dependencies

| Component    | State Source  | Reads     | Writes     |
| ------------ | ------------- | --------- | ---------- |
| Header       | authStore     | user      | -          |
| CampaignList | campaignStore | campaigns | selectedId |
| ...          | ...           | ...       | ...        |

### Cross-Component Communication

| Trigger         | Emitter      | Receiver      | Via           |
| --------------- | ------------ | ------------- | ------------- |
| Login success   | LoginForm    | Header        | authStore     |
| Campaign select | CampaignList | CampaignStats | prop/callback |
| ...             | ...          | ...           | ...           |

### Test Scenarios

| Scenario        | Initial State         | Action      | Expected State Change  |
| --------------- | --------------------- | ----------- | ---------------------- |
| User logs in    | authStore.user = null | submit form | authStore.user = {...} |
| Campaign select | selectedId = null     | click item  | selectedId = 1         |
| ...             | ...                   | ...         | ...                    |
```

### Voorbeeld: Login Pagina

**Analysis:**

```
┌─────────────────────────────────────────────────┐
│              PAGINA: /login                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  Components:                                    │
│  ├── LoginForm (form, inputs, button)          │
│  ├── ErrorMessage (toont fouten)               │
│  └── Header (toont "Login" of user name)       │
│                                                 │
│  State Flow bij Login:                          │
│  1. User vult email/password in                 │
│  2. User klikt "Submit"                         │
│  3. Form POST naar server action                │
│  4. Server valideert, set cookie                │
│  5. Redirect naar /dashboard                    │
│  6. Dashboard laadt, Header toont user.name     │
│                                                 │
│  Wat moet je TESTEN in browser:                 │
│  - Form submit → loading state                  │
│  - Error → ErrorMessage toont fout              │
│  - Success → redirect naar dashboard            │
│  - Dashboard → Header toont user name           │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Browser Test (na analysis):**

```typescript
test('login flow - user sees correct state changes', async ({ page }) => {
	// 1. Initial state - form visible, no user
	await page.goto('/login');
	await expect(page.locator('form')).toBeVisible();
	await expect(page.locator('header .user-name')).not.toBeVisible();

	// 2. Submit with wrong credentials
	await page.fill('[name="email"]', 'wrong@test.com');
	await page.fill('[name="password"]', 'wrong');
	await page.click('button[type="submit"]');

	// 3. Error state - ErrorMessage visible
	await expect(page.locator('.error-message')).toBeVisible();

	// 4. Submit with correct credentials
	await page.fill('[name="email"]', 'user@test.com');
	await page.fill('[name="password"]', 'correct');
	await page.click('button[type="submit"]');

	// 5. Redirect state - now on dashboard
	await expect(page).toHaveURL('/dashboard');

	// 6. Logged in state - Header shows user
	await expect(page.locator('header .user-name')).toBeVisible();
});
```

### Regel: Eerst Snappen, Dan Testen

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ❌ FOUT: Direct tests schrijven                               │
│                                                                 │
│   "Ik ga even snel een test schrijven..."                       │
│   → Je vergeet component dependencies                           │
│   → Je mist state changes                                       │
│   → Test is onvolledig                                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ✅ GOED: Eerst analysis, dan test                             │
│                                                                 │
│   1. Welke components?                                          │
│   2. Welke state heeft elk nodig?                               │
│   3. Wie communiceert met wie?                                  │
│   4. Wat verandert er bij elke actie?                           │
│   5. NU pas test schrijven                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Checklist Voor Testen

```
□ Alle components op pagina geïdentificeerd?
□ State sources bekend (stores, props, context)?
□ Cross-component communicatie in kaart gebracht?
□ State changes bij user acties duidelijk?
□ Expected UI changes per actie gedefinieerd?

→ Dan pas: CLI test + Browser test schrijven
```
