# Architecture

**Analysis Date:** 2026-02-14

## Pattern Overview

**Overall:** SvelteKit Full-Stack Application with Service Layer Architecture

**Key Characteristics:**

- File-based routing with SvelteKit conventions (`+page.svelte`, `+page.server.ts`, `+server.ts`)
- Service layer pattern separating business logic from routes
- Repository pattern via Drizzle ORM for database access
- Dual authentication: Better Auth (sessions) + JWT (API tokens)
- Adapter pattern for OpenCode AI integration with domain-specific error handling

## Layers

### Route Layer

- **Purpose:** HTTP request handling, validation, response formatting
- **Location:** `src/routes/`
- **Contains:**
  - Page routes (`+page.svelte`, `+page.server.ts`)
  - API endpoints (`+server.ts`)
  - Layout routes (`+layout.svelte`, `+layout.server.ts`)
- **Depends on:** Services, validators, auth modules
- **Used by:** HTTP client (browser, external API consumers)

### Service Layer

- **Purpose:** Business logic, orchestration, data transformation
- **Location:** `src/lib/server/services/`
- **Contains:** Domain services for prompts, versions, improvement, judging, analytics
- **Depends on:** Database client, OpenCode service, admin settings
- **Used by:** Route handlers

### Data Access Layer

- **Purpose:** Database operations via Drizzle ORM
- **Location:** `src/lib/server/db/`
- **Contains:**
  - `schema.ts` - Table definitions and relations
  - `client.ts` - Database connection singleton
  - `seed.ts` - Initial data seeding
- **Depends on:** libsql/SQLite database
- **Used by:** Services

### Component Layer

- **Purpose:** Reusable UI components
- **Location:** `src/lib/components/`
- **Contains:**
  - `ui/` - Base UI components (button, card, dialog, toast, etc.)
  - `prompts/` - Prompt-specific components (editor, list, metadata)
  - `improvement/` - AI improvement workflow components
  - `layout/` - Layout components (header, sidebar, mobile-nav)
  - `visualizations/` - Charts and metrics dashboards
  - `versions/` - Version diff and timeline components
  - `admin/` - Admin settings components
- **Depends on:** Svelte 5 runes, `$lib` utilities
- **Used by:** Page components

### Store Layer (Client State)

- **Purpose:** Client-side state management with Svelte 5 runes
- **Location:** `src/lib/stores/`
- **Contains:**
  - `auth.svelte.ts` - Authentication state
  - `prompts.svelte.ts` - Prompt data caching
  - `date-format.svelte.ts` - User preferences
  - `content-types.svelte.ts` - Content type management
- **Depends on:** Svelte stores, `$app/stores`
- **Used by:** Components

## Data Flow

### Page Load Flow

1. Browser requests page URL
2. SvelteKit matches route in `src/routes/`
3. Server load function (`+page.server.ts`) calls services
4. Services query database via Drizzle ORM
5. Data returned to page as props
6. Svelte component renders with data

### API Request Flow

1. Client sends HTTP request to `/api/*` endpoint
2. `hooks.server.ts` handles:
   - Rate limiting (in-memory Map)
   - Authentication (JWT or Better Auth session)
   - Security headers (CSP, CORS)
3. Route handler (`+server.ts`) validates with Zod
4. Service layer processes business logic
5. Database operations via Drizzle
6. JSON response returned

### AI Improvement Flow

1. User initiates improvement from prompt detail page
2. `POST /api/prompts/[id]/improve` receives request
3. `improvement.service.ts` orchestrates:
   - Load policy from `admin-settings.service.ts`
   - Resolve model/temperature/preset parameters
   - Call `opencode.service.ts` with session-based execution
4. OpenCode SDK communicates with external AI service
5. Variants returned and displayed in `improvement-panel.svelte`
6. User selects variant, new version created

## Key Abstractions

### Service Pattern

- **Purpose:** Encapsulate business logic with clear interfaces
- **Examples:**
  - `src/lib/server/services/prompts.service.ts`
  - `src/lib/server/services/versions.service.ts`
  - `src/lib/server/services/improvement.service.ts`
- **Pattern:**
  ```typescript
  export async function createPrompt(data: NewPrompt): Promise<Prompt>;
  export async function getPrompt(id: number): Promise<Prompt | null>;
  export async function listPrompts(limit, offset, search?): Promise<ListPromptsResult>;
  export async function updatePrompt(id, data): Promise<Prompt>;
  export async function deletePrompt(id): Promise<void>;
  ```

### Repository Pattern (Drizzle)

- **Purpose:** Type-safe database access with schema inference
- **Examples:** `src/lib/server/db/schema.ts`, `src/lib/server/db/client.ts`
- **Pattern:**

  ```typescript
  // Schema defines types
  export const prompts = sqliteTable('prompts', { ... });
  export type Prompt = typeof prompts.$inferSelect;

  // Client provides singleton connection
  export const db = drizzle(getClient(), { schema });

  // Usage in services
  const [prompt] = await db.insert(prompts).values(data).returning();
  ```

