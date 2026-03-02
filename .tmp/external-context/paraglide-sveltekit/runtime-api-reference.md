---
source: Context7 API + Official Docs
library: Paraglide JS
package: @inlang/paraglide-sveltekit
topic: Runtime API Reference
fetched: 2026-03-02T12:00:00Z
official_docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs/runtime
---

# Paraglide JS Runtime API Reference

## Variables

### baseLocale

```typescript
const baseLocale: string; // e.g., "en"
```

The project's base locale.

```typescript
if (locale === baseLocale) {
	// Do something special for base locale
}
```

### locales

```typescript
const locales: readonly string[]; // e.g., ["en", "nl"]
```

All configured locales from `project.inlang/settings.json`.

```typescript
if (locales.includes(userSelectedLocale) === false) {
	throw new Error('Locale is not available');
}
```

### strategy

```typescript
const strategy: Strategy[];
```

The configured locale detection strategies.

### urlPatterns

```typescript
const urlPatterns: UrlPattern[];
```

The configured URL patterns for localization.

### cookieName

```typescript
const cookieName: string;
```

The name of the cookie used for storing locale preference.

### cookieMaxAge

```typescript
const cookieMaxAge: number;
```

The max age of the locale cookie in seconds.

---

## Core Functions

### getLocale()

```typescript
function getLocale(): Locale;
```

Get the current locale. Resolved using configured strategies (URL, cookie, localStorage, etc.) in order.

```typescript
import { getLocale } from '$lib/paraglide/runtime.js';

if (getLocale() === 'de') {
	console.log('Germany 🇩🇪');
} else if (getLocale() === 'nl') {
	console.log('Netherlands 🇳🇱');
}
```

### setLocale()

```typescript
function setLocale(newLocale: Locale, options?: { reload?: boolean }): void | Promise<void>;
```

Set the locale. By default, triggers a page reload.

```typescript
import { setLocale } from '$lib/paraglide/runtime.js';

// With reload (default)
setLocale('nl');

// Without reload - you must handle re-render
setLocale('nl', { reload: false });
```

**Note:** `setLocale()` triggers a page reload by default. This is a deliberate design choice that keeps the implementation simple.

### isLocale()

```typescript
function isLocale(locale: any): locale is Locale;
```

Check if a value is a valid locale.

```typescript
import { isLocale } from '$lib/paraglide/runtime.js';

if (isLocale(params.locale)) {
	setLocale(params.locale);
} else {
	setLocale('en');
}
```

### assertIsLocale()

```typescript
function assertIsLocale(input: any): Locale;
```

Assert that input is a valid locale. Throws if invalid.

```typescript
import { assertIsLocale } from '$lib/paraglide/runtime.js';

// In +layout.ts with [locale] parameter
export function load({ params }) {
	setLocale(assertIsLocale(params.locale));
}
```

---

## URL Functions

### localizeHref()

```typescript
function localizeHref(href: string, options?: { locale?: string }): string;
```

High-level URL localization for UI components. Accepts relative paths, returns relative paths when possible.

```typescript
import { localizeHref } from '$lib/paraglide/runtime.js';

localizeHref('/about'); // => "/nl/about" (if current locale is "nl")
localizeHref('/store', { locale: 'en' }); // => "/en/store"
localizeHref('https://other.com/about'); // => "https://other.com/nl/about"
```

### deLocalizeHref()

```typescript
function deLocalizeHref(href: string): string;
```

Remove locale prefix from a href.

```typescript
import { deLocalizeHref } from '$lib/paraglide/runtime.js';

deLocalizeHref('/nl/about'); // => "/about"
deLocalizeHref('/en/store'); // => "/store"
```

### localizeUrl()

```typescript
function localizeUrl(url: string | URL, options?: { locale?: string }): URL;
```

Low-level URL localization for server contexts. Always returns absolute URLs.

```typescript
import { localizeUrl } from '$lib/paraglide/runtime.js';

const url = new URL('https://example.com/about');
localizeUrl(url, { locale: 'nl' }); // => URL("https://example.com/nl/about")
```

### deLocalizeUrl()

```typescript
function deLocalizeUrl(url: string | URL): URL;
```

Low-level URL de-localization for server contexts. Used in the reroute hook.

```typescript
import { deLocalizeUrl } from '$lib/paraglide/runtime.js';

// In hooks.ts
export const reroute: Reroute = (request) => {
	return deLocalizeUrl(request.url).pathname;
};
```

