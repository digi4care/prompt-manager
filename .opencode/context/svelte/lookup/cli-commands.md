<!-- Context: svelte/lookup | Priority: medium | Version: 1.0 | Updated: 2026-02-12 -->

# Lookup: CLI Install Commands

**Purpose**: Quick reference for Svelte/SvelteKit CLI commands.
**Last Updated**: 2026-02-12

---

## Project Creation

```bash
# Minimal project (recommended)
npx sv create myapp --template minimal --types ts --no-add-ons --no-install

# With add-ons interactively
npx sv create myapp
```

---

## Add-ons

```bash
cd myapp

# Tailwind with plugins
npx sv add "tailwindcss=plugins:typography,forms" --no-install

# Adapter (node)
npx sv add "sveltekit-adapter=adapter:node" --no-install

# Testing
npx sv add "vitest=usages:unit,component" --no-install

# i18n
npx sv add "paraglide=languageTags:en,nl" --no-install

# Linting
npx sv add eslint --no-install
npx sv add prettier --no-install

# MCP (AI assistance)
npx sv add mcp="ide:claude-code,vscode" --no-install
```

---

## Install Dependencies

```bash
bun install
# or
npm install
```

---

## shadcn-svelte

```bash
# Initialize
bunx shadcn-svelte@latest init \
  --base-color neutral \
  --css src/routes/layout.css \
  --components-alias "\$lib/components" \
  --lib-alias "\$lib" \
  --utils-alias "\$lib/utils" \
  --hooks-alias "\$lib/hooks" \
  --ui-alias "\$lib/components/ui"

# Add all components
bunx shadcn-svelte@latest add --all -y -o

# Add specific components
bunx shadcn-svelte@latest add button card dialog
```

---

## Additional Packages

```bash
# Auth
bun add better-auth

# Drag & Drop
bun add svelte-dnd-action

# Graph visualization
bun add @xyflow/svelte
```

---

## Dev Commands

```bash
bun run dev       # Start dev server
bun run build     # Production build
bun run preview   # Preview build
bun run check     # Type checking
```

---

## Reference

- Official: https://svelte.dev/docs/kit/cli
- Related: [shadcn-reference.md](shadcn-reference.md)
