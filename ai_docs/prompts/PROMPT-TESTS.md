# Complete Testing Context - Project-Agnostic Framework

**Purpose**: Comprehensive testing strategy for any software project
**Last Updated**: 2026-02-09
**Version**: 4.0 - Project-agnostic with CLI support and coverage analysis

---

## 🎯 Purpose

This document provides a complete testing framework for building, validating, and maintaining reliable software systems. It covers:

- **Test Setup Detection** - Auto-detect project testing configuration
- **Unit Testing** - Business logic, services, validation
- **E2E Testing** - Complete user workflows in real browser
- **Test Coverage Gaps Analysis** - Identify missing tests
- **Token-Efficient Testing** - Playwright CLI for constrained contexts
- **Console Monitoring** - Real browser error detection

**Designed for**: Any software project (web apps, APIs, CLI tools, libraries)

---

## 🔍 Test Setup Detection

### Auto-Detect Project Configuration

Before writing tests, detect the project's testing setup:

```bash
# Find test configuration files
find . -name "vitest.config.*" -o -name "jest.config.*" -o -name "playwright.config.*" 2>/dev/null

# Check package.json for test scripts
cat package.json | grep -A 20 '"scripts"' | grep test

# Find test directories
find . -type d -name "tests" -o -name "e2e" -o -name "__tests__" -o -name "spec" 2>/dev/null
```

### Common Test Frameworks

| Framework  | Config File            | Test Dir     | Command                     |
| ---------- | ---------------------- | ------------ | --------------------------- |
| Vitest     | `vitest.config.ts`     | `tests/`     | `bun run test` / `npm test` |
| Jest       | `jest.config.js`       | `__tests__/` | `npm test`                  |
| Playwright | `playwright.config.ts` | `e2e/`       | `npx playwright test`       |
| Pytest     | `pytest.ini`           | `tests/`     | `pytest`                    |
| Go         | `_test.go`             | `*_test.go`  | `go test ./...`             |

### Docker Test Utility (If Available)

Check for Docker-based testing:

```bash
# Look for test scripts
ls scripts/run-tests*.sh scripts/docker-test*.sh 2>/dev/null

# Check for docker-compose test files
ls docker-compose.*test*.yml docker-compose.*playwright*.yml 2>/dev/null
```

If Docker utility exists, ALWAYS use it for running tests.

---

## 📊 Test Coverage Gaps Analysis

### Purpose

Identify missing tests and prioritize test coverage improvements.

### Step-by-Step Analysis

#### 1. Run Coverage Report

```bash
# JavaScript/TypeScript
bun run test:coverage
# or
npm run test:coverage

# Python
pytest --cov=src --cov-report=term-missing

# Go
go test -cover ./...
```

#### 2. Map Source vs Tests

Compare source files with test files:

| Source Location         | Test Location         | Pattern     |
| ----------------------- | --------------------- | ----------- |
| `src/**/*.ts`           | `tests/**/*.test.ts`  | `*.test.ts` |
| `src/routes/**`         | `e2e/**/*.spec.ts`    | `*.spec.ts` |
| `src/lib/components/**` | `tests/components/**` | `*.test.ts` |

#### 3. Identify Gaps

```bash
# Find source files without tests (TypeScript)
find src -name "*.ts" -not -path "*.d.ts" | while read f; do
  testfile="tests/${f%.ts}.test.ts"
  if [ ! -f "$testfile" ]; then
    echo "Missing test: $testfile for $f"
  fi
done

# Find routes without E2E tests
find src/routes -name "+page.svelte" | while read f; do
  route=$(echo $f | sed 's|src/routes||' | sed 's|/+page.svelte||')
  echo "Route: $route"
done
```

#### 4. Categorize Gaps by Priority

| Priority        | Coverage | Criteria                            | Action          |
| --------------- | -------- | ----------------------------------- | --------------- |
| **P0 Critical** | < 50%    | Core business logic, auth, payments | Immediate fix   |
| **P1 High**     | 50-70%   | Important features, API endpoints   | Plan for sprint |
| **P2 Medium**   | 70-80%   | Nice-to-have, edge cases            | Backlog         |
| **P3 Low**      | > 80%    | Minor utilities                     | Optional        |