---

## Cookie Functions

### extractLocaleFromCookie()

```typescript
function extractLocaleFromCookie(): string | undefined;
```

Extract locale from document cookie (client-side only).

```typescript
import { extractLocaleFromCookie } from '$lib/paraglide/runtime.js';

const locale = extractLocaleFromCookie();
```

---

## Server Functions

### extractLocaleFromHeader()

```typescript
function extractLocaleFromHeader(request: Request): string | undefined;
```

Extract locale from Accept-Language header.

```typescript
import { extractLocaleFromHeader } from '$lib/paraglide/runtime.js';

const locale = extractLocaleFromHeader(request);
```

### extractLocaleFromRequest()

```typescript
function extractLocaleFromRequest(request: Request): Locale;
```

Extract locale from a request using all configured strategies.

```typescript
import { extractLocaleFromRequest } from '$lib/paraglide/runtime.js';

const locale = extractLocaleFromRequest(request);
```

### extractLocaleFromRequestAsync()

```typescript
function extractLocaleFromRequestAsync(request: Request): Promise<Locale>;
```

Async version that supports custom async server strategies.

```typescript
import { extractLocaleFromRequestAsync } from '$lib/paraglide/runtime.js';

const locale = await extractLocaleFromRequestAsync(request);
```

---

## Custom Strategies

### defineCustomServerStrategy()

```typescript
function defineCustomServerStrategy(strategy: string, handler: CustomServerStrategyHandler): void;
```

Define a custom server-side locale detection strategy.

```typescript
import { defineCustomServerStrategy } from '$lib/paraglide/runtime.js';

defineCustomServerStrategy('custom-database', {
	getLocale: async (request) => {
		const userId = extractUserIdFromRequest(request);
		return await getUserLocaleFromDatabase(userId);
	}
});
```

### defineCustomClientStrategy()

```typescript
function defineCustomClientStrategy(strategy: string, handler: CustomClientStrategyHandler): void;
```

Define a custom client-side locale detection strategy.

```typescript
import { defineCustomClientStrategy } from '$lib/paraglide/runtime.js';

defineCustomClientStrategy('custom-storage', {
	getLocale: () => {
		return localStorage.getItem('user-locale') ?? undefined;
	},
	setLocale: (locale) => {
		localStorage.setItem('user-locale', locale);
	}
});
```

---

## Override Functions

### overwriteGetLocale()

```typescript
function overwriteGetLocale(fn: () => Locale): void;
```

Override how the locale is resolved.

```typescript
import { overwriteGetLocale, baseLocale } from '$lib/paraglide/runtime.js';

overwriteGetLocale(() => {
	return Cookies.get('locale') ?? baseLocale;
});
```

### overwriteSetLocale()

```typescript
function overwriteSetLocale(fn: SetLocaleFn): void;
```

Override how the locale is set.

```typescript
import { overwriteSetLocale } from '$lib/paraglide/runtime.js';

overwriteSetLocale((newLocale, options) => {
	Cookies.set('locale', newLocale, { maxAge: 60 * 60 * 24 * 365 });
	if (options?.reload !== false) {
		window.location.reload();
	}
});
```

---

## SSG Functions

### generateStaticLocalizedUrls()

```typescript
function generateStaticLocalizedUrls(urls: (string | URL)[]): URL[];
```

Generate all localized URL variants for static site generation.

```typescript
import { generateStaticLocalizedUrls, extractLocaleFromUrl } from '$lib/paraglide/runtime.js';

// In a +page.ts for prerendering
export function entries() {
	const paths = ['/', '/about', '/contact'];
	return generateStaticLocalizedUrls(paths).map((url) => ({
		locale: extractLocaleFromUrl(url)
	}));
}
```

---

## Redirect Detection

### shouldRedirect()

```typescript
function shouldRedirect(input?: ShouldRedirectInput): Promise<ShouldRedirectResult>;
```

Determine if a redirect is needed to align URL with current locale.

```typescript
import { shouldRedirect } from '$lib/paraglide/runtime.js';

// Client-side
const decision = await shouldRedirect({ url: window.location.href });
if (decision.shouldRedirect) {
	window.location.href = decision.redirectUrl.href;
}

// Server-side
const decision = await shouldRedirect({ request });
if (decision.shouldRedirect) {
	return Response.redirect(decision.redirectUrl, 307);
}
```
