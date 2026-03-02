# Test Enforcement Guideline

**Versie:** 1.0 | **Type:** Agnostisch | **Doel:** Force test compliance

---

## 🔴 VERPLICHT: Lees dit voordat je code schrijft

Deze guideline is **non-negotiable**. Elke feature zonder tests is **incompleet**.

---

## Core Principle

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   GEEN FEATURE IS KLAAR ZONDER TESTS                        │
│                                                             │
│   Code + CLI Tests + Browser Tests = Feature Complete       │
│   Code zonder Tests = Technical Debt                        │
│                                                             │
│   ⚠️ CLI tests alleen is NIET genoeg!                       │
│   → Zie philosophy.md voor uitleg                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> **Lees eerst:** `philosophy.md` - Waarom CLI + Browser verplicht zijn

---

## Stap 1: Voor Elke Feature - Test Analyse

**BEFORE** je begint met implementeren, beantwoord:

| Vraag                | Antwoord bepaalt        |
| -------------------- | ----------------------- |
| Wat is de feature?   | Test scope              |
| Wie gebruikt het?    | Test actors/users       |
| Welke inputs?        | Test cases (happy path) |
| Wat kan misgaan?     | Test cases (error path) |
| Welke UI verandert?  | Visual tests            |
| Welke API verandert? | API tests               |

---

## Stap 2: Test Categorie Bepalen

| Feature Type        | Test Categorie     | Minimum Tests       |
| ------------------- | ------------------ | ------------------- |
| Nieuwe UI component | Visual + E2E       | 2                   |
| Nieuwe API endpoint | Unit + Integration | 2                   |
| Nieuwe user flow    | E2E                | 3 (happy + 2 error) |
| Bug fix             | Regression         | 1 (reproduce bug)   |
| Refactor            | Existing tests     | Must still pass     |
| Config wijziging    | Smoke              | 1                   |

---

## Stap 3: Test Template Gebruiken

### E2E Test Template

```typescript
// tests/e2e/[category]/[feature].spec.ts
import { test, expect } from '../fixtures/test-helpers';

test.describe('[Feature Name]', () => {
	// 🔴 VERPLICHT: Happy path test
	test('[F01] [feature] works correctly', async ({ page, consoleErrors, networkErrors }) => {
		// Arrange: Setup
		await page.goto('/[route]');

		// Act: Execute
		await page.click('[data-testid="trigger"]');

		// Assert: Verify
		await expect(page.locator('[data-testid="result"]')).toBeVisible();

		// 🔴 VERPLICHT: Error monitoring
		expect(consoleErrors).toHaveLength(0);
		expect(networkErrors).toHaveLength(0);
	});

	// 🔴 VERPLICHT: Minimaal 1 error case
	test('[F02] [feature] handles error gracefully', async ({ page }) => {
		// Trigger error condition
		// Verify error handling (not crash)
	});

	// 🔴 INDien van toepassing: Access control
	test('[F03] [feature] blocks unauthorized users', async ({ page }) => {
		// Test zonder auth/andere actor
		// Verify redirect of blocking
	});
});
```

### Unit Test Template

```typescript
// tests/unit/[module].test.ts
describe('[Module Name]', () => {
	// 🔴 VERPLICHT: Happy path
	it('[U01] [function] returns expected result', () => {
		// Arrange
		const input = 'test';

		// Act
		const result = functionUnderTest(input);

		// Assert
		expect(result).toBe('expected');
	});

	// 🔴 VERPLICHT: Edge cases
	it('[U02] [function] handles edge case', () => {
		expect(functionUnderTest(null)).toBe(defaultValue);
	});

	// 🔴 VERPLICHT: Error cases
	it('[U03] [function] throws on invalid input', () => {
		expect(() => functionUnderTest(invalid)).toThrow();
	});
});
```

### Visual Test Template

```typescript
// tests/e2e/visual/[feature]-visual.spec.ts
import { test, expect } from '../fixtures/test-helpers';

test.describe('[Feature] Visual', () => {
	test('[V01] [feature] default state', async ({ page }) => {
		await page.goto('/[route]');
		await page.waitForLoadState('networkidle');

		await expect(page).toHaveScreenshot('[feature]-default.png', {
			fullPage: true,
			animations: 'disabled'
		});
	});

	// 🔴 INDien van toepassing: Interaction states
	test('[V02] [feature] hover/focus state', async ({ page }) => {
		await page.goto('/[route]');
		await page.hover('[data-testid="element"]');

		await expect(page).toHaveScreenshot('[feature]-hover.png');
	});
});
```

---

## Stap 4: Test ID Conventie

```
[Categorie][Nummer] - [Korte beschrijving]

Voorbeelden:
F01 - Login form submits successfully
F02 - Login form shows error on invalid credentials
U01 - formatDate returns correct format
V01 - Homepage default state
A01 - Admin can access dashboard
```