#### 5. Output Format

Generate a coverage gaps report:

```markdown
## Test Coverage Gaps Analysis

### Overall Coverage: X%

### Critical Gaps (< 50%)

| File                          | Coverage | Missing Tests                  |
| ----------------------------- | -------- | ------------------------------ |
| `src/lib/server/auth/jwt.ts`  | 38%      | Token refresh, expiry handling |
| `src/lib/server/db/schema.ts` | 0%       | Schema validation, constraints |

### Medium Gaps (50-70%)

| File                               | Coverage | Missing Tests              |
| ---------------------------------- | -------- | -------------------------- |
| `src/lib/services/user.service.ts` | 62%      | Error handling, edge cases |

### E2E Coverage Gaps

| Route        | E2E Test            | Status      |
| ------------ | ------------------- | ----------- |
| `/login`     | -                   | ❌ Missing  |
| `/admin`     | `admin.spec.ts`     | ⚠️ Partial  |
| `/dashboard` | `dashboard.spec.ts` | ✅ Complete |

### API Endpoints Without Tests

| Endpoint               | Unit Test | E2E Test |
| ---------------------- | --------- | -------- |
| `POST /api/auth/login` | ✅        | ❌       |
| `GET /api/users`       | ❌        | ❌       |

### Priority Actions

| Priority | Action                      | Effort |
| -------- | --------------------------- | ------ |
| P0       | Add JWT token refresh tests | 2h     |
| P1       | Add login E2E test          | 1h     |
| P2       | Add user service edge cases | 3h     |
```

---

## 🚀 Token-Efficient Testing: Playwright CLI vs MCP

### When to Use Which

| Scenario                      | Use            | Why                            |
| ----------------------------- | -------------- | ------------------------------ |
| **Full test suite runs**      | Playwright MCP | Parallel execution, configured |
| **Quick validation**          | Playwright CLI | Token-efficient, fast          |
| **Complex multi-step flows**  | Playwright MCP | Persistent state               |
| **Debugging in CI**           | Playwright CLI | Concise output                 |
| **Test generation**           | Playwright CLI | Records to test code           |
| **Token-constrained context** | Playwright CLI | 90% token savings              |

### Token Comparison

| Approach    | Tokens/Interaction | Components                                                          |
| ----------- | ------------------ | ------------------------------------------------------------------- |
| **MCP**     | ~6000              | Tool schemas (~2000) + Accessibility tree (~3000) + Results (~1000) |
| **CLI**     | ~700               | Snapshot (~500) + Commands (~200)                                   |
| **Savings** | **~90%**           | CLI is significantly more efficient                                 |

### Playwright CLI Setup

```bash
# Install
npm install -g @playwright/cli@latest
playwright-cli install --skills

# Or with bun
bun add -g @playwright/cli
```

### Playwright CLI Commands

```bash
# Basic navigation
playwright-cli open https://example.com
playwright-cli goto https://example.com/page

# Get page snapshot (returns element refs: e1, e2, e3...)
playwright-cli snapshot

# Interact with elements
playwright-cli click e5
playwright-cli fill e10 "user@example.com"
playwright-cli type e11 "password"
playwright-cli press Enter

# Screenshots
playwright-cli screenshot output.png
playwright-cli screenshot --full-page full.png

# Evaluate JavaScript
playwright-cli eval "document.title"
playwright-cli eval "localStorage.getItem('token')"
```

### Sessions (Persistent State)

```bash
# Named session - persists across commands
playwright-cli -s=login open https://app.com/login
playwright-cli -s=login fill e1 "user@example.com"
playwright-cli -s=login click e2
playwright-cli -s=login snapshot  # Still in same session

# Load saved auth state
playwright-cli --storage-state=auth.json open https://app.com/dashboard
```

### Advanced Features

```bash
# Record trace for debugging
playwright-cli --trace on open https://example.com

# Record video
playwright-cli --video on open https://example.com

# Mock API responses
playwright-cli --mock "**/api/*" response.json open https://example.com

# Headless mode
playwright-cli --headless open https://example.com

# Specific browser
playwright-cli --browser=firefox open https://example.com
```

