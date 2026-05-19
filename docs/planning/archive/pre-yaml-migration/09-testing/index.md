# 09 -- Testing Strategy

## Operational Testing Contract

| Work Type | Required Verification | Evidence | Timing |
|-----------|-----------------------|----------|--------|
| build | story-specific tests + acceptance evidence | assertion output, runtime/log/console | before verified |
| fix | regression proof + affected callsite check | assertion output + bug reproduction | before verified |
| research | hypothesis evidence | note, spike result | before downstream build ready |
| enable | tool/runtime smoke | command output | before dependent work starts |
| verify | acceptance/audit evidence | artifact links | before story status verified |
| release | package/install/rollback proof | release command output | before release_ready |

## Active Test Commands
```bash
# Unit tests (headless)
bun run test              # Vitest
bun run test:coverage     # Coverage report

# E2E tests (server required)
bun run test:e2e          # Chromium
bun run test:e2e:all      # All browsers

# Type checking
bun run check             # svelte-check + tsc
```

## Test File Discovery
- Unit: tests/unit/**/*.test.ts
- E2E: e2e/**/*.spec.ts
- Setup: tests/setup.ts

## Known Gaps
- 3 failing tests in judge.api.test.ts (ws module shim issue)
- 57 svelte-check warnings (pre-existing, not blocking)
- Coverage gap: instrumentation shim not tested
## Legacy Content: .planning/codebase/TESTING.md

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

## Legacy Content: docs/spec/SPEC-08-test-strategy.md

## TST-001 Test Layers

- Unit tests for services and resolution logic.
- Integration tests for API contracts + DB persistence.
- E2E tests for settings and prompt test UX.

## TST-002 Mapping To Acceptance Criteria

- AC-001, AC-002 -> integration + e2e.
- AC-003, AC-004 -> integration + e2e.
- AC-005, AC-006 -> unit + e2e.
- AC-007, AC-008 -> unit + integration.
- AC-009 -> integration.
- AC-010 -> e2e accessibility checks.
- AC-011 -> integration.
- AC-012 -> integration + e2e.

## TST-003 Unit Test Targets

- model resolution precedence and fallback.
- snippet rendering strict vs non-strict.
- OpenCode error mapping to app codes.

## TST-004 Integration Test Targets

- settings read/write persistence.
- settings key type validation and rejection.
- execute endpoint success/failure paths.
- council correct mode logging paths.

## TST-005 E2E Scenarios

- Admin changes settings and sees persisted values.
- User runs prompt with snippet preview and sees output.
- User sees clean error state when OpenCode down.
- User receives retry button only for retryable failures.

## TST-008 Contract Tests

- Validate API response schema keys for `POST /api/prompts/:id/execute`.
- Validate SSE event payload shape for `started/chunk/completed/failed`.
- Validate each settings key accepts only specified type/range from `SPEC-10-settings-schema.md`.

## TST-006 Test Data Rules

- Use deterministic fixtures for prompts/models.
- Keep one disallowed model fixture for policy tests.

## TST-007 Done Criteria For Test Suite

- All P1 AC IDs have at least one passing automated test.
- No flaky retries required for stable pass.

## Legacy Content: docs/spec/SPEC-15-docs-testing-execution-blueprint.md

## XBP-001 Purpose

Define a deterministic, portable workflow that generates and maintains `docs/testing/` so any future LLM session can plan/build with explicit testing responsibilities (`who`, `what`, `where`, `when`) and hard enforcement gates.

## XBP-002 Scope

In scope:

- command + agent + skill blueprint for test-workflow generation
- mandatory phase order (plan-before-analysis, analysis-before-implementation)
- greenfield, brownfield, and hybrid handling
- parallel subagent execution for large codebases
- anti-omission controls to prevent partial documentation
- output contracts for `docs/testing/*`

Out of scope:

- replacing project-specific business logic specs
- stack-specific test code implementation details per framework

## XBP-003 Canonical References

- Test strategy baseline: `SPEC-08-test-strategy.md` (`TST-*`)
- Delivery gates and sequencing: `SPEC-09-delivery-plan.md` (`DLV-*`, `STEP-*`)
- Settings and validation contracts: `SPEC-10-settings-schema.md` (`SET-*`)
- Error payload and retry semantics: `SPEC-11-error-catalog.md` (`ERR-*`)
- Variant-aware API contracts: `SPEC-14-ai-settings-contract-v1.md` (`AIC-*`)

## XBP-004 Non-Negotiable Principles

