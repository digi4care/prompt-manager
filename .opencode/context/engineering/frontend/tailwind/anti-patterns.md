<!-- Context: development/frontend/tailwind | Priority: high | Version: 1.0 | Updated: 2026-02-27 -->

# Tailwind CSS 4 Anti-Patterns

Common mistakes with Tailwind CSS v4 (released Jan 2025).

---

## Configuration Anti-Patterns

### ❌ WRONG: Using old tailwind.config.js

```js
// ❌ Tailwind v4 doesn't use tailwind.config.js!
export default {
	theme: {
		extend: {
			colors: {
				brand: '#3b82f6'
			}
		}
	}
};
```

### ✅ RIGHT: CSS-first @theme

```css
/* app.css */
@import 'tailwindcss';

@theme {
	--color-brand: oklch(0.6 0.2 250);
	--color-brand-dark: oklch(0.5 0.2 250);
	--font-display: 'Inter', sans-serif;
}
```

**Rule**: Tailwind v4 uses CSS configuration, not JS config files.

---

## @apply Overuse

### ❌ WRONG: @apply for everything

```css
/* ❌ This defeats the purpose of utility-first */
.card {
	@apply rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg;
}

.button {
	@apply rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600;
}
```

### ✅ RIGHT: Use utilities in HTML, @apply sparingly

```svelte
<!-- ✅ Utilities directly in template -->
<div class="rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg">
	<button class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"> Click </button>
</div>
```

```css
/* ✅ @apply only for base styles or resets */
@layer base {
	html {
		@apply antialiased;
	}
}
```

**Rule**: @apply only for base styles. Prefer utility classes in templates.

---

## Dynamic Class Construction

### ❌ WRONG: String concatenation

```svelte
<script>
  let variant = 'blue';
</script>

<!-- ❌ Tailwind can't detect this! -->
<button class="bg-{variant}-500 hover:bg-{variant}-600">
```

### ✅ RIGHT: Static class mapping

```svelte
<script>
  let variant = 'blue';

  const variants = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    red: 'bg-red-500 hover:bg-red-600',
    green: 'bg-green-500 hover:bg-green-600'
  };
</script>

<button class={variants[variant]}>
```

**Rule**: All classes must be statically detectable for purging.

---

## Arbitrary Value Abuse

### ❌ WRONG: Arbitrary values everywhere

```html
<!-- ❌ Loses design system consistency -->
<div class="mt-[7px] bg-[#ff6b35] p-[13px]"></div>
```

### ✅ RIGHT: Use design tokens

```css
@theme {
	--spacing-section: 3.5rem;
	--color-accent: oklch(0.7 0.2 30);
}
```

```html
<!-- ✅ Uses design tokens -->
<div class="p-section mt-2 bg-accent"></div>
```

**Rule**: Define tokens in @theme. Use arbitrary values only for one-offs.

---

## Color System Mistakes

### ❌ WRONG: Hex colors without variants

```css
@theme {
	--color-brand: #3b82f6; /* ❌ No dark/light variants */
}
```

### ✅ RIGHT: Full color palette

```css
@theme {
	--color-brand-50: oklch(0.97 0.02 250);
	--color-brand-100: oklch(0.94 0.04 250);
	--color-brand-500: oklch(0.6 0.2 250);
	--color-brand-600: oklch(0.5 0.2 250);
	--color-brand-900: oklch(0.3 0.15 250);
}
```

---

## Responsive Design Mistakes

### ❌ WRONG: Mobile-last design

```html
<!-- ❌ Mobile gets ALL styles by default -->
<div class="bg-blue-500 md:bg-red-500 lg:bg-green-500"></div>
```

### ✅ RIGHT: Mobile-first approach

```html
<!-- ✅ Start mobile, add complexity up -->
<div class="bg-blue-500 md:bg-red-500 lg:bg-green-500">
	<!-- Meaning: mobile=blue, tablet+=red, desktop+=green -->
</div>
```

---

## Component Architecture

### ❌ WRONG: Giant utility strings

```svelte
<!-- ❌ Hard to read, hard to maintain -->
<button class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200">
```

### ✅ RIGHT: Component abstraction

```svelte
<!-- Button.svelte -->
<script>
	let { variant = 'primary', size = 'md', disabled = false } = $props();

	const baseClasses =
		'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

	const variants = {
		primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
		secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500'
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-sm',
		lg: 'px-6 py-3 text-base'
	};
</script>

<button class="{baseClasses} {variants[variant]} {sizes[size]}" {disabled}>
	<slot />
</button>
```

```svelte
<!-- Usage -->
<Button variant="primary" size="md">Click me</Button>
```

---

## Performance Mistakes

### ❌ WRONG: Not purging in production

```js
// vite.config.ts - missing content paths
export default defineConfig({
	plugins: [sveltekit()]
});
```

### ✅ RIGHT: Configure content scanning

```css
/* app.css */
@source '../src/**/*.{svelte,ts,js}';

@import 'tailwindcss';
```

---

## Quick Reference

| ❌ Wrong                 | ✅ Right                    |
| ------------------------ | --------------------------- |
| `tailwind.config.js`     | `@theme` in CSS             |
| `@apply` for components  | Utility classes in template |
| `class="bg-{color}-500"` | Static class mapping object |
| `p-[13px]` everywhere    | Define tokens in `@theme`   |
| Giant class strings      | Component abstraction       |
| Missing `@source`        | Configure content scanning  |

---

## Tailwind v4 Key Changes

1. **Oxide engine** - 5x faster builds
2. **CSS-first config** - No `tailwind.config.js`
3. **Native cascade layers** - Better specificity
4. **@source directive** - Content scanning in CSS
5. **@property support** - CSS custom properties
6. **color-mix()** - Native color manipulation

---

## Related

- `../../frameworks/svelte/anti-patterns.md` - Svelte patterns
- `../../frameworks/sveltekit/anti-patterns.md` - SvelteKit patterns
- `~/.config/opencode/skill/tailwind/SKILL.md` - Full Tailwind reference
