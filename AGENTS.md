# AGENTS.md

## Very Important

Always check the "@.opencode/context/" directory for the latest project context.
The coding method is always "SOLID". 
Complex logic always goes into a separate file as SOLID dictates.

## Build, Lint, and Test Commands

### Development

- `npm run dev` - Start development server (port 45678, host 127.0.0.1)
- `npm run preview` - Preview production build (port 44678)
- `npm run check` - Run TypeScript and SvelteKit type checking
- `npm run check:watch` - Watch mode for type checking

### Testing

- `npm run test` - Run Vitest unit tests
- `npm run test:watch` - Watch mode for unit tests
- `npm run test:coverage` - Generate coverage report
- `npm run test:e2e` - Run Playwright E2E tests (chromium only)
- `npm run test:e2e:all` - Run E2E tests across all browsers (chromium, firefox)

### Database

- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio
- `npm run seed` - Seed database with initial data
- `npm run seed:verify` - Verify seed data

### Code Quality

- `npm run lint` - Run ESLint and Prettier checks
- `npm run format` - Format all files with Prettier

### Docker Testing

```bash
./scripts/run-tests-docker.sh bun run test
./scripts/run-tests-docker.sh bun run test:e2e:all
```

## Code Style Guidelines

### Formatting (Prettier)

- Use tabs for indentation
- Single quotes for strings
- No trailing commas
- Print width: 100 characters
- Plugins: prettier-plugin-svelte, prettier-plugin-tailwindcss

### Linting (ESLint)

- Flat config format
- Extends: @eslint/js, typescript-eslint, eslint-plugin-svelte
- TypeScript handles undefined variable checks (no-undef disabled)
- Svelte files use project service for type checking

### TypeScript Configuration

- Strict mode enabled
- No implicit any
- Strict null checks
- Module resolution: bundler
- ES Module interop enabled
- Force consistent casing in file names

### Naming Conventions

- **Functions**: camelCase (e.g., `createPrompt`, `listPrompts`)
- **Components**: PascalCase (e.g., `PromptEditor`, `Button`)
- **Files**: lowercase with dashes (e.g., `prompt-editor.svelte`, `auth.service.ts`)
- **Constants**: UPPER_SNAKE_CASE for config values (e.g., `RATE_LIMIT_MAX_REQUESTS`)
- **Interfaces**: PascalCase with descriptive names (e.g., `ListPromptsResult`)

### Imports and Module Organization

- Use `$lib` alias for shared code imports
- Relative imports for local files in same directory
- Group imports: external libraries, $lib imports, relative imports
- Named exports preferred for utility functions
- Default exports for page components and routes

Example:

```typescript
import { db } from '../db/client';
import { prompts, type NewPrompt, type Prompt } from '../db/schema';
import { eq, desc, like, isNull, and, count } from 'drizzle-orm';
```

### Svelte 5 Patterns

- Use runes for state: `$state()`, `$derived()`, `$props()`, `$effect()`
- Event handlers: `onclick`, `onchange` (lowercase, no "on" prefix in HTML)
- Bindable props: `let { value = $bindable(''), ... }: Props = $props()`
- Derived values: `let wordCount = $derived(countWords(value))`
- Effects: `$effect(() => { ... })`
- Optional chaining for callbacks: `onchange?.(newValue)`

### Error Handling

- Server routes: Use `throw error(status, message)` from `@sveltejs/kit`
- Wrap async operations in try-catch blocks
- Log errors with `console.error()` including context
- Validation: Use Zod schemas with `safeParse()`
- Return sanitized error messages in production (no stack traces)
- Audit logging for security events (rate limits, auth failures)

Example:

```typescript
try {
	const result = await db.insert(prompts).values(data).returning();
	return json(result);
} catch (err) {
	console.error('Failed to create prompt:', err);
	throw error(500, 'Failed to create prompt');
}
```

### Database Operations (Drizzle ORM)

- Use schema imports from `$lib/server/db/schema`
- Return types explicitly: `Promise<Prompt | null>`
- Soft delete pattern: Use `deletedAt` column instead of hard delete
- Use `isNull()` for checking deleted records
- Return null for not found: `return prompt || null`
- Use transactions for multi-statement operations

### OpenCode Integration

- **SDK (`@opencode-ai/sdk`)** = primary method for OpenCode communication
- **Server REST endpoints** = fallback when SDK doesn't support a specific function
- Always try SDK first, fall back to direct HTTP calls if needed

### API Design

- Use Zod schemas for request validation
- Consistent response format with `json()` helper
- Pagination: `{ data, pagination: { limit, offset, hasMore } }`
- Authentication: JWT-based with `authenticateRequest()` helper
- Rate limiting: In-memory Map with window-based tracking

### Security

- Use `crypto.timingSafeEqual()` for password/comparison
- Environment validation on server start
- CORS headers for API routes
- CSP and security headers in responses
- Constant-time comparison for sensitive data

### Testing Patterns

- Unit tests: Vitest with `@testing-library/svelte`
- E2E tests: Playwright with multiple browser support
- Test files: `tests/**/*.test.{ts,js}` and `e2e/**/*.spec.{ts,js}`
- Setup file: `tests/setup.ts`
- Environment: jsdom for unit tests
