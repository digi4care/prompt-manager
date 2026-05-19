<!-- Context: testing/cli-vs-browser | Priority: critical | Version: 1.0 | Updated: 2026-03-06 -->

# CLI + Browser = VERPLICHT

**Doel**: Waarom zowel unit tests (CLI) als browser tests (E2E) verplicht zijn

---

## Het Probleem

```
CLI Test (Vitest)     ≠      Browser Test (Playwright)
═══════════════            ═════════════════════════
Logica werkt?               Ziet de gebruiker het ook?
      ↓                              ↓
     ✅                            ❓

Maar... wat als:
- Component A updated state
- Component B luistert naar die state
- Component B re-rendert NIET
- CLI test: PASS (logica klopt)
- Browser: FAIL (gebruiker ziet niks)
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
	// PASS ✅ - Maar... ziet de gebruiker dit ook?
});
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
	// Dit faalt als: State niet reactive, Component niet re-render
});
```

---

## Waarom CLI Alleen Niet Genoeg Is

### Scenario 1: Svelte Reactivity Bug

```svelte
<!-- UserProfile.svelte -->
<script>
	let user = $state(null);
	// ❌ BUG: Vergeet $effect te gebruiken
	async function loadUser() {
		user = await fetchUser();
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
// CLI test: PASS ✅ - store works
it('cartStore has items after add', () => {
	cartStore.addItem({ id: 1, name: 'Product' });
	expect(get(cartStore).items).toHaveLength(1);
});

// Browser test: FAIL ❌ - UI not updated
test('sidebar shows cart badge', async ({ page }) => {
	await page.click('[data-testid="add-to-cart"]');
	await expect(page.locator('.cart-badge')).toBeVisible();
	// FAIL: Store niet gepropageerd naar component
});
```

---

## De Regel

| Test Type            | Wat      | Waarom                      |
| -------------------- | -------- | --------------------------- |
| CLI (Vitest)         | Logica   | Snel, isolatie, debug       |
| Browser (Playwright) | Ervaring | Echte gebruiker, integratie |

```
Feature Complete = CLI Tests PASS + Browser Tests PASS
     ↓                    ↓
Logica klopt      Gebruiker ziet het

Alleen CLI?     = Feature Incompleet
Alleen Browser? = Feature Incompleet
```

---

## Quick Reference

| Vraag                         | CLI Test | Browser Test |
| ----------------------------- | -------- | ------------ |
| Werkt de logica?              | ✅       | -            |
| Ziet de gebruiker het?        | -        | ✅           |
| Reageren components op state? | -        | ✅           |
| Is de UI correct?             | -        | ✅           |
| Integratie tussen components? | -        | ✅           |

---

## Related

- `testing/state-analysis.md` - State dependency analysis
- `testing/fases.md` - Testing phases