### CLI Workflow Example

```bash
# Quick smoke test - login flow
playwright-cli -s=smoke open http://localhost:5173
playwright-cli -s=smoke snapshot
# Output: [e1] button "Login"
#         [e2] textbox "Email"
#         [e3] textbox "Password"

playwright-cli -s=smoke fill e2 "admin@example.com"
playwright-cli -s=smoke fill e3 "password123"
playwright-cli -s=smoke click e1
playwright-cli -s=smoke snapshot
# Verify logged in state

playwright-cli -s=smoke screenshot login-success.png
```

### When to Switch

**Use Playwright CLI when:**

- ✅ Quick validation of a single flow
- ✅ Generating test code from interactions
- ✅ Debugging in token-constrained environment
- ✅ CI/CD with limited context
- ✅ Exploratory testing

**Keep using Playwright MCP when:**

- ✅ Running full test suite
- ✅ Complex multi-page workflows
- ✅ Need persistent browser state across many commands
- ✅ Parallel test execution required
- ✅ Already configured in project

---

## 🎯 Test Categories

### 1. Unit Tests

**Purpose**: Test business logic, services, stores, validation in isolation

**Location**: `tests/`, `__tests__/`, `*_test.go`, `test_*.py`

**Structure**:

```
tests/
├── server/
│   ├── auth/
│   │   └── jwt.test.ts              # JWT generation, verification
│   ├── services/
│   │   ├── user.service.test.ts
│   │   └── api.service.test.ts
│   └── utils/
│       └── validation.test.ts
├── stores/
│   └── auth.store.test.ts
└── validators/
    └── input.test.ts
```

### 2. E2E Tests

**Purpose**: Test complete user workflows in real browser

**Location**: `e2e/`, `tests/e2e/`, `cypress/e2e/`

**Structure**:

```
e2e/
├── auth/
│   ├── login.spec.ts                # Login/logout flows
│   └── session.spec.ts              # Session management
├── workflows/
│   ├── checkout.spec.ts             # Complete purchase flow
│   └── onboarding.spec.ts
├── pages/
│   ├── dashboard.spec.ts
│   └── settings.spec.ts
└── api/
    └── endpoints.spec.ts            # API integration tests
```

### 3. Console Monitoring Tests

**Purpose**: Detect runtime JavaScript errors in real browser

**Location**: Within E2E tests

```typescript
// Mandatory pattern for E2E tests
test.describe('Feature with Console Monitoring', () => {
	const consoleErrors: string[] = [];

	test.beforeEach(async ({ page }) => {
		consoleErrors.length = 0;
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			}
		});
	});

	test.afterEach(async () => {
		// Filter known harmless errors
		const realErrors = consoleErrors.filter(
			(e) => !e.includes('message port closed') && !e.includes('ResizeObserver')
		);
		expect(realErrors).toHaveLength(0);
	});

	test('should work without console errors', async ({ page }) => {
		await page.goto('/feature');
		// ... test actions
	});
});
```

---

## 🔧 Required Test Patterns

### AAA Pattern (Unit Tests)

```typescript
test('should [action] when [condition]', async () => {
	// Arrange - Setup test data and dependencies
	const payload = { userId: '123', role: 'admin' };

	// Act - Perform action being tested
	const token = generateToken(payload);

	// Assert - Verify the expected outcome
	expect(token).toBeTruthy();
	expect(verifyToken(token)).toEqual(payload);
});
```

### Test Naming Convention

```
test('should [action] when [condition]', async () => { ... })
```

**Examples**:

- `should redirect to login when accessing admin without auth`
- `should show error toast when save fails`
- `should persist theme preference in localStorage`
- `should return 401 when token expired`

### Visual Validation (Required)

After tests pass, ALWAYS validate:

- [ ] App logs (terminal)
- [ ] Browser console (DevTools → Console)
- [ ] Visual appearance (check for layout issues)
- [ ] Functionality (basic interactions work)

---

## 📋 Test Execution Commands

### JavaScript/TypeScript