- No feature is complete without tests.
- No implementation changes before planning artifacts exist.
- No analysis execution before an analysis strategy and analysis todo exist.
- Every feature change requires both good and bad behavior coverage.
- Bug fixes require a regression test first.
- Documentation and test matrix updates are mandatory with behavior changes.

## XBP-005 Runtime Modes

| Mode         | Detection Signal                        | Primary Behavior                                                  |
| ------------ | --------------------------------------- | ----------------------------------------------------------------- |
| `greenfield` | No meaningful test/docs baseline exists | Create baseline `docs/testing/*` + enforcement model from scratch |
| `brownfield` | Existing test standards and tests exist | Assimilate + upgrade existing standards by default                |
| `hybrid`     | Partial/inconsistent standards          | Normalize baseline first, then upgrade                            |

Brownfield default policy:

- Default: `assimilate + upgrade`
- Exception: `replace` only when replacement is measurably faster or clearly lowers delivery risk.

## XBP-006 Mandatory Output Set

Required generated/maintained files under `docs/testing/`:

- `RUN_CONTEXT.md`
- `ANALYSIS_STRATEGY.md`
- `ANALYSIS_TODO.md`
- `ANALYSIS_UNIVERSE.md`
- `ANALYSIS_LOG.md`
- `ANALYSIS_DECISION_RECORD.md`
- `DEEP_DIVE_PLAN.md`
- `OMISSION_AUDIT_REPORT.md`
- `TEST_STRATEGY.md`
- `DEPENDENCY_TEST_MATRIX.md`
- `TRACEABILITY_MATRIX.md`
- `REGRESSION_GATE_CHECKLIST.md`
- `TEST_ENFORCEMENT_GUIDELINE.md`
- `IMPLEMENTATION_PLAN.md`
- `TODO.md`
- `GENERATION_REPORT.md`

## XBP-007 Mandatory Phase Order (Hard Gates)

| Phase                      | Required Artifact(s)                                                                        | Hard Gate                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| P0 Bootstrap               | `RUN_CONTEXT.md`                                                                            | no workflow execution without run context                     |
| P1 Plan Analysis Strategy  | `ANALYSIS_STRATEGY.md`                                                                      | no analysis before strategy exists                            |
| P2 Plan Analysis Tasks     | `ANALYSIS_TODO.md`                                                                          | no analysis before task list exists                           |
| P3 Classify Mode           | `ANALYSIS_DECISION_RECORD.md`                                                               | no deep-dive before mode decision exists                      |
| P4 Discovery Batch A       | `ANALYSIS_UNIVERSE.md`, `TEST_BASELINE_INVENTORY` (in log), `CI_TEST_PIPELINE_MAP` (in log) | no synthesis before universe coverage exists                  |
| P5 Plan Deep Dive          | `DEEP_DIVE_PLAN.md`                                                                         | no domain deep-dive before domain plan exists                 |
| P6 Discovery Batch B       | domain deep-dive records in `ANALYSIS_LOG.md`                                               | no omission audit before deep-dive completion                 |
| P7 Omission Audit          | `OMISSION_AUDIT_REPORT.md`                                                                  | no implementation planning if critical coverage is incomplete |
| P8 Synthesize Testing Docs | strategy/matrix/trace/checklist/guideline docs                                              | no build planning before synthesis                            |
| P9 Plan Implementation     | `IMPLEMENTATION_PLAN.md`                                                                    | no edits/tests before implementation plan                     |
| P10 Build Todo             | `TODO.md`                                                                                   | no edits/tests before build todo                              |
| P11 Apply Changes          | code/tests/docs edits                                                                       | only after P0..P10 pass                                       |
| P12 Validate + Close       | `GENERATION_REPORT.md`                                                                      | done only when gates and checks pass                          |

## XBP-008 Parallel Execution Graph

```text
N0 Preflight
 -> N1 Analysis Strategy Plan
 -> N2 Analysis Todo Plan
 -> N3 Mode Classifier
 -> [Parallel Batch A: N4 + N5 + N6]
 -> N7 Deep-Dive Planner
 -> [Parallel Batch B: N8a + N8b + N8c + N8d ...]
 -> N9 Omission Audit
 -> N10 Synthesis (docs/testing baseline)
 -> N11 Implementation Plan
 -> N12 Build Todo
 -> N13 Apply Changes
```

## XBP-009 Role Contract (Who / What / Where)