---

## Stap 5: Monitoring Fixture (VERPLICHT)

Elk project MOET een monitoring fixture hebben:

```typescript
// tests/fixtures/test-helpers.ts
export const test = base.extend({
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
			page.on('requestfailed', (req) => errors.push(req.url()));
			page.on('response', (res) => {
				if (res.status() >= 400) errors.push(res.url());
			});
			await use(errors);
		},
		{ auto: true }
	]
});
```

**Gebruik in elke test:**

```typescript
test('my test', async ({ page, consoleErrors, networkErrors }) => {
	// ... test code ...
	expect(consoleErrors).toHaveLength(0);
	expect(networkErrors).toHaveLength(0);
});
```

---

## Stap 6: Update Test Documentatie

**NA** het schrijven van tests:

1. **Update test matrix** in project test document
2. **Voeg test IDs toe** aan documentatie
3. **Update fixtures** indien nieuwe helpers nodig

---

## Enforcement Checklist

**VOORDAT je "ik ben klaar" zegt:**

```
□ Tests geschreven?
  □ Happy path test?
  □ Error path test?
  □ Access control test (indien van toepassing)?
  □ Visual test (indien UI wijziging)?

□ Monitoring actief?
  □ Console errors worden opgevangen?
  □ Network errors worden opgevangen?
  □ Tests failen bij errors?

□ Tests uitgevoerd?
  □ Alle tests pass?
  □ Geen console errors?
  □ Geen network errors?

□ Documentatie bijgewerkt?
  □ Test matrix geüpdatet?
  □ Test IDs toegevoegd?

□ Gecommit?
  □ Test files toegevoegd?
  □ Documentatie toegevoegd?
```

---

## Bij Feature Wijzigingen

### Als je een feature WIJZIGT:

1. **Run bestaande tests** - moeten nog pass
2. **Update tests** als gedrag verandert
3. **Voeg nieuwe tests** voor nieuwe functionaliteit
4. **Verwijder tests** voor verwijderde functionaliteit
5. **Update documentatie**

### Als je een feature VERWIJDERT:

1. **Verwijder bijbehorende tests**
2. **Update test matrix**
3. **Check voor dependent tests** die nu kunnen falen

---

## Bij Bug Fixes

**VERPLICHT:** Eerst een test die de bug reproduceert

```typescript
test('[REG01] Bug #123 - [bug description] is fixed', async ({ page }) => {
	// Reproduce de bug
	// Assert dat het nu werkt (niet meer crashed/fout geeft)
});
```

Pas DAN de fix implementeren.

---

## Agnostische Project Setup

### Nieuw Project? Maak deze structuur:

```
tests/
├── e2e/
│   ├── [feature].spec.ts
│   └── visual/
│       └── [feature]-visual.spec.ts
├── unit/
│   └── [module].test.ts
├── fixtures/
│   └── test-helpers.ts      # Monitoring fixtures
└── docs/
    └── TEST-MATRIX.md       # Alle tests gedocumenteerd
```

### test-helpers.ts (Minimale versie)

```typescript
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
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
			page.on('requestfailed', (req) => errors.push(req.url()));
			page.on('response', (res) => {
				if (res.status() >= 400) errors.push(res.url());
			});
			await use(errors);
		},
		{ auto: true }
	]
});

export { expect };
```

---

## Quick Reference voor LLMs

### Bij elke feature, voer uit:

```
1. ANALYSEER → Welke tests nodig?
2. MAAK → Tests met monitoring
3. RUN → Tests moeten pass
4. DOCUMENTEREN → Update test matrix
5. COMMIT → Tests + docs samen
```

### Minimale test coverage per feature:

| Type                 | Aantal | Tool       |
| -------------------- | ------ | ---------- |
| CLI Unit/Integration | 2+     | Vitest     |
| Browser E2E          | 2+     | Playwright |
| Access control       | 1      | Playwright |
| Visual (indien UI)   | 1      | Playwright |

**⚠️ BEIDEN verplicht:**

```
CLI PASS alleen ≠ Feature Complete
Browser PASS alleen ≠ Feature Complete
CLI PASS + Browser PASS = Feature Complete ✅
```

### No-Go's:

- ❌ Feature committen zonder tests
- ❌ Tests zonder error monitoring
- ❌ Tests die niet failen bij errors
- ❌ "Ik test het later wel"

---

## Samenvatting

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   TEST ENFORCEMENT REGELS                                   │
│                                                             │
│   1. Elke feature MOET tests hebben                         │
│   2. Elke test MOET error monitoring hebben                 │
│   3. "Tests passed" MOET betekenen "app werkt"              │
│   4. Bug fixes MOETEN eerst een test hebben                 │
│   5. Documentatie MOET worden bijgewerkt                   │
│                                                             │
│   Geen tests = Geen commit                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
