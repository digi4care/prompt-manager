# Codebase Concerns

**Analysis Date:** 2026-02-14

## Tech Debt

**Hardcoded JWT Secret:**

- Issue: Default secret in code allows authentication bypass if `JWT_SECRET` env var is not set
- Files: `src/lib/server/auth/jwt.ts` (line 4)
- Impact: Critical security vulnerability in production deployments without explicit secret
- Fix approach: Remove default, throw error if `JWT_SECRET` is missing in production

**Placeholder Functions Not Implemented:**

- Issue: `improvePrompt` and `judgePrompt` functions throw "not implemented" errors
- Files: `src/lib/server/services/opencode.service.ts` (lines 254, 262, 471, 474)
- Impact: Core AI features unavailable, blocks improvement workflow
- Fix approach: Implement using `executeAgentWithSession` pattern already in place

**In-Memory Rate Limiting:**

- Issue: Rate limit stored in `Map<string, RateLimitEntry>` - resets on server restart
- Files: `src/hooks.server.ts` (line 55)
- Impact: Rate limits bypassed on restart, no persistence across instances
- Fix approach: Use Redis or database-backed rate limiting for multi-instance deployments

**Excessive `any` Type Usage:**

- Issue: 333+ instances of `any` type casting, primarily in tests and OpenCode SDK calls
- Files: `vitest.config.ts`, tests/server/services/\*.test.ts, `src/lib/server/services/opencode.service.ts`
- Impact: Type safety bypassed, potential runtime errors
- Fix approach: Create proper type definitions for OpenCode SDK responses

**Temporary Skipped E2E Tests:**

- Issue: Multiple tests marked `.skip` with TODO comments citing "empty database"
- Files: `e2e/prompts.spec.ts` (lines 103, 215, 244)
- Impact: Test coverage gaps, regression risk for prompt library features
- Fix approach: Implement test data seeding strategy or mock data

## Known Bugs

**Test Page Route in Production:**

- Symptoms: `/test` route with 1976 lines of component demos accessible in production
- Files: `src/routes/test/+page.svelte`
- Trigger: Access `/test` route
- Workaround: None - route is public
- Risk: Exposes internal component structure, confusing for end users
- Fix: Add authentication guard or exclude from production build

**Unauthenticated User ID in Versions:**

- Symptoms: Versions created with hardcoded `'user'` string instead of actual user ID
- Files: `src/routes/api/prompts/[id]/versions/+server.ts` (line 106)
- Trigger: Create a new version via API
- Workaround: None
- Fix approach: Integrate with authentication system to get real user ID

## Security Considerations

**JWT Secret Default Value:**

- Risk: Authentication bypass if environment misconfigured
- Files: `src/lib/server/auth/jwt.ts` (line 4: `process.env.JWT_SECRET || 'default-secret-change-in-production'`)
- Current mitigation: None - fallback is weak
- Recommendations:
  - Remove default value entirely
  - Add startup validation for production environment
  - Use secrets management (e.g., vault, AWS Secrets Manager)

**Development Mode Auth Bypass:**

- Risk: Admin access granted without password in development mode
- Files: `src/hooks.server.ts` (line 152-154), `src/lib/server/env.ts` (line 43-48)
- Current mitigation: Warning logged to console
- Recommendations:
  - Require explicit `DEV_AUTH_BYPASS=true` flag
  - Add visual indicator in UI when bypass is active

**CSP Allows Unsafe Inline/Eval:**

- Risk: XSS vulnerability through injected scripts
- Files: `src/hooks.server.ts` (line 243-244)
- Current mitigation: CSP header present
- Recommendations:
  - Remove `'unsafe-inline'` and `'unsafe-eval'` from CSP
  - Use nonces for inline scripts
  - May require refactoring Monaco Editor integration

**CORS Wildcard for Origins:**

- Risk: API accessible from any origin in default config
- Files: `src/hooks.server.ts` (line 216, 233)
- Current mitigation: `ALLOWED_ORIGINS` env var with default `localhost:3000`
- Recommendations:
  - Remove wildcard fallback on OPTIONS requests (line 233)
  - Require explicit origin list in production

## Performance Bottlenecks

**Large Test Page Component:**

- Problem: 1976 lines in single Svelte component
- Files: `src/routes/test/+page.svelte`
- Cause: Massive inline sample data, no lazy loading
- Improvement path:
  - Split into sub-components
  - Lazy load sections
  - Move sample data to separate fixtures

**Analytics N+1 Query Pattern:**

