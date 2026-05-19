# Testing Patterns

**Analysis Date:** 2026-02-14

## Test Framework

**Runner:**

- Vitest for unit tests
- Playwright for E2E tests
- Config: `vitest.config.ts` and `playwright.config.ts`

**Assertion Library:**

- Vitest built-in assertions (`expect`, `describe`, `it`, `beforeEach`, `afterEach`)
- Playwright Test assertions for E2E
- `@testing-library/jest-dom` for DOM assertions

**Run Commands:**

```bash
bun run test              # Run all unit tests
bun run test:watch        # Watch mode
bun run test:coverage     # Coverage report
bun run test:e2e          # Run E2E tests (chromium only)
bun run test:e2e:all      # Run E2E tests across all browsers
```

## Test File Organization

**Location:**

- Unit tests: `tests/**/*.test.ts` (separate from source)
- E2E tests: `e2e/**/*.spec.ts` (separate directory)
- Pattern: Separate test directory, not co-located

**Naming:**

- Unit tests: `*.test.ts` suffix (e.g., `prompts.test.ts`)
- E2E tests: `*.spec.ts` suffix (e.g., `prompts.spec.ts`)
- Test doubles: `*.test-double.test.ts` (e.g., `opencode.test-double.test.ts`)

**Structure:**

```
tests/
├── setup.ts                    # Global test setup
├── ws-interop.ts               # WebSocket mock for libsql
├── prompts.test.ts             # Store/logic tests
├── layout.test.ts              # Layout tests
├── improvement/
│   ├── JudgeResults.test.ts    # Component logic tests
│   └── VariantComparison.test.ts
├── integration/
│   ├── better-auth.test.ts     # Integration tests
│   └── better-auth-config.test.ts
├── mocks/
│   └── opencode.test-double.test.ts
└── server/
    ├── auth/
    │   └── jwt.test.ts
    └── env.test.ts

e2e/
├── prompts.spec.ts             # E2E prompt tests
├── prompt-editor.spec.ts       # E2E editor tests
├── new-prompt.spec.ts          # E2E new prompt page
└── ...                         # Many more E2E specs
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PromptsStore', () => {
	let store: PromptsStore;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		store = new PromptsStore();
		mockFetch = vi.fn();
		(global as { fetch: typeof mockFetch }).fetch = mockFetch;
	});

	afterEach(() => {
		store.reset();
	});

	describe('Initial State', () => {
		it('should initialize with empty prompts list', () => {
			expect(store.prompts).toEqual([]);
			expect(store.hasPrompts).toBe(false);
		});
	});

	describe('fetchPrompts', () => {
		it('should fetch prompts successfully', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ data: [], pagination: { ... } })
			});

			await store.fetchPrompts();

			expect(store.prompts).toHaveLength(0);
		});
	});
});
```

**Patterns:**

- Group tests by functionality using nested `describe` blocks
- Use `beforeEach` for setup, `afterEach` for cleanup
- Test both success and error cases
- Test edge cases (empty data, null values, boundary conditions)

## Mocking

**Framework:** Vitest (`vi`)

**Patterns:**

```typescript
// Mock global fetch
global.fetch = vi.fn();

// Mock with resolved value
mockFetch.mockResolvedValueOnce({
	ok: true,
	json: () => Promise.resolve({ data: samplePrompts })
});

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	clear: vi.fn(),
	removeItem: vi.fn()
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	value: vi.fn().mockReturnValue({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	}),
	writable: true
});

// Mock modules
vi.mock('ws', () => ({
	WebSocket: class {},
	default: class {}
}));
```

**What to Mock:**

- Global APIs (fetch, localStorage, window properties)
- External dependencies (WebSocket, database clients)
- Network requests

**What NOT to Mock:**

- Business logic (test actual implementation)
- Pure functions (test with real inputs)
- Type definitions

## Fixtures and Factories

**Test Data:**

