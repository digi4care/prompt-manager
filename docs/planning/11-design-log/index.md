# 11 -- Design Log

## DEC-001: OpenCode SDK over direct API
**Decision:** Use OpenCode SDK instead of direct HTTP API calls.
**Rationale:** SDK provides session management, streaming, error mapping.
**Outcome:** Good. Clean integration via src/lib/server/services/opencode.service.ts.

## DEC-002: Settings-first execution
**Decision:** Every execution resolves model via deterministic cascade: run > prompt > default.
**Rationale:** Deterministic, auditable, testable.
**Outcome:** Partial. Legacy settings exist; new registry in progress.
**Constraints:** Dual system during migration.

## DEC-003: Drizzle ORM
**Decision:** Use Drizzle ORM with SQLite/libsql.
**Rationale:** Type-safe, SQLite-compatible, existing investment.
**Outcome:** Good. Clean schema definitions in src/lib/server/db/schema.ts.

## DEC-004: Dual Auth (Better Auth + JWT)
**Decision:** Better Auth for sessions, legacy JWT for API tokens.
**Rationale:** Better Auth handles modern auth; JWT keeps API compatibility.
**Outcome:** Partial. JWT auth bypass was a security issue (fixed).
**Constraints:** May consolidate to Better Auth-only in future.

## DEC-005: Settings Schema Registry
**Decision:** Build new settings registry with dependency graph, cascade resolution, visibility conditions.
**Rationale:** Legacy settings (756-line monolithic page) is unmaintainable.
**Outcome:** In progress. 177 tests passing. API persistence merged.
**Constraints:** Must maintain backward compatibility during cutover.

## DEC-006: Better-Auth Instrumentation Shim
**Decision:** Create Vite alias shim for @better-auth/core/instrumentation.
**Rationale:** better-auth@1.5.0 dist imports from non-exported subpath.
**Outcome:** Working. Server starts successfully.
**Constraints:** Monitor for upstream fix.
