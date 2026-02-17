# How To Install Svelte 5 with CLI

## CLI Installation

```bash
# 1. Create project
npx sv create focuscoder --template minimal --types ts --no-add-ons --no-install

# 2. Add-ons sequentieel
cd focuscoder
npx sv add "tailwindcss=plugins:typography,forms" --no-install
npx sv add "sveltekit-adapter=adapter:node" --no-install
npx sv add "vitest=usages:unit,component" --no-install
npx sv add "paraglide=languageTags:en,demo:no" --no-install
npx sv add eslint --no-install
npx sv add prettier --no-install
npx sv add mcp="ide:claude-code,vscode" --no-install

# 3. Install dependencies
bun install

# 4. shadcn-svelte
bunx shadcn-svelte@latest init --base-color neutral --css src/routes/layout.css --components-alias "\$lib/components" --lib-alias "\$lib" --utils-alias "\$lib/utils" --hooks-alias "\$lib/hooks" --ui-alias "\$lib/components/ui" 
bunx shadcn-svelte@latest add --all -y -o

# 5. Better Auth
bun add better-auth

# 6. Drag & Drop
bun add svelte-dnd-action

# 7. Graph visualization
bun add @xyflow/svelte
```

---