```bash
# Unit tests
bun run test
npm test

# With coverage
bun run test:coverage
npm run test:coverage

# E2E tests
bun run test:e2e
npx playwright test

# Specific test file
bun run test path/to/test.test.ts
npx playwright test e2e/login.spec.ts

# Headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug
```

### Python

```bash
# Unit tests
pytest

# With coverage
pytest --cov=src --cov-report=html

# Specific test
pytest tests/test_auth.py

# Verbose
pytest -v
```

### Go

```bash
# All tests
go test ./...

# With coverage
go test -cover ./...

# Specific package
go test ./pkg/auth

# Verbose
go test -v ./...
```

---

## 🎯 Quality Gates

### Before Commit (MANDATORY)

1. ✅ All unit tests pass
2. ✅ All E2E tests pass
3. ✅ No console errors in real browser
4. ✅ Visual validation complete
5. ✅ Tests document behavior, not implementation
6. ✅ Coverage meets threshold (80%+ for new code)

### Test Coverage Standards

| Type           | Coverage            | Validation           |
| -------------- | ------------------- | -------------------- |
| Unit Tests     | 80%+                | Code coverage tools  |
| E2E Tests      | 100% critical paths | Manual review        |
| Console Errors | Zero tolerance      | Automated monitoring |

---

## 🔍 Common Issues & Solutions

### Flaky Tests

**Problem**: Tests fail intermittently
**Solution**: Fix immediately, zero tolerance

```typescript
// Add retry logic
await expect(page.getByRole('button')).toBeVisible({ timeout: 10000 });

// Wait for specific condition
await expect(async () => {
	const count = await page.locator('.item').count();
	expect(count).toBe(5);
}).toPass({ timeout: 10000 });
```

### Console Errors

**Problem**: Runtime JS errors in browser
**Solution**: Monitor and fix immediately

```typescript
const errors: string[] = [];
page.on('console', (msg) => {
	if (msg.type() === 'error') errors.push(msg.text());
});
// Assert no errors after test
expect(errors.filter((e) => !isHarmless(e))).toHaveLength(0);
```

### Network Issues

**Problem**: API calls timeout or fail
**Solution**: Wait for networkidle

```typescript
await page.goto('/');
await page.waitForLoadState('networkidle');

// Or wait for specific response
await page.waitForResponse((resp) => resp.url().includes('/api/data') && resp.status() === 200);
```

### Test Data Conflicts

**Problem**: Tests interfere with each other
**Solution**: Use unique test data

```typescript
// Generate unique IDs
const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const uniqueEmail = `user-${testId}@example.com`;
```

---

## 📖 Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ❌ Don't - Testing implementation details
test('should call authService.login', () => {
	const spy = vi.spyOn(authService, 'login');
	// ...
});

// ✅ Do - Testing user-facing behavior
test('should redirect to dashboard after login', async () => {
	await page.goto('/login');
	await page.fill('[name="email"]', 'test@example.com');
	await page.fill('[name="password"]', 'password123');
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL('/dashboard');
});
```

### 2. Keep Tests Independent

```typescript
// Each test should work in isolation
test.beforeEach(async ({ page }) => {
	// Reset state before each test
	await page.evaluate(() => localStorage.clear());
	await page.goto('/');
});
```

### 3. Use Meaningful Assertions

```typescript
// ❌ Don't - Vague assertions
expect(result).toBeTruthy();
expect(response).toBeDefined();

// ✅ Do - Specific assertions
expect(result.user.role).toBe('admin');
expect(response.status).toBe(201);
expect(response.body.token).toHaveLength(256);
```

### 4. Handle Async Properly

```typescript
// Wait for elements
await expect(page.getByRole('button')).toBeVisible();

// Wait for network
await page.waitForLoadState('networkidle');

// Wait for condition
await expect(async () => {
	const text = await page.locator('.status').textContent();
	expect(text).toBe('Complete');
}).toPass();
```

---

## 🔒 Security Testing

### Authentication & Authorization

```typescript
test('should redirect unauthenticated users', async () => {
	await page.goto('/admin/settings');
	await expect(page).toHaveURL('/login');
});