| Role                 | Responsibility                               | Required Output                                                                                                                            |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Command Orchestrator | entrypoint, sequencing, gate enforcement     | `RUN_CONTEXT.md`, phase progression                                                                                                        |
| Planner Agent        | strategy, task planning, implementation plan | `ANALYSIS_STRATEGY.md`, `ANALYSIS_TODO.md`, `IMPLEMENTATION_PLAN.md`, `TODO.md`                                                            |
| ContextScout (batch) | repository discovery and domain mapping      | `ANALYSIS_UNIVERSE.md`, deep-dive findings in `ANALYSIS_LOG.md`                                                                            |
| Omission Auditor     | coverage completeness verification           | `OMISSION_AUDIT_REPORT.md`                                                                                                                 |
| Synthesizer Agent    | compose final testing workflow docs          | `TEST_STRATEGY.md`, `DEPENDENCY_TEST_MATRIX.md`, `TRACEABILITY_MATRIX.md`, `REGRESSION_GATE_CHECKLIST.md`, `TEST_ENFORCEMENT_GUIDELINE.md` |
| Build/Test Executor  | apply agreed changes and validate            | updated tests/docs + verification output                                                                                                   |

## XBP-010 Command Contract

Command: `/test-workflow`

Recommended flags:

- `--mode auto|greenfield|brownfield|hybrid`
- `--scope <feature-or-domain>`
- `--feature <feature-name>`
- `--out docs/testing`
- `--plan-only`
- `--apply`
- `--strict`

Behavior:

- `--plan-only`: execute phases P0..P10 only.
- `--apply`: allowed only when P0..P10 artifacts exist and pass gates.
- `--strict`: fail when mandatory information is missing; do not produce partial final docs.

## XBP-011 Agent Contract

Primary agent: `test-workflow-orchestrator`

Mandatory behavior:

- ask maximum 3 targeted questions only when critical information is missing
- never skip phase order from `XBP-007`
- always produce concrete repo-specific outputs (no generic-only advice)
- always include good + bad behavior mapping in matrix output

## XBP-012 Skill Contract

Primary skill: `test-workflow-generator`

Skill responsibilities:

- provide templates and schemas for required docs
- enforce ID conventions and required columns
- enforce test minimums by feature type
- enforce gate checklist structure

Required conventions:

- Matrix IDs: `SET-<BLOCK>-NNN`
- Trace IDs: `TRACE-<DOMAIN>-NNN`
- Priorities: `P0`, `P1`, `P2`
- Status: `Planned`, `Partial`, `Covered`, `Blocked`

## XBP-013 Brownfield Decision Policy

Default:

- preserve working standards and upgrade incrementally

Allow `replace` only if one or more conditions hold:

- replacement effort is materially lower than upgrade effort
- existing baseline is structurally flaky/unreliable
- existing baseline blocks required new capabilities
- traceability debt is so high that remediation is riskier than replacement

Decision must be recorded in `ANALYSIS_DECISION_RECORD.md` with rationale and risk.

## XBP-014 Anti-Omission Controls (Large Codebases)

Mandatory controls:

- `ANALYSIS_UNIVERSE.md` must enumerate all relevant domains/paths.
- Every universe entry must be accounted with status: `covered`, `deferred`, or `excluded`.
- `OMISSION_AUDIT_REPORT.md` must list orphan/unmapped domains.
- Critical domain omission blocks progression beyond P7.

No domain may remain implicit or untracked.

## XBP-015 Context Management Controls

To reduce context pressure:

- use parallel subagents for bounded scopes
- enforce one domain per subagent output
- persist compact artifacts instead of large raw dumps
- synthesize from artifacts, not from repeated full-repo scans
- keep orchestrator state minimal and file-driven

## XBP-016 New-Chat Execution Protocol

When a new LLM session starts:

1. Read `docs/spec/SPEC-INDEX.md`.
2. Read `docs/spec/SPEC-15-docs-testing-execution-blueprint.md`.
3. If present, read existing `docs/testing/*` artifacts.
4. Run `/test-workflow --mode auto --out docs/testing --plan-only`.
5. Review and approve plan artifacts (P0..P10).
6. Run `/test-workflow --mode auto --out docs/testing --apply`.
7. Execute validation checks and update `GENERATION_REPORT.md`.

## XBP-017 docs/testing File Contracts

Minimum required sections:

- `TEST_STRATEGY.md`: scope, layers, priorities, DoD
- `DEPENDENCY_TEST_MATRIX.md`: IDs, dependencies, good/bad, layer, target file, status
- `TRACEABILITY_MATRIX.md`: rule/spec -> tests -> files
- `REGRESSION_GATE_CHECKLIST.md`: pre-impl, impl, CI, release gates
- `TEST_ENFORCEMENT_GUIDELINE.md`: mandatory enforcement and no-go rules

## XBP-018 Acceptance Criteria

