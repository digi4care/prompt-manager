---
source: Context7 API + Official Docs
library: Paraglide JS
package: @inlang/paraglide-sveltekit
topic: SvelteKit Setup Guide with Svelte 5
fetched: 2026-03-02T12:00:00Z
official_docs: https://inlang.com/m/gerre34r/library-inlang-paraglideJs/sveltekit
---

# Paraglide JS SvelteKit Setup Guide (Svelte 5)

Paraglide JS is SvelteKit's **official i18n integration**. It's a compiler-based i18n library that emits tree-shakable translations, leading to up to 70% smaller i18n bundle sizes compared to runtime based libraries.

- Fully type-safe with IDE autocomplete
- SEO-friendly localized URLs with i18n routing strategy
- Works with CSR, SSR, and SSG

---

## Step 1: Initialize Paraglide JS

Run the init command to set up the project:

```bash
npx @inlang/paraglide-js@latest init
```

This will:

- Create the `project.inlang/` directory
- Create the `messages/` directory with initial locale files
- Update your `package.json` with necessary dependencies

---

## Step 2: Create project.inlang/settings.json

Create or update `project.inlang/settings.json`:

```json
{
	"baseLocale": "en",
	"locales": ["en", "nl"],
	"modules": ["https://cdn.jsdelivr.net/npm/@inlang/plugin-message-format@latest/dist/index.js"]
}
```

**Note:** The `plugin-message-format` is the default format that supports:

- Simple key-value pairs
- Placeholder syntax: `{name}`
- Pluralization: `{count, plural, one {# item} other {# items}}`

---

## Step 3: Create Messages Files

Create `messages/en.json`:

```json
{
	"site_title": "Prompt Manager",
	"nav_home": "Home",
	"nav_prompts": "Prompts",
	"nav_settings": "Settings",
	"greeting": "Hello {name}!",
	"items_count": "{count, plural, one {# prompt} other {# prompts}}",
	"welcome_message": "Welcome to {appName}, {username}!",
	"login_button": "Sign In",
	"logout_button": "Sign Out",
	"save_button": "Save",
	"cancel_button": "Cancel",
	"delete_button": "Delete",
	"error_generic": "Something went wrong. Please try again.",
	"success_saved": "Successfully saved!"
}
```

Create `messages/nl.json`:

```json
{
	"site_title": "Prompt Beheerder",
	"nav_home": "Home",
	"nav_prompts": "Prompts",
	"nav_settings": "Instellingen",
	"greeting": "Hallo {name}!",
	"items_count": "{count, plural, one {# prompt} other {# prompts}}",
	"welcome_message": "Welkom bij {appName}, {username}!",
	"login_button": "Inloggen",
	"logout_button": "Uitloggen",
	"save_button": "Opslaan",
	"cancel_button": "Annuleren",
	"delete_button": "Verwijderen",
	"error_generic": "Er ging iets mis. Probeer het opnieuw.",
	"success_saved": "Succesvol opgeslagen!"
}
```

---

## Step 4: Configure vite.config.js

Add the `paraglideVitePlugin()` to your Vite config:

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';

export default defineConfig({
	plugins: [
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'cookie', 'baseLocale']
		})
	]
});
```

**Strategy options (in order of precedence):**

- `url` - Extract locale from URL path (e.g., `/nl/about`)
- `cookie` - Read/write locale from a cookie
- `baseLocale` - Fall back to the base locale (e.g., `en`)
- `preferredLanguage` - Use browser's Accept-Language header
- `localStorage` - Store preference in localStorage (client-side)

---

## Step 5: Update src/app.html

Add `%lang%` placeholder for dynamic language attribute:

```html
<!doctype html>
<html lang="%lang%">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.png" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

---

## Step 6: Add Server Hook (hooks.server.ts)

Create or update `src/hooks.server.ts`:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replace('%lang%', locale);
			}
		});
	});

export const handle: Handle = paraglideHandle;
```

---

## Step 7: Add Reroute Hook (hooks.ts)

Create or update `src/hooks.ts` (NOT hooks.server.ts):

```typescript
// src/hooks.ts
import type { Reroute } from '@sveltejs/kit';
import { deLocalizeUrl } from '$lib/paraglide/runtime';

export const reroute: Reroute = (request) => {
	return deLocalizeUrl(request.url).pathname;
};
```

This allows SvelteKit to match localized URLs (e.g., `/nl/about`) to your route files (e.g., `routes/about/+page.svelte`).

---

## Step 8: Use Messages in Components

### Basic Usage

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<h1>{m.site_title()}</h1><p>{m.greeting({ name: 'User' })}</p>
```

### With Parameters

```svelte
<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	let count = $state(5);
</script>

<p>{m.items_count({ count })}</p>
<!-- English: "5 prompts" -->
<!-- Dutch: "5 prompts" -->
```

### Force a Specific Locale

```svelte
<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<!-- Always render in English regardless of current locale -->
<p>{m.greeting({ name: 'World' }, { locale: 'en' })}</p>
```

---

## Step 9: Language Detection and Switching

### Get Current Locale

```typescript
import { getLocale } from '$lib/paraglide/runtime.js';

const currentLocale = getLocale(); // "en" or "nl"
```

