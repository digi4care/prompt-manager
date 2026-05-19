# Refactor Blueprint - SOLID / DRY / Security (Variant-Aware)

Date: 2026-02-23
Scope: AI settings control plane and downstream runtime model resolution

## 1) Blueprint Goals

1. Make `model + variant` first-class through admin, DB, cascade, and runtime.
2. Enforce policy constraints by scope with **hard-fail** behavior.
3. Expand Model Catalog to high-signal, capability-rich payloads.
4. Improve security consistency and reduce duplicated logic.

## 2) Non-Negotiable Rules

- No silent fallback when a selected variant is disallowed/unavailable.
- One shared validator for `(scope, modelId, modelVariant)`.
- One shared model identity parser/formatter for all runtime services.
- All admin mutation endpoints require consistent auth guard.

## 3) Execution Phases

## Phase 0 - Lock Current Behavior (Safety)

Deliverables:

- Add regression tests around current settings routes.
- Snapshot current responses and error envelopes.

Done when:

- baseline tests pass before structural changes.

## Phase 1 - Security Hardening

Problem:

- Admin mutation auth checks are inconsistent.

Actions:

1. Create one reusable admin auth guard.
2. Apply guard to all settings mutation routes.
3. Normalize unauthorized and forbidden response format.

Key files:

- `src/routes/api/admin/settings/[key]/+server.ts`
- `src/routes/api/admin/council-agents/+server.ts`
- `src/routes/api/admin/council-agents/[id]/+server.ts`
- `src/routes/api/admin/improve-presets/+server.ts`
- `src/routes/api/admin/improve-presets/[id]/+server.ts`
- `src/routes/api/admin/opencode-connection/+server.ts`

Done when:

- all admin writes are protected and tested.

## Phase 2 - Variant Data Model Foundation

Problem:

- variant is not first-class in defaults/council storage path.

Actions:

1. Add DB columns:
   - `function_defaults.model_variant`
   - `prompt_function_settings.model_variant_override`
   - `council_agents.model_variant`
2. Update schema types and migration.
3. Update serializers/mappers used by settings load.

Done when:

- variant values persist and round-trip in admin read/write flows.

## Phase 3 - API + Cascade + Runtime Enforcement

Problem:

- no full chain enforcement for policy-scoped variants.

Actions:

1. Extend API contracts for defaults/council with `modelVariant`.
2. Add shared server validator:
   - input: scope, modelId, modelVariant, policy, catalog
   - output: ok or typed error
3. Extend `settings-cascade.service.ts` to resolve variant with source.
4. Propagate variant to runtime services:
   - `execution.service.ts`
   - `judge.service.ts`
   - `improvement.service.ts`
5. Enforce hard-fail codes (`MODEL_VARIANT_NOT_ALLOWED`, `MODEL_VARIANT_UNAVAILABLE`, `MODEL_VARIANT_REQUIRED`).

Done when:

- invalid variant never auto-fallbacks and always returns typed error.

## Phase 4 - Model Catalog v2 Enrichment

Problem:

- catalog payload is too shallow for policy-driven operations.

Actions:

1. Enrich `/api/opencode/providers` response with:
   - provider capabilities and connection/auth state
   - model status/capabilities/limits
   - normalized variant list with default indicator
   - policy overlay (`allowed`, `blockedReason`, `scopeAllowed`, `allowedVariants`)
2. Add payload normalization adapter in service layer.
3. Add freshness/provenance metadata.

Done when:

- defaults/council/policy UI can consume one rich catalog payload without ad-hoc inference.

## Phase 5 - UI Variant Selection Integration

Problem:

- defaults and council cannot fully pick policy-scoped variants.

Actions:

1. Update defaults UI with variant picker bound to selected model and role scope.
2. Update council member UI with variant picker bound to selected model and council scope.
3. Surface blocked reasons inline when policy disallows model/variant.
4. Keep save disabled if variant selection is required but missing.

Key files:

- `src/lib/components/admin/function-settings/FunctionDefaultsList.svelte`
- `src/lib/components/admin/function-settings/CouncilMembersList.svelte`
- shared picker components

Done when:

- model/variant can be selected and saved in both sections with server-validated behavior.

## Phase 6 - DRY Cleanup and Legacy Retirement

Actions:

1. Replace duplicated model parsing logic with shared module.
2. Remove stale defaults-write legacy path where applicable.
3. Remove hardcoded council parent id assumptions.
4. Keep legacy compatibility boundaries documented and explicit.

Done when:

- one parser/validator flow exists and dead paths are removed.

## 4) Test Strategy

Required tests:

- unit tests for validator and parser modules
- API tests for defaults/council variant save errors
- integration tests: policy update invalidates previously selected variant
- E2E tests: admin settings change affects execute/judge/improve with variant propagation

## 5) Rollout Order (Recommended)

1. Phase 1 Security
2. Phase 2 Data model
3. Phase 3 Enforcement
4. Phase 4 Catalog enrichment
5. Phase 5 UI integration
6. Phase 6 Cleanup

## 6) Exit Criteria

- Function Defaults and LLM Council both support `modelVariant` fully.
- Variant options respect active policy + scope.
- Runtime honors resolved variant.
- Invalid variant paths hard-fail with typed errors.
- Catalog provides actionable data for policy and selection UIs.
