---
name: test-workflow-generator
description: Generate deterministic project-specific docs/testing workflows from standalone blueprint gates
version: 1.0.0
author: OpenCode
type: workflow-generation
category: testing
tags:
  - testing
  - workflow
  - planning
  - traceability
  - quality-gates
---

# Test Workflow Generator

Generate and maintain a complete testing workflow under `docs/testing/` with strict,
phase-gated execution.

Use this skill when you need project-specific testing governance, not generic advice.

## Primary Inputs

- `mode`: `auto|greenfield|brownfield|hybrid`
- `scope`: feature/domain (optional)
- `feature`: feature statement (optional)
- `out`: output directory (default `docs/testing`)
- `plan_only`: boolean
- `apply`: boolean
- `strict`: boolean

## Mandatory Outputs

The skill expects these files under `docs/testing/`:

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

## Conventions

### IDs

- Test matrix IDs: `SET-<BLOCK>-NNN`
- Traceability IDs: `TRACE-<DOMAIN>-NNN`

### Priority and Status

- Priority: `P0`, `P1`, `P2`
- Status: `Planned`, `Partial`, `Covered`, `Blocked`

### Coverage Rules

- Every scoped feature: at least one good and one bad scenario.
- Bug fixes: regression test first.
- UI changes: include visual or interaction-state test.
- Auth/role changes: include access-control behavior test.
- Client/server or frontend/backend changes: include cross-boundary contract tests.
- Cross-boundary changes must verify request shape, response shape, and error mapping.

## Brownfield Decision Policy

- Default: assimilate and upgrade existing standards.
- Replace only when clearly faster or lower risk.
- Decision must be recorded in `ANALYSIS_DECISION_RECORD.md`.

## Tooling in this Skill

- `test-router.sh`: helper entrypoint for scaffold/validate operations
- `scripts/test-validate-workflow.sh`: artifact and gate checks
- `templates/`: canonical markdown templates for `docs/testing/*`
- `schemas/`: column/enum/gate schema references

## Quick Start

```bash
bash .opencode/skills/test-workflow-generator/test-router.sh scaffold docs/testing
bash .opencode/skills/test-workflow-generator/test-router.sh validate docs/testing
```

## Recommended Execution

1. Generate plan artifacts first (P0..P10).
2. Review and approve planning outputs.
3. Run apply phase (P11..P12).
4. Validate artifacts and matrix/traceability sync.

## File Layout

```
.opencode/skills/test-workflow-generator/
  SKILL.md
  TEST-WORKFLOW_BLUEPRINT.md
  test-router.sh
  scripts/
    test-validate-workflow.sh
  templates/
    *.template.md
  schemas/
    *.schema.json
```