```typescript
// Sample test data defined inline
const samplePrompts: Prompt[] = [
	{
		id: 1,
		title: 'Test Prompt 1',
		description: 'Description 1',
		purpose: 'coding',
		tags: ['test', 'sample'],
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-02'),
		latestVersionId: 1,
		deletedAt: null
	}
	// ... more items
];

// Sample evaluation data
const sampleEvaluation: JudgeResponse = {
	clarity: 78,
	completeness: 82,
	specificity: 65,
	gaps: ['Missing context', 'No edge case handling'],
	recommendations: ['Add explicit instructions', 'Specify handling']
};
```

**Location:**

- Test data defined inline in test files
- No separate fixture directory detected
- Shared types imported from source modules

## Coverage

**Requirements:** No explicit coverage target enforced

**View Coverage:**

```bash
bun run test:coverage
```

**Coverage Config:** Not explicitly configured in `vitest.config.ts`

## Test Types

**Unit Tests:**

- Test stores, services, and utility functions
- Use mocking for external dependencies
- Test business logic in isolation
- Location: `tests/**/*.test.ts`

```typescript
// Unit test example - testing store behavior
describe('updatePrompt', () => {
	it('should update prompt with optimistic update', async () => {
		store.prompts = [...samplePrompts];

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ ...updatedPrompt })
		});

		await store.updatePrompt(1, { title: 'Updated Title' });

		expect(store.prompts[0].title).toBe('Updated Title');
	});

	it('should rollback on update failure', async () => {
		store.prompts = [...samplePrompts];
		const originalTitle = store.prompts[0].title;

		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: () => Promise.resolve({ error: { message: 'Failed' } })
		});

		await expect(store.updatePrompt(1, { title: 'Failed' })).rejects.toThrow('Failed');

		expect(store.prompts[0].title).toBe(originalTitle);
	});
});
```

**Integration Tests:**

- Test authentication flows
- Test database interactions
- Location: `tests/integration/`

**E2E Tests:**

- Framework: Playwright
- Browsers: Chromium (default), Firefox (all tests)
- Location: `e2e/**/*.spec.ts`
- Test full user flows in browser

```typescript
// E2E test example
import { test, expect } from '@playwright/test';

test.describe('PromptCard Component', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/test');
		await page.waitForLoadState('networkidle');
	});

	test('should render prompt cards', async ({ page }) => {
		const listContainer = page.locator('#prompts-section #prompt-list-container').first();
		const cards = listContainer.locator('[role="button"]');
		await expect(cards).toHaveCount(3);
	});

	test('should display prompt title on first card', async ({ page }) => {
		const firstCard = page.locator('#prompts-section [role="button"]').first();
		await expect(firstCard.locator('h3')).toHaveText('SQL Query Generator');
	});
});
```

## Common Patterns

**Async Testing:**

```typescript
// Testing async operations
it('should fetch prompts successfully', async () => {
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: () => Promise.resolve({ data: samplePrompts })
	});

	await store.fetchPrompts();

	expect(store.prompts).toHaveLength(2);
});

// Testing loading state during async
it('should update loading state during fetch', async () => {
	let resolvePromise: (value: unknown) => void;
	const promise = new Promise((resolve) => {
		resolvePromise = resolve;
	});

	mockFetch.mockReturnValueOnce(promise as Promise<Response>);

	const fetchPromise = store.fetchPrompts();

	expect(store.loading).toBe(true);

	resolvePromise!({ ok: true, json: () => Promise.resolve({ ... }) });
	await fetchPromise;

	expect(store.loading).toBe(false);
});
```

**Error Testing:**

```typescript
// Testing error cases
it('should set error on fetch failure', async () => {
	mockFetch.mockResolvedValueOnce({
		ok: false,
		status: 500,
		json: () => Promise.resolve({ error: { message: 'Server error' } })
	});

	await expect(store.fetchPrompts()).rejects.toThrow('Server error');
	expect(store.error).toBe('Server error');
	expect(store.loading).toBe(false);
});

// Testing not found
it('should set error when prompt not found', async () => {
	mockFetch.mockResolvedValueOnce({
		ok: false,
		status: 404,
		json: () => Promise.resolve({ error: { message: 'Prompt not found' } })
	});

	await expect(store.fetchPrompt(999)).rejects.toThrow('Prompt not found');
	expect(store.error).toBe('Prompt not found');
});
```