Workflow is complete only when:

- all mandatory `docs/testing/*` artifacts exist
- hard gate sequence from `XBP-007` is respected
- matrix and traceability are synchronized
- good and bad behavior coverage exists for all scoped features
- implementation/test todo exists before any code/test modifications

## XBP-019 Portability Rules

To reproduce on another machine/project:

- copy this spec and command/agent/skill definitions
- preserve local context policy (`global` disabled where required)
- run in `--plan-only` first, then `--apply`
- keep outputs under `docs/testing/` for deterministic onboarding

## XBP-020 Backward Compatibility and Maintenance

- Keep existing test IDs stable when possible.
- Mark replaced IDs with explicit migration note in `TRACEABILITY_MATRIX.md`.
- Update this spec when gate order, role contracts, or output contracts change.

## XBP-021 Reference Implementation Paths

Local implementation files in this repository:

- Command entrypoint: `.opencode/command/test-workflow.md`
- Orchestrator agent: `.opencode/agents/test-workflow-orchestrator.md`
- Skill root: `.opencode/skills/test-workflow-generator/SKILL.md`
- Skill router: `.opencode/skills/test-workflow-generator/router.sh`
- Skill validator: `.opencode/skills/test-workflow-generator/scripts/validate-workflow.sh`
- Skill templates: `.opencode/skills/test-workflow-generator/templates/`
- Skill schemas: `.opencode/skills/test-workflow-generator/schemas/`

## Legacy Content: docs/plans/ai-settings-architecture/test/TEST_STRATEGY.md

# AI Settings Test Strategy

Last updated: 2026-02-25
Scope: `src/routes/settings/+page.server.ts`, AI settings admin UI, policy validators, provider/model catalog, function defaults, LLM council, improve presets.

## 1) Goal

Build a dependency-driven test strategy for the AI Settings page so new features can be added safely with explicit good/bad behavior coverage.

## 2) Working Method (How this plan is made)

1. Inventory the domain: connection flow, provider block, models block, AI policy, function defaults, council, catalog, presets.
2. Build dependency hierarchy (DAG) from root capabilities to derived capabilities.
3. Define test contracts per block: inputs, outputs, validation, side effects, errors.
4. Add good/bad behavior scenarios for each contract across test layers.
5. Prioritize with P0/P1/P2 and enforce CI gates.
6. Add regression rules so every new option/function must introduce tests + matrix entries.

## 3) Dependency Hierarchy (Execution Order)

1. Connection
2. Provider block (depends on Connection)
3. Models block (depends on Provider block)
4. AI policy block (depends on Models block)
5. Function defaults (derived from AI policy)
6. LLM council (derived from AI policy)
7. Model catalog (derived from Provider + Models)
8. Improve presets (depends on Policy + Catalog)

## 4) Test Layers

- Unit: pure logic and validators
- Integration/service: DB/service/API contract behavior
- Component: Svelte interactions and visual state transitions
- E2E: full settings workflow with realistic user behavior

## 5) Good vs Bad Behavior Baseline

- Good behavior: valid state, allowed model/variant, successful persist/load, accurate derived behavior, clear success feedback.
- Bad behavior: forbidden model/variant, missing required variant, stale/missing catalog data, API failures, invalid payload, race/conflict updates.

## 6) Prioritization

- P0: Policy-derived correctness and hard-fail variant enforcement.
- P1: UX consistency, error messaging quality, cache synchronization.
- P2: non-critical edge paths and visual refinements.

## 7) Definition of Done for New Features

Every new settings option/function must include:

1. Matrix update with new test IDs.
2. At least one good-path automated test.
3. At least one bad-path automated test.
4. Contract mapping update (spec/endpoint/validator affected).
5. Passing CI checks (`npm run check`, unit tests, and relevant e2e coverage).

## 8) Definition of Ready (Before writing tests)

Use this quick pre-check so an LLM (or developer) can start deterministically:

1. Feature scope is explicit (what changed, what is out of scope).
2. Dependency block is chosen (`Connection`, `Provider`, `Models`, `Policy`, `Defaults`, `Council`, `Catalog`, `Presets`).
3. Affected files are listed (route/service/validator/component).
4. Required behavior is split into Good and Bad paths.

## 9) Procedure: Add Tests for a New Feature (LLM-Executable)

Follow these steps in order for every new settings feature.

### Step 1 - Map the feature

- Classify the feature into one primary dependency block.
- Identify upstream dependencies that must already pass.
- Output: short scope note + block name.

### Step 2 - Register matrix rows first

