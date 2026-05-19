<!-- Context: testing/state-analysis | Priority: critical | Version: 1.0 | Updated: 2026-03-06 -->

# State Dependency Analysis

**Doel**: Voordat je tests schrijft, moet je de pagina SNAPPEN

---

## Waarom?

Je kunt niet testen wat je niet begrijpt. Voordat je een browser test schrijft:

1. **Wie** heeft welke state nodig?
2. **Wat** verandert er als state update?
3. **Wanneer** reageert welke component?
4. **Welke** components praten met elkaar?

---

## State Dependency Map Example

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
│  └──────────────┘               └──────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

STATE DEPENDENCIES:
┌────────────────┬─────────────────┬───────────────────────────┐
│ Component      │ State Needed    │ Reacts To                 │
├────────────────┼─────────────────┼───────────────────────────┤
│ Header         │ user            │ authStore.user change     │
│ CampaignList   │ campaigns       │ campaignStore.load()      │
│ CampaignStats  │ selectedCampaign│ CampaignList.onSelect()   │
└────────────────┴─────────────────┴───────────────────────────┘

WHAT HAPPENS WHEN USER LOGS IN?
1. authStore.setUser(user) triggered
2. Header re-renders with user.name
3. Dashboard load() fetches campaigns
4. CampaignList re-renders with campaigns
```

---

## Analysis Template

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

### Cross-Component Communication

| Trigger         | Emitter      | Receiver      | Via           |
| --------------- | ------------ | ------------- | ------------- |
| Login success   | LoginForm    | Header        | authStore     |
| Campaign select | CampaignList | CampaignStats | prop/callback |

### Test Scenarios

| Scenario     | Initial State         | Action      | Expected State Change  |
| ------------ | --------------------- | ----------- | ---------------------- |
| User logs in | authStore.user = null | submit form | authStore.user = {...} |
```

---

## Voorbeeld: Login Pagina

**Analysis:**

```
PAGINA: /login

Components:
├── LoginForm (form, inputs, button)
├── ErrorMessage (toont fouten)
└── Header (toont "Login" of user name)

State Flow bij Login:
1. User vult email/password in
2. User klikt "Submit"
3. Form POST naar server action
4. Server valideert, set cookie
5. Redirect naar /dashboard
6. Dashboard laadt, Header toont user.name
```

**Browser Test (na analysis):**

```typescript
test('login flow - user sees correct state changes', async ({ page }) => {
	// 1. Initial state - form visible, no user
	await page.goto('/login');
	await expect(page.locator('form')).toBeVisible();

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

---

## Regel: Eerst Snappen, Dan Testen

```
❌ FOUT: Direct tests schrijven
"Ik ga even snel een test schrijven..."
→ Je vergeet component dependencies
→ Je mist state changes
→ Test is onvolledig

✅ GOED: Eerst analysis, dan test
1. Welke components?
2. Welke state heeft elk nodig?
3. Wie communiceert met wie?
4. Wat verandert er bij elke actie?
5. NU pas test schrijven
```

---

## Checklist Voor Testen

```
□ Alle components op pagina geïdentificeerd?
□ State sources bekend (stores, props, context)?
□ Cross-component communicatie in kaart gebracht?
□ State changes bij user acties duidelijk?
□ Expected UI changes per actie gedefinieerd?

→ Dan pas: CLI test + Browser test schrijven
```

---

## Related

- `testing/cli-vs-browser.md` - Why both required
- `testing/state-management.md` - State transitions testing
