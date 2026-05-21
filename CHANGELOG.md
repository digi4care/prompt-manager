# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-05-21

### Added

- **Settings Schema Registry**: Declarative, block-based settings system with validation, dependency resolution, and collapsible UI
- **Council Debate Engine**: Multi-agent debate orchestration with typed event bus, configurable strategies (sequential, round-robin, random)
- **Execution Mode Strategy**: Pluggable execution modes for prompt improvement (direct, chain-of-thought, debate)
- **Model Variant Validation**: Scope-aware variant validation (council, improve, executor) with policy enforcement
- **Function Defaults API**: Admin CRUD endpoints for executor/judge/improve default model configuration
- **Council Agents API**: Full CRUD for council and review agents with model validation
- **Improve Presets API**: Preset management for prompt improvement configurations
- **Repository Layer**: Abstraction over Drizzle ORM with `prompts.repository.ts` and `settings.repository.ts`
- **Shared API Utilities**: `api-response.ts`, `validate-request.ts`, `parse-int.ts` for consistent route handlers
- **Auth Unification**: Migrated from custom JWT to Better Auth with `authenticateRequest` and `requireAdmin` helpers
- **Security Hardening**: Rate limiting, timing-safe comparisons, CSP headers, audit logging
- **3-Phase Testing**: Unit (Vitest), Server E2E (Playwright), Visual Frontend (Playwright headed) with multi-project isolation
- **Settings Route Consolidation**: Merged `/settings-new` into `/settings` using the registry-based approach
- **Prompt Bulk Actions**: Multi-select with bulk delete, categorize, and export
- **Genealogy Tree**: Visual prompt version history with lineage tracking
- **Snippet Management**: CRUD for reusable prompt snippets

### Changed

- Decomposed settings page from monolith (352 lines) to modular registry-based system
- Decomposed council-debate service into focused modules (event-bus, orchestrator, strategies)
- Standardized all API routes to use shared validation and response utilities
- Migrated all multi-table database writes to use `db.transaction()`
- Extracted shared model selection components for reuse across settings and prompt editing

### Fixed

- All 1215 unit tests passing across 48 test files
- Resolved `$env/static/private` module resolution for Vitest via resolve alias
- Fixed auth mock patterns in admin route tests (council-agents, function-defaults, improve-presets)
- Fixed council-agents mock chain to include `orderBy` after `leftJoin.where`
- Preserved prompt `updatedAt` timestamps when adding versions

### Removed

- `/settings-new` route (consolidated into `/settings`)
- Legacy JWT auth implementation
- Hardcoded admin check against database