- Add minimum 2 rows to `DEPENDENCY_TEST_MATRIX.md`:
  - one `Good` scenario
  - one `Bad` scenario
- Add route/service target, layer, priority, and status `Planned`.
- Output: new test IDs (example: `SET-PRESET-005`, `SET-PRESET-006`).

### Step 3 - Update traceability

- Update `CONTRACT_TRACEABILITY_MATRIX.md` with relevant spec/rule mapping.
- Link new test IDs and affected files.
- Output: trace row ID updated/added.

### Step 4 - Choose test layers by impact

- Unit for pure validation/derivation logic.
- Integration for API/service persistence and contracts.
- Component for UI state/interaction changes.
- E2E only when user flow meaningfully changes.
- Output: exact test files to edit/create.

### Step 5 - Implement tests in dependency order

- Always implement upstream first, then derived blocks.
- Prioritize P0 rows before P1/P2.
- For policy/variant features, assert stable codes like:
  - `MODEL_NOT_ALLOWED`
  - `VARIANT_REQUIRED`
  - `VARIANT_NOT_ALLOWED`
  - `VARIANT_NOT_AVAILABLE`
- Output: committed/working test code.

### Step 6 - Validate locally

- Run `npm run check`.
- Run `npm run test`.
- Run relevant e2e scope if flow changed.
- Output: passing results.

### Step 7 - Close planning artifacts

- In `DEPENDENCY_TEST_MATRIX.md`: set `Planned` -> `Covered` (or `Partial` if intentionally staged).
- In `CONTRACT_TRACEABILITY_MATRIX.md`: update status.
- Output: matrix + traceability fully in sync with code.

### Step 8 - PR evidence checklist

Include in PR description:

1. New/updated matrix test IDs.
2. Traceability row IDs.
3. Test file paths changed.
4. Good + Bad scenarios covered.

## 10) References

- `docs/spec/SPEC-08-test-strategy.md`
- `docs/spec/SPEC-14-ai-settings-contract-v1.md`
- `docs/spec/SPEC-09-delivery-plan.md`
- `docs/plans/ai-settings-architecture/ARCHITECTURE_ANALYSIS.md`
- `docs/plans/ai-settings-architecture/REFACTOR_BLUEPRINT_SOLID_DRY_SECURITY.md`

## Legacy Content: docs/plans/ai-settings-architecture/test/CONTRACT_TRACEABILITY_MATRIX.md

# AI Settings Contract Traceability Matrix

Last updated: 2026-02-25

## Purpose

Trace requirements and contract rules from spec IDs to executable test coverage.

## Columns

- Trace ID
- Spec ID / Rule
- Area
- Test IDs
- Test Layer
- Key Files
- Status

## Traceability Table

| Trace ID      | Spec / Rule                      | Area                | Test IDs                                                               | Layer                     | Key Files                                                                                                                                                                                                         | Status      |
| ------------- | -------------------------------- | ------------------- | ---------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| TRACE-AIC-005 | `AIC-005` endpoint matrix        | Settings APIs       | SET-FDEF-002, SET-COUNC-001, SET-PRESET-003                            | Integration               | `src/routes/api/admin/function-defaults/[type]/+server.ts`, `src/routes/api/admin/council-agents/+server.ts`, `src/routes/api/admin/council-agents/[id]/+server.ts`, `src/routes/api/admin/improve-presets/+server.ts`, `src/routes/api/admin/improve-presets/[id]/+server.ts` | In progress |
| TRACE-AIC-008 | Validation rules                 | Policy + validators | SET-POL-001, SET-POL-002, SET-POL-003, SET-POL-004                     | Unit/Integration          | `src/lib/server/services/admin-settings.service.ts`, `src/lib/server/validators/model-variant.validator.ts`, `src/lib/server/services/improve-presets.service.ts`                                                                                                              | In progress |
| TRACE-AIC-012 | Variant-aware contract tests     | Variant enforcement | SET-FDEF-003, SET-COUNC-002, SET-PRESET-004                            | Integration/E2E           | `src/lib/server/validators/model-variant.validator.ts`, `e2e/settings.spec.ts`, `e2e/admin-settings.spec.ts`                                                                                                                                                                   | Planned     |
| TRACE-TST-API | `TST-*` API contract obligations | Persist/load flows  | SET-PROV-001, SET-CAT-001, SET-FDEF-002, SET-COUNC-001, SET-PRESET-003 | Integration               | `tests/server/routes/opencode.providers.api.test.ts`, route tests to add for function defaults/council/presets                                                                                                                                                                 | In progress |
| TRACE-TST-NEG | Negative behavior coverage       | Error model         | SET-CONN-002, SET-PROV-002, SET-MOD-003, SET-CAT-003, SET-PRESET-004   | Integration/Component/E2E | `tests/server/routes/opencode.providers.api.test.ts`, `e2e/settings.spec.ts`, new validator/route negative tests                                                                                                                                                               | Planned     |

