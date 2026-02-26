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