- Problem: Multiple sequential DB queries in analytics functions
- Files: `src/lib/server/services/analytics.service.ts` (lines 44-105)
- Cause: Separate queries for prompts, versions, metrics instead of joins
- Improvement path: Consolidate into single query with aggregations

**No Database Connection Pooling:**

- Problem: Single DB client instance, no pool configuration visible
- Files: `src/lib/server/db/client.ts`
- Cause: Using libsql default behavior
- Improvement path: Configure connection pool for production load

**In-Memory Provider Catalog Cache:**

- Problem: Cache stored in module-level variable, not shared across instances
- Files: `src/lib/server/services/opencode.service.ts` (lines 338-339)
- Cause: Simple TTL cache without persistence
- Improvement path: Use Redis or similar for distributed caching

## Fragile Areas

**OpenCode SDK Integration:**

- Files: `src/lib/server/services/opencode.service.ts`
- Why fragile: Heavy use of `any` casting due to SDK typing gaps, many `as any` assertions
- Safe modification: Add type definitions before changing SDK interaction patterns
- Test coverage: Good - multiple test files cover error mapping and agent execution

**Authentication Flow:**

- Files: `src/hooks.server.ts`, `src/lib/server/auth/jwt.ts`
- Why fragile: Multiple auth methods (JWT, Better Auth session, dev bypass) with complex priority logic
- Safe modification: Test all three auth paths explicitly, never modify one without others
- Test coverage: Moderate - JWT tests exist, integration tests limited

**Improvement Workflow:**

- Files: `src/routes/api/prompts/[id]/improve/+server.ts`, `src/lib/components/improvement/`
- Why fragile: Long async chains, multiple external API calls, error handling spread across layers
- Safe modification: Add integration tests before refactoring
- Test coverage: Unit tests exist, E2E coverage partial

## Scaling Limits

**In-Memory Rate Limiting:**

- Current capacity: Single server instance
- Limit: Rate limits not shared across horizontal scaling
- Scaling path: Replace with Redis-backed rate limiting

**SQLite/LibSQL Database:**

- Current capacity: Single file database
- Limit: Not suitable for high write throughput or distributed deployments
- Scaling path: Migrate to PostgreSQL or similar for production scale

**No Pagination on Some Endpoints:**

- Current capacity: Returns all records
- Limit: Memory pressure with large datasets
- Scaling path: Add cursor-based pagination to all list endpoints

## Dependencies at Risk

**@opencode-ai/sdk:**

- Risk: SDK version `^1.1.53` - frequent updates, evolving API
- Impact: Breaking changes may affect OpenCode integration
- Migration plan: Pin version, test SDK updates in isolation

**better-auth:**

- Risk: Version `^1.4.18` - relatively new library, evolving patterns
- Impact: Auth system may require updates with major versions
- Migration plan: Consider abstracting auth layer for easier provider switching

**Monaco Editor:**

- Risk: Large bundle size, CSP conflicts with `'unsafe-eval'`
- Impact: Page load performance, security policy relaxation
- Migration plan: Consider CodeMirror as lighter alternative if needed

## Missing Critical Features

**No Audit Log Persistence:**

- Problem: Security events logged to console only
- Files: `src/lib/server/audit.ts`
- Blocks: Compliance, security investigation, user action history

**No Database Migration System:**

- Problem: Using `drizzle-kit push` for schema changes
- Files: `package.json` (line 18)
- Blocks: Reproducible deployments, rollback capability

**No Backup/Restore:**

- Problem: No automated backup strategy visible
- Blocks: Disaster recovery

## Test Coverage Gaps

**analytics.service.ts:**

- What's not tested: All public functions (`getAnalyticsMetrics`, `getQualityScores`, `getUsageData`, `getTopPrompts`, `getRecentImprovements`)
- Files: `src/lib/server/services/analytics.service.ts`
- Risk: Analytics bugs go undetected
- Priority: Medium

**improvement.service.ts:**

- What's not tested: Main service file has no direct test file
- Files: `src/lib/server/services/improvement.service.ts`
- Risk: Core improvement logic untested at unit level
- Priority: High

**E2E Tests for Real Workflows:**

- What's not tested: Actual prompt creation, editing, improvement flows with database
- Files: `e2e/*.spec.ts` - many tests skipped due to empty database
- Risk: Integration issues not caught
- Priority: High

**Svelte Component Unit Tests:**

- What's not tested: Most Svelte components lack dedicated unit tests
- Files: `src/lib/components/**/*.svelte`
- Risk: Component regressions, prop validation issues
- Priority: Medium

---

_Concerns audit: 2026-02-14_