## Maintenance Rule

Whenever a new setting contract is added or changed:

1. Add/modify one trace row.
2. Link at least one good and one bad test ID.
3. Mark status only after automation exists.

## Legacy Content: docs/plans/ai-settings-architecture/test/DEPENDENCY_TEST_MATRIX.md

# AI Settings Dependency Test Matrix

Last updated: 2026-02-25

## Matrix Columns

- Test ID
- Block
- Depends On
- Scenario
- Behavior (Good/Bad)
- Layer
- Route/Service Under Test
- Existing Coverage
- Gap / Next Test
- Priority
- Status

## Dependency-Driven Coverage Matrix

| Test ID        | Block             | Depends On        | Scenario                                                       | Behavior | Layer       | Route/Service Under Test                                                                                  | Existing Coverage                                                       | Gap / Next Test                                                                      | Priority | Status  |
| -------------- | ----------------- | ----------------- | -------------------------------------------------------------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- | ------- |
| SET-CONN-001   | Connection        | -                 | OpenCode connection health check succeeds                      | Good     | Integration | `src/routes/api/admin/opencode-connection/+server.ts`                                                     | `e2e/smoke-opencode.spec.ts`                                            | Add dedicated route test for GET success payload shape                               | P0       | Partial |
| SET-CONN-002   | Connection        | -                 | OpenCode connection check fails/timeout                        | Bad      | Integration | `src/routes/api/admin/opencode-connection/+server.ts`                                                     | `e2e/smoke-opencode.spec.ts`                                            | Add route test for error mapping + status code                                       | P0       | Planned |
| SET-PROV-001   | Provider block    | Connection        | Providers endpoint returns provider list + cache metadata      | Good     | Integration | `src/routes/api/opencode/providers/+server.ts`                                                            | `tests/server/routes/opencode.providers.api.test.ts`                    | Keep passing in CI gate                                                              | P0       | Covered |
| SET-PROV-002   | Provider block    | Connection        | Providers endpoint failure returns deterministic error payload | Bad      | Integration | `src/routes/api/opencode/providers/+server.ts`                                                            | `tests/server/routes/opencode.providers.api.test.ts` (503 path)         | Add assertion for stable error code contract                                         | P0       | Partial |
| SET-PROV-003   | Provider block    | Connection        | Admin AI settings renders provider cards and counts            | Good     | E2E         | `/settings` UI + provider catalog panel                                                                   | `e2e/settings.spec.ts`                                                  | Add assertion for provider status badges/details                                     | P1       | Partial |
| SET-MOD-001    | Models block      | Provider block    | Model picker lists selectable models                           | Good     | E2E         | `/settings` model picker modal                                                                            | `e2e/settings.spec.ts`                                                  | Keep passing in CI gate                                                              | P0       | Covered |
| SET-MOD-002    | Models block      | Provider block    | Model picker search filters model list                         | Good     | E2E         | `/settings` model picker modal search                                                                     | `e2e/settings.spec.ts`                                                  | Add exact expected filtered result assertion                                         | P1       | Partial |
| SET-MOD-003    | Models block      | Provider block    | Invalid/inactive model payload is ignored without UI crash     | Bad      | Integration | `src/lib/server/services/opencode.service.ts` + `/api/opencode/providers`                                 | `tests/server/routes/opencode.providers.api.test.ts` (structure checks) | Add service-level sanitization test for inactive/malformed models                    | P0       | Planned |
| SET-POL-001    | AI policy         | Models block      | `getOpenCodePolicy` parses allowlist and defaults correctly    | Good     | Unit        | `src/lib/server/services/admin-settings.service.ts`                                                       | `tests/server/services/admin-settings.service.test.ts`                  | Keep passing in CI gate                                                              | P0       | Covered |
| SET-POL-002    | AI policy         | Models block      | Disallowed model rejected by policy validation                 | Bad      | Unit        | `src/lib/server/services/admin-settings.service.ts` + `isModelAllowed`                                    | `tests/server/services/admin-settings.service.test.ts`                  | Add explicit mapping to `MODEL_NOT_ALLOWED` in validator tests                       | P0       | Partial |
| SET-POL-003    | AI policy         | Models block      | Variant required when policy defines variants                  | Bad      | Unit        | `src/lib/server/validators/model-variant.validator.ts`                                                    | (no direct dedicated test file yet)                                     | Add `tests/server/validators/model-variant.validator.test.ts` for `VARIANT_REQUIRED` | P0       | Planned |
| SET-POL-004    | AI policy         | Models block      | Variant not allowed for scope returns strict error             | Bad      | Unit        | `src/lib/server/validators/model-variant.validator.ts`                                                    | (no direct dedicated test file yet)                                     | Add tests for `VARIANT_NOT_ALLOWED` and `VARIANT_NOT_AVAILABLE`                      | P0       | Planned |
| SET-FDEF-001   | Function defaults | AI policy         | Function defaults page renders executor/judge/improve cards    | Good     | E2E         | `/settings` function defaults UI                                                                          | `e2e/settings.spec.ts`                                                  | Keep passing in CI gate                                                              | P0       | Covered |
| SET-FDEF-002   | Function defaults | AI policy         | Save function defaults with allowed model/variant              | Good     | Integration | `src/routes/api/admin/function-defaults/[type]/+server.ts`                                                | indirect via `e2e/settings.spec.ts`                                     | Add direct route tests for PUT success with `modelVariant`                           | P0       | Planned |
| SET-FDEF-003   | Function defaults | AI policy         | Save disallowed model/variant is rejected                      | Bad      | Integration | `src/routes/api/admin/function-defaults/[type]/+server.ts`                                                | none                                                                    | Add route tests for `MODEL_NOT_ALLOWED`/`VARIANT_NOT_ALLOWED`                        | P0       | Planned |
| SET-COUNC-001  | LLM council       | AI policy         | Create/update council agent with allowed model/variant         | Good     | Integration | `src/routes/api/admin/council-agents/+server.ts`, `src/routes/api/admin/council-agents/[id]/+server.ts`   | none                                                                    | Add POST/PUT route tests for valid persist path                                      | P0       | Planned |
| SET-COUNC-002  | LLM council       | AI policy         | Council update with forbidden model/variant is rejected        | Bad      | Integration | `src/routes/api/admin/council-agents/[id]/+server.ts`                                                     | none                                                                    | Add route tests validating strict variant errors                                     | P0       | Planned |
| SET-CAT-001    | Model catalog     | Provider + Models | Catalog endpoint returns stable provider/model structure       | Good     | Integration | `src/routes/api/opencode/providers/+server.ts`                                                            | `tests/server/routes/opencode.providers.api.test.ts`                    | Keep passing in CI gate                                                              | P1       | Covered |
| SET-CAT-002    | Model catalog     | Provider + Models | Refresh=true bypasses cache and returns fresh catalog          | Good     | Integration | `src/routes/api/opencode/providers/+server.ts`                                                            | `tests/server/routes/opencode.providers.api.test.ts`                    | Keep passing in CI gate                                                              | P1       | Covered |
| SET-CAT-003    | Model catalog     | Provider + Models | Cache mismatch/stale catalog does not break settings UI        | Bad      | E2E         | `/settings` catalog + model picker                                                                        | `e2e/settings.spec.ts` (basic catalog visibility)                       | Add stale-cache simulation test path                                                 | P1       | Planned |
| SET-PRESET-001 | Improve presets   | Policy + Catalog  | Preset validation accepts allowed model and bounds             | Good     | Unit        | `src/lib/server/services/improve-presets.service.ts`                                                      | `tests/server/services/improve-presets.service.test.ts`                 | Keep passing in CI gate                                                              | P0       | Covered |
| SET-PRESET-002 | Improve presets   | Policy + Catalog  | Preset validation rejects disallowed model                     | Bad      | Unit        | `src/lib/server/services/improve-presets.service.ts`                                                      | `tests/server/services/improve-presets.service.test.ts`                 | Add explicit `modelVariant` validation assertions                                    | P0       | Partial |
| SET-PRESET-003 | Improve presets   | Policy + Catalog  | Improve presets API create/update handles `modelVariant`       | Good     | Integration | `src/routes/api/admin/improve-presets/+server.ts`, `src/routes/api/admin/improve-presets/[id]/+server.ts` | none                                                                    | Add route tests for POST/PUT with `modelVariant`                                     | P0       | Planned |
| SET-PRESET-004 | Improve presets   | Policy + Catalog  | Improve presets API rejects invalid `modelVariant` payload     | Bad      | Integration | `src/routes/api/admin/improve-presets/+server.ts`, `src/routes/api/admin/improve-presets/[id]/+server.ts` | none                                                                    | Add route tests asserting validation error payload                                   | P0       | Planned |

