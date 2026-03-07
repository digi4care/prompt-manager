# Project Voortgang

## Laatste Update: 2026-03-06

### Huidige Taak: Provider Disconnect UI Fix

**Status**: 🟡 In Progress

**Doel**: Provider disconnect functionaliteit verbeteren in Settings pagina

---

## Wat Werkt

✅ Login met Better-Auth (traag maar werkt)
✅ Provider listing in Settings
✅ Provider connect flow (API key + OAuth)
✅ Regressie tests voor auth (31 E2E tests)

---

## Bug: Provider Disconnect UI

**Probleem**:

1. Connected providers tonen "Connected" badge + ❌ kruisje button
2. Kruisje button is onduidelijk (geen tekst)
3. Geen bevestiging voor disconnect
4. Geen toast feedback na disconnect
5. Disconnect functionaliteit werkt niet (gebruiker klikte maar gebeurde niets)

**Gevraagde Oplossing**:

1. ❌ Verwijder "Connected" badge (onnodig - als provider in lijst staat is het connected)
2. ✅ Vervang kruisje button met tekst button "Disconnect"
3. ✅ Voeg bevestiging modal toe ("Weet je het zeker? Ja/Cancel")
4. ✅ Toast notification na succesvolle disconnect
5. ✅ Zorg dat disconnect API call correct werkt

---

## Relevante Bestanden

### Frontend

- `src/lib/components/admin/ai-settings/providers-block.svelte` - Provider UI component
  - Lines 186-204: `handleDisconnectProvider()` functie
  - Lines 237-266: Connected providers lijst UI
  - Lines 250-262: Badge + kruisje button (MOET VERVANGEN WORDEN)

### Backend

- `src/routes/api/opencode/providers/auth/[providerId]/+server.ts` - Disconnect API
  - Lines 71-116: DELETE endpoint (werkt correct)
  - Roept OpenCode DELETE /auth/:providerId aan
  - Clear providers cache
  - Roept /global/dispose aan

### State Management

- `src/lib/stores/providers.svelte.ts` - Provider store
  - `connectedIds`: Array van connected provider IDs
  - `setConnected()`: Update connected list
  - `removeConnected()`: Verwijder provider uit connected list

### UI Components

- `src/lib/stores/toast.ts` - Toast notifications
  - `showSuccess()`: Succes toast
  - `showError()`: Error toast

---

## Te Implementeren

### 1. UI Wijzigingen in providers-block.svelte

**Nieuwe state variabelen** (toevoegen na line 13):

```typescript
let showConfirmDisconnect = $state(false);
let disconnectProviderId = $state('');
let disconnectProviderName = $state('');
let isDisconnecting = $state(false);
```

**Toast import** (toevoegen aan imports line 1):

```typescript
import { showSuccess, showError } from '$lib/stores/toast';
```

**Nieuwe helper functie** (toevoegen na line 185):

```typescript
function askDisconnectProvider(provider: Provider) {
	disconnectProviderId = provider.id;
	disconnectProviderName = provider.name;
	showConfirmDisconnect = true;
}

function cancelDisconnect() {
	showConfirmDisconnect = false;
	disconnectProviderId = '';
	disconnectProviderName = '';
}

async function confirmDisconnect() {
	if (!disconnectProviderId) return;

	isDisconnecting = true;

	try {
		const response = await fetch(`/api/opencode/providers/auth/${disconnectProviderId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			const error = await response.json();
			showError(
				`Failed to disconnect ${disconnectProviderName}: ${error.message || 'Unknown error'}`
			);
			return;
		}

		const result = await response.json();
		providers.setConnected(result.connected);
		showSuccess(`${disconnectProviderName} disconnected successfully`);
		showConfirmDisconnect = false;
	} catch (err) {
		console.error('Error disconnecting provider:', err);
		showError(`Failed to disconnect ${disconnectProviderName}`);
	} finally {
		isDisconnecting = false;
		disconnectProviderId = '';
		disconnectProviderName = '';
	}
}
```

**UI aanpassing** (vervang lines 250-262):

```svelte
<Button
	variant="outline"
	size="sm"
	onclick={() => askDisconnectProvider(provider)}
	disabled={isDisconnecting}
>
	Disconnect
