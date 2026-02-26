# AI Settings Database Audit + Variant-Centric Options

Date: 2026-02-23
Scope: efficiency, integrity, SOLID/DRY, and variant-aware settings behavior

## 1) Current Schema Snapshot

Primary tables currently involved:

| Table                      | Role                                                  | Strength                                 | Main risk                                               |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `admin_settings`           | key-value store for policy/connection and legacy data | flexible, unique key index               | mixed concerns, JSON text drift                         |
| `opencode_connection`      | legacy singleton connection state                     | simple bootstrap state                   | duplicate source-of-truth with canonical key            |
| `function_defaults`        | baseline defaults per function type                   | deterministic singleton by function type | no first-class variant column                           |
| `prompt_function_settings` | prompt-level overrides                                | unique `(prompt_id,function_type)`       | no first-class variant override                         |
| `council_agents`           | repeated LLM council members                          | ordering support via `agent_order`       | no first-class variant column + polymorphic parent      |
| `improve_presets`          | reusable improve templates                            | default preset support                   | model settings partly text/JSON and variant-unspecified |

## 2) Variant Requirement Impact

New agreed rule: defaults and council must store and enforce `modelVariant` constrained by policy.

DB-level implications:

1. Variant must be persisted where model is persisted.
2. Runtime resolver must be able to read variant without heuristic parsing.
3. Policy change invalidations must be detectable for existing rows.

## 3) Minimum Schema Changes (Recommended Baseline)

Add columns:

- `function_defaults.model_variant TEXT NULL`
- `prompt_function_settings.model_variant_override TEXT NULL`
- `council_agents.model_variant TEXT NULL`
- optional: `improve_presets.model_variant TEXT NULL` for preset-level consistency

Optional constraints (if format standardized):

- CHECK `model_variant <> ''` when not null
- CHECK `model_id LIKE '%/%'` for canonical model IDs (if fully migrated)

Suggested index additions:

- `council_agents(parent_type, parent_id, agent_order)`
- optional if query-heavy: `function_defaults(function_type, model_id, model_variant)`

## 4) Integrity Model for Policy-Scoped Variants

Because policy currently lives in `admin_settings` JSON keys, DB cannot fully enforce variant allowlist alone.

Practical strategy:

- DB stores selected variant value.
- App service performs authoritative check against policy + catalog.
- Invalid persisted rows are surfaced by validation/health scan endpoint.

Hard-fail requirement (agreed):

- disallowed or unavailable variant returns typed error, no fallback.

## 5) Efficiency Assessment

Current positives:

- key lookups and default lookups are index-friendly.
- data volume is small enough for predictable latency.

Variant-era concerns:

- policy checks now evaluate model + scope + variant;
- repeated JSON parsing from `admin_settings` can become hot-path overhead if not cached.

Low-risk optimization:

- parse and cache effective policy object at service boundary with TTL + invalidation on settings write.

## 6) Architecture Options (Updated)

## Option A - Harden Existing Schema (Fastest)

What changes:

1. Add variant columns to existing tables.
2. Keep policy in `admin_settings` keys.
3. Add centralized validator for `(scope, model, variant)`.
4. Keep canonical + legacy connection sync temporarily.

Pros:

- minimal migration risk
- fastest delivery for required feature set

Cons:

- policy remains JSON-text based
- DB-level policy integrity remains indirect

## Option B - Typed Policy Domain (Balanced)

What changes:

1. Keep baseline variant columns from Option A.
2. Introduce typed policy tables:
   - `ai_policy`
   - `ai_policy_scope_rules`
   - `ai_policy_model_variants`
3. Migrate from key-value policy to typed rows.

Pros:

- better queryability and integrity
- easier audit/reporting for allowed variants by scope

Cons:

- migration complexity and dual-read period

## Option C - Typed Policy + Revision Timeline (Advanced)

What changes:

1. Option B baseline.
2. Add append-only settings revision table (`ai_settings_revisions`).
3. Store before/after policy snapshots and actor metadata.

Pros:

- strongest governance and rollback traceability

Cons:

- highest implementation and operational cost

## 7) Recommendation

Recommended delivery path:

1. **Now:** Option A (variant columns + strict validator + hard fail)
2. **Next:** Option B (typed policy normalization)

Reason:

- achieves required behavior quickly,
- reduces risk before structural migrations,
- keeps room for clean long-term schema.

## 8) Migration Plan (Variant First)

Phase 1 (schema + write/read support):

1. Add variant columns.
2. Update admin APIs to accept `modelVariant`.
3. Update services and cascade to return `modelVariant` + source.

Phase 2 (runtime enforcement):

1. Central validator in runtime flows.
2. Hard-fail on disallowed/unavailable variants.
3. Add tests for save-time and run-time failures.

Phase 3 (typed policy optional):

1. Create typed policy tables.
2. Backfill from current keys.
3. Switch writes, then retire key-based policy writes.

## 9) Validation Checklist

- [ ] Variant fields persisted for defaults, prompt overrides, council.
- [ ] Save endpoints reject invalid variant/scope combinations.
- [ ] Runtime endpoints fail fast when stored variant becomes invalid.
- [ ] Catalog endpoint exposes variants and capability richness.
- [ ] No silent variant fallback path remains.

## 10) Reference Files

- `src/lib/server/db/schema.ts`
- `drizzle/migrations/0000_useful_prodigy.sql`
- `src/lib/server/services/function-defaults.service.ts`
- `src/lib/server/services/settings-cascade.service.ts`
- `src/routes/api/admin/function-defaults/[type]/+server.ts`
- `src/routes/api/admin/council-agents/+server.ts`
- `src/routes/api/admin/council-agents/[id]/+server.ts`
- `src/lib/server/services/admin-settings.service.ts`