## Build Order for New Test Implementation

1. P0 validator/policy tests (`SET-POL-003`, `SET-POL-004`).
2. P0 function-defaults + council route tests (`SET-FDEF-002`, `SET-FDEF-003`, `SET-COUNC-001`, `SET-COUNC-002`).
3. P0 improve-presets API route tests (`SET-PRESET-003`, `SET-PRESET-004`).
4. P0/P1 connection/provider contract hardening (`SET-CONN-001`, `SET-CONN-002`, `SET-PROV-002`).
5. P1 catalog/model resilience tests (`SET-MOD-003`, `SET-CAT-003`).

## Expansion Rule

For every new settings capability:

1. Add at least one Good and one Bad row.
2. Map each row to route/service and test file.
3. Mark status as `Covered` only after CI-automated test exists.

## Legacy Content: docs/plans/ai-settings-architecture/test/REGRESSION_GATE_CHECKLIST.md

# AI Settings Regression Gate Checklist

Last updated: 2026-02-25

## 1) Pre-Implementation Gate

- [ ] Requirement mapped to dependency block (`Connection`, `Provider`, `Models`, `Policy`, `Defaults`, `Council`, `Catalog`, `Presets`).
- [ ] `DEPENDENCY_TEST_MATRIX.md` updated with at least 1 good + 1 bad row.
- [ ] `CONTRACT_TRACEABILITY_MATRIX.md` updated for changed specs/contracts.
- [ ] `TEST_STRATEGY.md` section "Procedure: Add Tests for a New Feature (LLM-Executable)" executed.
- [ ] Evidence prepared: test IDs, trace row, and target test file paths.