</Button>
```

**Bevestiging modal** (toevoegen na line 480):

```svelte
{#if showConfirmDisconnect}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
			<h3 class="text-lg font-semibold">Disconnect Provider</h3>
			<p class="mt-2 text-sm text-muted-foreground">
				Are you sure you want to disconnect <strong>{disconnectProviderName}</strong>? You'll need
				to reconnect it to use it again.
			</p>
			<div class="mt-4 flex justify-end gap-2">
				<Button variant="outline" onclick={cancelDisconnect} disabled={isDisconnecting}>
					Cancel
				</Button>
				<Button variant="destructive" onclick={confirmDisconnect} disabled={isDisconnecting}>
					{isDisconnecting ? 'Disconnecting...' : 'Yes, Disconnect'}
				</Button>
			</div>
		</div>
	</div>
{/if}
```

### 2. Regressie Test

**Nieuwe test**: `e2e/provider-disconnect.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Provider Disconnect', () => {
	test.beforeEach(async ({ page }) => {
		// Login first
		await page.goto('/login');
		await page.getByLabel('Password').fill(process.env.ADMIN_PASSWORD || 'password');
		await page.getByRole('button', { name: 'Login' }).click();
		await page.waitForURL('/settings');
	});

	test('should show disconnect button for connected providers', async ({ page }) => {
		await page.goto('/settings');

		// Check if connected providers section exists
		const connectedSection = page.locator('text=connected');
		await expect(connectedSection).toBeVisible();

		// Check if disconnect button exists
		const disconnectButton = page.getByRole('button', { name: 'Disconnect' });
		await expect(disconnectButton.first()).toBeVisible();
	});

	test('should show confirmation modal when clicking disconnect', async ({ page }) => {
		await page.goto('/settings');

		// Click first disconnect button
		await page.getByRole('button', { name: 'Disconnect' }).first().click();

		// Check confirmation modal appears
		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page.getByText('Are you sure you want to disconnect')).toBeVisible();
	});

	test('should cancel disconnect when clicking cancel', async ({ page }) => {
		await page.goto('/settings');

		const disconnectButton = page.getByRole('button', { name: 'Disconnect' }).first();
		await disconnectButton.click();

		// Click cancel
		await page.getByRole('button', { name: 'Cancel' }).click();

		// Modal should disappear
		await expect(page.getByRole('dialog')).not.toBeVisible();
	});

	test('should disconnect provider successfully', async ({ page }) => {
		await page.goto('/settings');

		// Get provider name before disconnect
		const providerName = await page.locator('.font-medium').first().textContent();

		// Click disconnect
		await page.getByRole('button', { name: 'Disconnect' }).first().click();

		// Confirm disconnect
		await page.getByRole('button', { name: 'Yes, Disconnect' }).click();

		// Check for success toast
		await expect(page.getByText('disconnected successfully')).toBeVisible({ timeout: 5000 });

		// Provider should be removed from list
		await expect(page.getByText(providerName || '')).not.toBeVisible();
	});
});
```

---

## OpenCode SDK Referentie

**Repositories**:

- https://github.com/anomalyco/opencode-sdk-js - JavaScript/TypeScript SDK
- https://github.com/anomalyco/opencode - Core OpenCode server

**Disconnect Flow** (van opencode-desktop):

1. User klikt disconnect
2. API call naar DELETE /auth/:providerId
3. 1-2 seconden vertraging (async processing)
4. Toast: "Provider disconnected successfully"
5. UI update (provider verwijderd uit lijst)

---

## Volgende Stappen

1. ✅ UI wijzigingen implementeren (zoals hierboven beschreven)
2. ✅ Browser test - handmatig testen in dev mode
3. ✅ Regressie test schrijven (provider-disconnect.spec.ts)
4. ✅ Regressie test runnen
5. ✅ Commit + push
6. ⬜ User acceptance test

---

## Notities

- Better-Auth login is traag (~3-5 seconden) - kan later geoptimaliseerd worden
- Provider state wordt NIET in database opgeslagen, maar in OpenCode server memory
- Disconnect werkt via OpenCode SDK, niet direct in database
- Toast notifications gebruiken shadcn-svelte toast systeem

---

## Eerdere Commits

- `53fc409` - ♻️ refactor: migrate from JWT to Better-Auth
  - Verwijderde JWT authenticatie
  - Nieuwe auth.helper.ts met Better-Auth
  - Update alle API endpoints
  - Verwijderde auth.svelte.ts store
  - Clean up test-workflow-generator

---

## Context Index

Zie ook:

- `.planning/ROADMAP.md` - Project roadmap (Phase 1-8 compleet)
- `docs/testing/TODO.md` - Testing taken (allemaal completed)
- `AGENTS.md` - Project instructies en commands
