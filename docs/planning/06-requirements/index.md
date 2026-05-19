# 06 -- Requirements

## Functional Requirements (FR)

### FR-01: User Authentication
The system shall authenticate users via Better Auth sessions before granting access to protected resources.
**Priority:** Must
**Traceability:** US-1.1 through US-1.13

### FR-02: Prompt CRUD
The system shall allow users to create, read, update, and delete prompts with metadata.
**Priority:** Must
**Traceability:** Completed (existing codebase)

### FR-03: Version History
The system shall maintain version history with diff visualization.
**Priority:** Must
**Traceability:** Completed (existing codebase)

### FR-04: Settings Cascade
The system shall resolve model/temperature/parameters via deterministic precedence: run > prompt > default.
**Priority:** Must
**Traceability:** US-3.1, SPEC-10

### FR-05: Execution Logging
The system shall log every execution with model_id, model_source, tokens, duration.
**Priority:** Must
**Traceability:** Phase 3 (completed)

### FR-06: Snippet Variables
The system shall support {{VAR}} syntax with live preview and injection escaping.
**Priority:** Must
**Traceability:** Phase 4 (completed)

### FR-07: Council Modes
The system shall support correct, debate, and consensus council modes.
**Priority:** Should
**Traceability:** Phases 7-9

## Non-Functional Requirements (NFR)

### NFR-01: Security
All errors mapped to stable app error codes (ERR-*). Rate limiting active.
**Priority:** Must

### NFR-02: Database Migrations
Additive changes only -- no drop/rename of existing columns.
**Priority:** Must

### NFR-03: OpenCode Integration
Always via server routes, never from browser.
**Priority:** Must

## Security Requirements (SEC)

### SEC-01: Auth Bypass Prevention
No JWT auth bypass. Constant-time comparison for sensitive data.
**Priority:** Must
**Traceability:** Security hardening issues

### SEC-02: Admin Protection
Admin routes protected via hooks.server.ts role check.
**Priority:** Must

## Reliability Requirements (REL)

### REL-01: Graceful Degradation
Execution fails gracefully with clear error when model unavailable.
**Priority:** Must

### REL-02: Audit Logging
All security events logged (rate limits, auth failures).
**Priority:** Must