test('should return 403 for unauthorized access', async () => {
	const response = await page.request.post('/api/admin/settings', {
		data: { key: 'value' }
	});
	expect(response.status()).toBe(403);
});
```

### Input Validation

```typescript
test('should prevent XSS in inputs', async () => {
	await page.goto('/form');
	await page.fill('[name="title"]', '<script>alert("xss")</script>');
	await page.click('button[type="submit"]');

	const content = await page.content();
	expect(content).not.toContain('<script>alert');
});
```

### SQL Injection

```typescript
test('should prevent SQL injection', async () => {
	const response = await page.request.get('/api/users?id=1; DROP TABLE users');
	expect(response.status()).toBe(400);
});
```

---

## 📈 Performance Testing

### Load Time Benchmarks

```typescript
test('should load within performance budget', async ({ page }) => {
	const start = Date.now();
	await page.goto('/');
	await page.waitForLoadState('networkidle');
	const loadTime = Date.now() - start;

	expect(loadTime).toBeLessThan(3000); // 3s budget
});
```

### Core Web Vitals

```typescript
test('should meet Core Web Vitals', async ({ page }) => {
	await page.goto('/');

	// LCP (Largest Contentful Paint)
	const lcp = await page.evaluate(() => {
		return new Promise((resolve) => {
			new PerformanceObserver((list) => {
				resolve(list.getEntries().pop()?.startTime);
			}).observe({ type: 'largest-contentful-paint' });
		});
	});

	expect(lcp).toBeLessThan(2500); // 2.5s budget
});
```

---

## 🐛 Debugging Failed Tests

### 1. Verbose Output

```bash
# Playwright
npx playwright test --reporter=verbose

# Vitest
bun run test --reporter=verbose

# Pytest
pytest -v -s
```

### 2. Playwright Trace

```bash
# Traces are captured on failure
# View at: playwright-report/index.html
npx playwright show-report
```

### 3. Debug Mode

```bash
# Step through test
npx playwright test --debug

# Or with UI
npx playwright test --ui
```

### 4. Console Logging

```typescript
test('debug test', async ({ page }) => {
	page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text()));
	page.on('pageerror', (err) => console.log('Page Error:', err));
	// ...
});
```

---

## 🚀 Continuous Integration

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true
```

### GitLab CI

```yaml
test:
  image: node:20
  script:
    - npm ci
    - npm test
    - npx playwright test
  artifacts:
    when: always
    paths:
      - playwright-report/
```

---

## ✅ Final Checklist

Before considering testing complete:

- [ ] All unit tests pass with 80%+ coverage
- [ ] All E2E tests pass in real browser
- [ ] Console errors are monitored and zero
- [ ] Tests use AAA pattern
- [ ] Test names are descriptive (should/when/condition)
- [ ] No flaky tests
- [ ] Visual validation performed
- [ ] CI/CD pipeline passes
- [ ] Security tests included
- [ ] Performance benchmarks met
- [ ] Coverage gaps identified and prioritized

---

## 📚 Quick Reference

### Test Commands by Framework

| Framework  | Unit            | E2E                   | Coverage                 |
| ---------- | --------------- | --------------------- | ------------------------ |
| Vitest     | `bun run test`  | -                     | `bun run test:coverage`  |
| Jest       | `npm test`      | -                     | `npm test -- --coverage` |
| Playwright | -               | `npx playwright test` | -                        |
| Pytest     | `pytest`        | -                     | `pytest --cov`           |
| Go         | `go test ./...` | -                     | `go test -cover`         |

### Playwright CLI Quick Reference

| Command                             | Purpose           |
| ----------------------------------- | ----------------- |
| `playwright-cli open <url>`         | Open browser      |
| `playwright-cli snapshot`           | Get element refs  |
| `playwright-cli click e1`           | Click element     |
| `playwright-cli fill e1 "text"`     | Fill input        |
| `playwright-cli screenshot out.png` | Take screenshot   |
| `playwright-cli -s=name`            | Use named session |

---

**Remember**: Tests are not just for catching bugs—they're for documenting behavior and enabling confident changes.

**Quality over quantity** - Better to have 10 excellent tests than 100 mediocre ones.

**Token efficiency matters** - Use Playwright CLI when context is constrained.
