# AI Settings Deep Architecture Analysis

Date: 2026-02-23
Canonical route: `src/routes/settings/+page.svelte`

## 1) Decision Snapshot (Agreed)

This plan is updated with the new requirements agreed in the review:

1. `model + variant` becomes first-class in backend settings flows.
2. Variant choices in Function Defaults and LLM Council must be constrained by current AI Policy whitelist/matrix.
3. If a stored variant is no longer allowed, behavior is **hard fail** (no silent fallback).
4. Model Catalog must expose richer model/provider capabilities, not only minimal metadata.

## 2) Current Architecture (As Is)

- Settings shell: `src/routes/settings/+page.svelte`
- Server aggregator: `src/routes/settings/+page.server.ts`
- Domain sections:
  - connection (`connection-settings.svelte`)
  - providers (`providers-block.svelte`)
  - AI policy (`policy-editor.svelte`)
  - function defaults (`FunctionDefaultsList.svelte`)
  - LLM council (`CouncilMembersList.svelte`)
  - model catalog (`catalog-view.svelte`)
  - presets (`improve-presets.svelte`)

Current policy state:

- `opencode_allowed_models` + matrix + variants are present in policy flows.
- Variant selection is not yet first-class in defaults/council runtime chain.

## 3) Gap Analysis (What is missing)

## 3.1 Variant propagation gap

- Policy can whitelist model variants, but Defaults/Council selectors do not fully persist and enforce variant as backend identity.
- Cascade service resolves model/temp/tokens, but not variant as source-tracked field.
- Runtime execution paths do not consistently receive and enforce variant.

## 3.2 Catalog depth gap

- Catalog currently favors basic model metadata.
- Missing/limited exposure of high-value attributes per model/variant:
  - reasoning level variants (low/medium/high/xhigh)
  - tool support, JSON mode, structured output support
  - context/output limits normalized consistently
  - pricing and provider-specific constraints (when available)
  - provenance/freshness and policy-overlay status

## 3.3 Validation gap

- No single central validator enforcing `(scope, model, variant)` against policy matrix + allowed variants + connected providers.

## 4) Target Architecture (To Be)

## 4.1 Policy as source of selectable variants

Policy remains the authority for:

- allowed models
- per-scope matrix (`executor/judge/improve/council`)
- per-model allowed variants

Defaults and Council selection UIs must derive variant options from this authority, filtered by selected scope.

## 4.2 First-class `modelVariant` in settings chain

The chain becomes:

`UI selection -> API payload -> DB storage -> settings cascade -> runtime request`

for both:

- Function Defaults
- LLM Council members

## 4.3 Hard-fail policy

If a selected/stored variant is disallowed by current policy or unavailable in current provider catalog:

- return typed validation failure (`400/422`),
- include reason and remediation,
- do not auto-fallback to another variant.

## 4.4 Catalog v2: rich and policy-aware

Catalog response should provide:

- provider metadata (source, auth state, connected state)
- model metadata (status, context, output limits, capability flags)
- variant list per model with normalized ids/labels/default indicator
- policy overlay per scope:
  - `allowed`
  - `blockedReason`
  - allowed variants subset

## 5) End-to-End Behavior by Section (Updated)

| Section           | Required update                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| AI Policy         | Keep as authority for models + variants + scope matrix; add explicit diagnostics for variant coverage gaps                   |
| Function Defaults | Add variant picker tied to selected model; options filtered by policy scope `executor/judge/improve`; persist `modelVariant` |
| LLM Council       | Add variant picker per member; options filtered by council scope; persist `modelVariant`                                     |
| Model Catalog     | Show richer capabilities and explicit variants per model; include policy overlay status                                      |
| Runtime consumers | Accept resolved variant from cascade and pass through to OpenCode adapter layer                                              |

## 6) Backend Trace (Target)

## 6.1 API layer changes

- `/api/admin/function-defaults/[type]`
  - accept/store `modelVariant`
  - validate `(type, modelId, modelVariant)`
- `/api/admin/council-agents*`
  - accept/store `modelVariant`
  - validate `(council scope, modelId, modelVariant)`
- `/api/opencode/providers`
  - return enriched catalog with variant and capability payload

## 6.2 Service layer changes

- Add central validator module (single source):
  - input: scope, modelId, modelVariant, policy, catalog
  - output: ok or typed violation reason
- Extend cascade service to resolve:
  - model id + source
  - model variant + source
  - temperature/maxTokens + source

## 6.3 Storage layer changes

Minimum required DB fields:

- `function_defaults.model_variant`
- `prompt_function_settings.model_variant_override`
- `council_agents.model_variant`
- optional consistency field for presets if variants are preset-driven

## 7) Runtime Impact (Critical)

Runtime flows that must consume variant-aware settings:

- execute: `src/routes/api/prompts/[id]/execute/+server.ts`
- judge: `src/routes/api/judge/evaluate/+server.ts`
- improve: `src/routes/api/prompts/[id]/improve/+server.ts`

All three must receive deterministic resolved variant from backend resolution, not infer ad-hoc.

## 8) Error Model (Hard Fail)

Recommended typed errors:

- `MODEL_VARIANT_NOT_ALLOWED`
- `MODEL_VARIANT_UNAVAILABLE`
- `MODEL_VARIANT_REQUIRED`

Recommended behavior:

- validate on save (admin endpoints)
- validate on resolve (runtime)
- fail fast with actionable message; no variant auto-fallback

## 9) Diagram Coverage

Diagrams in `docs/plans/ai-settings-architecture/diagrams/` are updated to reflect:

- variant-aware policy/defaults/council linkage
- hard-fail resolution gate for variant checks
- ERD with variant columns in settings tables

## 10) Reference Paths

- `src/routes/settings/+page.svelte`
- `src/routes/settings/+page.server.ts`
- `src/lib/components/admin/ai-settings/policy-editor.svelte`
- `src/lib/components/admin/function-settings/FunctionDefaultsList.svelte`
- `src/lib/components/admin/function-settings/CouncilMembersList.svelte`
- `src/lib/components/admin/ai-settings/catalog-view.svelte`
- `src/lib/server/services/settings-cascade.service.ts`
- `src/lib/server/services/function-defaults.service.ts`
- `src/lib/server/services/opencode.service.ts`
- `src/routes/api/admin/function-defaults/[type]/+server.ts`
- `src/routes/api/admin/council-agents/+server.ts`
- `src/routes/api/admin/council-agents/[id]/+server.ts`
- `src/routes/api/opencode/providers/+server.ts`