### Set Locale (with page reload)

```typescript
import { setLocale } from '$lib/paraglide/runtime.js';

// Switch to Dutch (triggers page reload)
setLocale('nl');
```

### Set Locale (without reload)

```typescript
import { setLocale } from '$lib/paraglide/runtime.js';

// Switch without reload - you need to handle re-render
setLocale('nl', { reload: false });
```

---

## Step 10: Create a Locale Switcher Component

Create `src/lib/components/LocaleSwitcher.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref, getLocale } from '$lib/paraglide/runtime';

	const localeNames: Record<string, string> = {
		en: 'English',
		nl: 'Nederlands'
	};
</script>

<nav class="locale-switcher" aria-label="Languages">
	{#each locales as locale}
		<a
			href={localizeHref(page.url.pathname, { locale })}
			data-sveltekit-reload
			class:active={getLocale() === locale}
		>
			{localeNames[locale] || locale}
		</a>
	{/each}
</nav>

<style>
	.locale-switcher {
		display: flex;
		gap: 0.5rem;
	}

	.locale-switcher a {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		text-decoration: none;
	}

	.locale-switcher a.active {
		font-weight: bold;
		background-color: var(--active-bg, #e0e0e0);
	}
</style>
```

**Important:** The `data-sveltekit-reload` attribute ensures a full page reload when switching languages, which applies the new locale immediately.

---

## Step 11: Use in +layout.svelte

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';

	let { children } = $props();
</script>

<header>
	<nav>
		<a href="/">{m.nav_home}</a>
		<a href="/prompts">{m.nav_prompts}</a>
		<a href="/settings">{m.nav_settings}</a>
	</nav>
	<LocaleSwitcher />
</header>

<main>
	{@render children()}
</main>
```

---

## Step 12: Localized Navigation Links

Use `localizeHref()` for all internal links:

```svelte
<script lang="ts">
	import { localizeHref } from '$lib/paraglide/runtime.js';
</script>

<a href={localizeHref('/about')}>About</a>
<!-- Renders as: /en/about or /nl/about depending on locale -->
```

---

## Runtime API Reference

### Imports from `$lib/paraglide/messages.js`

```typescript
import { m } from '$lib/paraglide/messages.js';

// Use messages
m.greeting({ name: 'World' }); // "Hello World!"
m.items_count({ count: 5 }); // "5 items"
```

### Imports from `$lib/paraglide/runtime.js`

```typescript
import {
	// Variables
	baseLocale, // "en"
	locales, // ["en", "nl"]

	// Functions
	getLocale, // () => "en" | "nl"
	setLocale, // (locale, options?) => void
	isLocale, // (locale) => boolean
	assertIsLocale, // (input) => Locale (throws if invalid)

	// URL functions
	localizeHref, // (href, options?) => string
	deLocalizeHref, // (href) => string
	localizeUrl, // (url, options?) => URL
	deLocalizeUrl, // (url) => URL

	// Cookie functions
	extractLocaleFromCookie,

	// Header functions (server-side)
	extractLocaleFromHeader,
	extractLocaleFromRequest
} from '$lib/paraglide/runtime.js';
```

---

## URL Patterns (Advanced)

By default, Paraglide prefixes all non-base locales:

| Locale    | URL Pattern |
| --------- | ----------- |
| en (base) | `/about`    |
| nl        | `/nl/about` |

To prefix ALL locales including base:

```javascript
// vite.config.js
paraglideVitePlugin({
	project: './project.inlang',
	outdir: './src/lib/paraglide',
	strategy: ['url', 'cookie', 'baseLocale'],
	urlPatterns: [
		{
			pattern: '/',
			localized: [
				['en', '/en'],
				['nl', '/nl']
			]
		},
		{
			pattern: '/:path(.*)?',
			localized: [
				['en', '/en/:path(.*)?'],
				['nl', '/nl/:path(.*)?']
			]
		}
	]
});
```

---

## Static Site Generation (SSG)

For SSG, add to `routes/+layout.ts`:

```typescript
// routes/+layout.ts
export const prerender = true;
```

And ensure your locale switcher has `data-sveltekit-reload` to trigger full page reloads.

---

## Troubleshooting

### Edge Adapter (Vercel Edge / Cloudflare Pages)

Disable AsyncLocalStorage for serverless environments:

```javascript
// vite.config.js
paraglideVitePlugin({
	project: './project.inlang',
	outdir: './src/lib/paraglide',
	strategy: ['url', 'cookie', 'baseLocale'],
	disableAsyncLocalStorage: true // Add this
});
```

### SPA Mode with Static Adapter

Make asset paths absolute:

```javascript
// svelte.config.js
const config = {
	kit: {
		adapter: adapter(),
		paths: {
			relative: false
		}
	}
};
```

---

## Type-Safe Localized Strings

Message functions return `LocalizedString`, a special type:

```typescript
import type { LocalizedString } from '$lib/paraglide/runtime.js';

function PageTitle(props: { title: LocalizedString }) {
  return <h1>{props.title}</h1>;
}

<PageTitle title={m.welcome_title()} />  // ✅ Valid
<PageTitle title="Welcome" />            // ❌ Type error
```