## 2) Implementation Gate

- [ ] Unit tests added/updated for changed validation/derivation logic.
- [ ] Integration tests added/updated for API/service persistence behavior.
- [ ] Component tests added/updated for UI state + error rendering.
- [ ] E2E updated for critical workflow if user flow changed.

## 3) Variant Enforcement Gate

- [ ] `MODEL_NOT_ALLOWED` tested where relevant.
- [ ] `VARIANT_REQUIRED` tested where relevant.
- [ ] `VARIANT_NOT_ALLOWED` tested where relevant.
- [ ] `VARIANT_NOT_AVAILABLE` tested where relevant.

## 4) CI Gate

- [ ] `npm run check` passes.
- [ ] `npm run test` passes.
- [ ] Relevant e2e scope passes (at least changed user flow).

## 5) Release Gate

- [ ] No unresolved P0 rows in `DEPENDENCY_TEST_MATRIX.md` for modified blocks.
- [ ] Failure catalog mappings still valid.
- [ ] Docs updated for any behavior change.

## 6) Rule for Future Features

No new settings option/function is complete unless all gates above pass and matrix entries are present.

## Legacy Content: docs/plans/ai-settings-architecture/test/VARIANT_FAILURE_CATALOG.md

# AI Settings Variant Failure Catalog

Last updated: 2026-02-25

## Purpose

Central list of expected failure behavior for model/variant enforcement.

## Error Catalog

| Failure ID | Error Code               | Trigger                                                 | Expected Behavior                                      |
| ---------- | ------------------------ | ------------------------------------------------------- | ------------------------------------------------------ |
| VF-001     | `MODEL_NOT_ALLOWED`      | Selected model not in allowlist                         | Reject save/update with deterministic validation error |
| VF-002     | `VARIANT_REQUIRED`       | Model has policy-bound variants but no variant selected | Reject save/update; return required-variant guidance   |
| VF-003     | `VARIANT_NOT_ALLOWED`    | Chosen variant not allowed for selected model/scope     | Reject save/update; preserve previous valid config     |
| VF-004     | `VARIANT_NOT_AVAILABLE`  | Variant not present in current catalog for that model   | Reject save/update and prompt catalog refresh action   |
| VF-005     | `MODEL_NOT_FOUND`        | Model missing from provider/model graph                 | Reject and report model resolution failure             |
| VF-006     | `PROVIDER_NOT_CONNECTED` | Provider unavailable while validating model/variant     | Reject or block action based on policy strictness      |

## Required Assertions Per Failure

1. API status code and error payload shape.
2. Stable error code (`code`) and message (`message`) semantics.
3. No unintended persistence of invalid state.
4. UI error feedback renders and is user-actionable.
5. Retry path behaves deterministically after correction.

## Test Coverage Mapping

- Function defaults: `SET-FDEF-002`
- LLM council: `SET-COUNC-002`
- Presets: `SET-PRESET-002`
- Policy validators: `SET-POL-002`, `SET-POL-003`