**Optimistic Update Testing:**

```typescript
// Testing optimistic updates with rollback
it('should create prompt with optimistic update', async () => {
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: () => Promise.resolve({ ...newPrompt })
	});

	const input: CreatePromptInput = { title: 'New Prompt', content: 'Content' };

	await store.createPrompt(input);

	// Verify optimistic update
	expect(store.prompts).toHaveLength(1);
	expect(store.prompts[0].title).toBe('New Prompt');
});

it('should rollback on create failure', async () => {
	mockFetch.mockResolvedValueOnce({
		ok: false,
		status: 500,
		json: () => Promise.resolve({ error: { message: 'Failed to create' } })
	});

	await expect(store.createPrompt(input)).rejects.toThrow('Failed to create');

	// Verify rollback
	expect(store.prompts).toEqual([]);
});
```

**Helper Function Testing:**

```typescript
// Testing pure helper functions
describe('countWords', () => {
	function countWords(text: string): number {
		const trimmed = text.trim();
		if (!trimmed) return 0;
		return trimmed.split(/\s+/).filter((word) => word.length > 0).length;
	}

	it('should return 0 for empty string', () => {
		expect(countWords('')).toBe(0);
	});

	it('should count multiple words with multiple spaces', () => {
		expect(countWords('hello   world')).toBe(2);
	});

	it('should handle complex whitespace patterns', () => {
		expect(countWords('word1\n\nword2\t\tword3')).toBe(3);
	});
});
```

## E2E Test Configuration

**Playwright Config:**

```typescript
// playwright.config.ts
export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: 'line',
	outputDir: '/tmp/playwright-results',
	use: {
		baseURL: 'http://127.0.0.1:45678',
		trace: 'on-first-retry'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }
	],
	webServer: {
		command: 'bun run dev',
		url: 'http://127.0.0.1:45678',
		reuseExistingServer: true,
		timeout: 120000
	}
});
```

**Environment Variables:**

- `E2E_WEB_SERVER`: Control web server mode (`dev`, `preview`, `preview-node`)
- `E2E_WORKERS`: Number of parallel workers
- `E2E_OUTPUT_DIR`: Output directory for test artifacts

**Console Error Checking:**

```typescript
// Helper to check for console errors in E2E tests
function setupConsoleErrorCheck(page: any): () => Promise<void> {
	const errors: string[] = [];
	const errorHandler = (msg: any) => {
		if (msg.type() === 'error') {
			errors.push(msg.text());
		}
	};
	page.on('console', errorHandler);

	return async () => {
		page.off('console', errorHandler);
		const realErrors = errors.filter((e) => !e.includes('message port closed'));
		expect(realErrors).toHaveLength(0);
	};
}
```

## Test Setup

**Setup File:** `tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn(),
	setItem: vi.fn(),
	clear: vi.fn(),
	removeItem: vi.fn()
};
global.localStorage = localStorageMock as unknown as Storage;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	value: vi.fn().mockReturnValue({
		matches: false,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	}),
	writable: true
});

// Mock ws for libsql in tests
vi.mock('ws', () => ({
	WebSocket: class {},
	default: class {}
}));
```

**Vitest Config:**

```typescript
// vitest.config.ts
export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['tests/setup.ts'],
		globals: true,
		deps: {
			inline: ['ws', '@libsql/client', '@libsql/isomorphic-ws']
		}
	},
	resolve: {
		alias: [
			{ find: '$lib', replacement: resolve(__dirname, './src/lib') }
			// WebSocket mock aliases for libsql
		]
	}
});
```

## Skip Patterns

**Temporarily Skipping Tests:**

```typescript
// Skip individual test
test.skip('should display prompt library section', async ({ page }) => { ... });

// Skip entire describe block
test.describe.skip('Prompt Library Page Navigation', () => { ... });

// Skip with comment explaining why
test.skip('should show page header', async ({ page }) => {
	// TODO: Skip temporarily due to empty database
	// Will implement test data seeding after pagination feature
});
```

---

_Testing analysis: 2026-02-14_