### Error Hierarchy (OpenCode)

- **Purpose:** Stable error handling across service boundaries
- **Examples:** `src/lib/server/services/opencode.service.ts`
- **Pattern:**
  ```typescript
  class OpenCodeError extends Error { code: string; originalError?: Error; }
  class OpenCodeConnectionError extends OpenCodeError { ... }
  class OpenCodeAuthenticationError extends OpenCodeError { ... }
  class OpenCodeValidationError extends OpenCodeError { ... }
  class OpenCodeExecutionError extends OpenCodeError { ... }
  ```

### Validator Pattern (Zod)

- **Purpose:** Runtime type validation with compile-time inference
- **Examples:** `src/lib/validators/prompt-metadata.ts`
- **Pattern:**

  ```typescript
  export const promptMetadataSchema = z.object({
  	title: z.string().min(1).max(100),
  	description: z.string().max(500).optional()
  });
  export type PromptMetadataData = z.infer<typeof promptMetadataSchema>;

  export function validatePromptMetadata(data) {
  	const result = promptMetadataSchema.safeParse(data);
  	// Returns { success, errors, data }
  }
  ```

## Entry Points

### Server Entry Point

- **Location:** `src/hooks.server.ts`
- **Triggers:** Every HTTP request
- **Responsibilities:**
  - Environment validation on startup
  - Better Auth session resolution
  - Rate limiting (per IP/route)
  - Route protection (authentication check)
  - Security header injection (CSP, CORS, HSTS)
  - Error handling (sanitized production errors)

### Page Entry Point

- **Location:** `src/routes/+layout.svelte`
- **Triggers:** Initial page load, navigation
- **Responsibilities:**
  - Global CSS import (`app.css`)
  - Header component rendering
  - Main content area layout
  - Toast notification container

### API Entry Points

- **Location:** `src/routes/api/**/+server.ts`
- **Triggers:** HTTP requests to `/api/*`
- **Pattern:**
  ```typescript
  export const GET: RequestHandler = async (event) => { ... }
  export const POST: RequestHandler = async (event) => { ... }
  ```

## Error Handling

**Strategy:** Layered error handling with context preservation

**Patterns:**

### Server Routes

```typescript
try {
	const result = await service.operation();
	return json(result);
} catch (err) {
	console.error('Failed to operation:', err);
	throw error(500, JSON.stringify({ message: 'Operation failed', errors: null }));
}
```

### API Validation Errors

```typescript
const parsed = schema.safeParse(data);
if (!parsed.success) {
	throw error(
		400,
		JSON.stringify({
			message: 'Validation failed',
			errors: parsed.error.flatten()
		})
	);
}
```

### Global Error Handler

```typescript
// hooks.server.ts
export const handleError: HandleServerError = async ({ error, event }) => {
	console.error('[ERROR]', { message, stack, ip, userAgent });
	// Production: hide stack traces
	// Development: show full error
};
```

### OpenCode Errors

```typescript
// Domain-specific error mapping
function mapOpenCodeError(err: unknown): never {
	if (/ECONNREFUSED|ENOTFOUND/.test(message)) {
		throw new OpenCodeConnectionError('Unable to connect...', originalError);
	}
	// ... more mappings
}
```

## Cross-Cutting Concerns

### Logging

- **Approach:** Console-based with structured prefixes
- **Pattern:** `console.error('[AUDIT] User action:', details)`
- **Security events:** Logged via `logSecurityEvent()` from `src/lib/server/audit.ts`

### Validation

- **Approach:** Zod schemas for runtime validation
- **Location:** `src/lib/validators/` and inline in API routes
- **Pattern:** `schema.safeParse(data)` with error flattening

### Authentication

- **Approach:** Dual system
  1. **Better Auth** - Session-based for web UI (`src/lib/auth.ts`)
  2. **JWT** - Token-based for API access (`src/lib/server/auth/jwt.ts`)
- **Integration:** Both checked in `hooks.server.ts` via `isAdminAuthenticated()`
- **Token storage:** HTTP-only cookies (`jwt_token`, Better Auth session cookies)

### Authorization

- **Approach:** Route-level protection in `hooks.server.ts`
- **Public routes:** `/login`, `/api/health`, `/favicon.ico`, `/static/`
- **Protected routes:** All others require authentication
- **Role checks:** `requireAdmin()` function for admin-only operations

### Rate Limiting

- **Approach:** In-memory Map with sliding window
- **Config:**
  - General routes: 100 requests/minute
  - Auth routes: 30 requests/minute
- **Implementation:** `isRateLimited()` in `hooks.server.ts`

### Security Headers

- **CSP:** Restrictive default, allows inline scripts/styles for Monaco
- **CORS:** Configurable via `ALLOWED_ORIGINS` env var
- **Other:** X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

---

_Architecture analysis: 2026-02-14_
