# Test Workflow Blueprint (Standalone)

This blueprint is the standalone execution contract for generating and maintaining `docs/testing/`.

## Goal

Produce deterministic testing workflow docs that future LLM sessions can execute without ambiguity:

- who does what,
- what must be tested,
- where artifacts live,
- when gates block progress.

## Non-Negotiable Rules

1. No feature is complete without tests.
2. No implementation before planning artifacts exist.
3. No analysis execution before analysis strategy and analysis todo exist.
4. Every scoped feature requires Good and Bad behavior coverage.
5. Bug fixes require a regression test first.
6. Any client/server or frontend/backend change requires cross-boundary contract tests.

## Runtime Modes

- `greenfield`: no meaningful testing baseline exists.
- `brownfield`: existing standards/tests exist; default is assimilate + upgrade.
- `hybrid`: partial or inconsistent baseline; normalize first.

Brownfield replacement is allowed only if it is faster or materially lowers risk.

## Mandatory Phase Order

P0 `RUN_CONTEXT.md`
P1 `ANALYSIS_STRATEGY.md`
P2 `ANALYSIS_TODO.md`
P3 `ANALYSIS_DECISION_RECORD.md`
P4 discovery batch A -> `ANALYSIS_UNIVERSE.md` + `ANALYSIS_LOG.md`
P5 `DEEP_DIVE_PLAN.md`
P6 discovery batch B -> `ANALYSIS_LOG.md`
P7 `OMISSION_AUDIT_REPORT.md`
P8 synthesis -> strategy/matrix/traceability/checklist/guideline
P9 `IMPLEMENTATION_PLAN.md`
P10 `TODO.md`
P11 apply changes
P12 `GENERATION_REPORT.md`

No skipping. No apply before P0..P10 pass.

## Required docs/testing Artifacts

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

## Coverage Contract

- Minimum per feature: 1 Good + 1 Bad scenario.
- IDs:
  - Test IDs: `SET-<BLOCK>-NNN`
  - Trace IDs: `TRACE-<DOMAIN>-NNN`
- Priority: `P0`, `P1`, `P2`
- Status: `Planned`, `Partial`, `Covered`, `Blocked`

## Cross-Boundary Interaction Contract (Mandatory)

When a change touches client/server or frontend/backend interaction, coverage must include:

1. Frontend interaction/state test (loading/success/error transitions).
2. Backend/service validation test for accepted and rejected payloads.
3. API contract test for request and response shape (including error payload).
4. End-to-end interaction test covering one happy and one failure path.

Mandatory assertions for interaction changes:

- Request payload shape matches backend contract.
- Response payload shape matches frontend expectations.
- Error mapping is deterministic (status/code/message).
- Retry/timeout behavior does not cause duplicate writes or silent failures.

## Large Codebase Anti-Omission

- Build `ANALYSIS_UNIVERSE.md` first.
- Every domain must be accounted (`covered`, `deferred`, or `excluded`).
- Omission audit blocks progression if critical domains are missing.
- Use parallel bounded subagent discovery by domain.

## New Chat Start

1. Read this file: `.opencode/skills/test-workflow-generator/TEST-WORKFLOW_BLUEPRINT.md`
2. Read `.opencode/skills/test-workflow-generator/SKILL.md`
3. Run plan-only flow first.
4. Only run apply after plan artifacts are complete and reviewed.
