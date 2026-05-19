# SPEC-15 Docs Testing Execution Blueprint

## XBP-001 Purpose

Define a deterministic, portable workflow that generates and maintains `docs/testing/` so any future LLM session can plan/build with explicit testing responsibilities (`who`, `what`, `where`, `when`) and hard enforcement gates.

## XBP-002 Scope

In scope:

- command + agent + skill blueprint for test-workflow generation
- mandatory phase order (plan-before-analysis, analysis-before-implementation)
- greenfield, brownfield, and hybrid handling
- parallel subagent execution for large codebases
- anti-omission controls to prevent partial documentation
- output contracts for `docs/testing/*`

Out of scope:

- replacing project-specific business logic specs
- stack-specific test code implementation details per framework

## XBP-003 Canonical References

- Test strategy baseline: `SPEC-08-test-strategy.md` (`TST-*`)
- Delivery gates and sequencing: `SPEC-09-delivery-plan.md` (`DLV-*`, `STEP-*`)
- Settings and validation contracts: `SPEC-10-settings-schema.md` (`SET-*`)
- Error payload and retry semantics: `SPEC-11-error-catalog.md` (`ERR-*`)
- Variant-aware API contracts: `SPEC-14-ai-settings-contract-v1.md` (`AIC-*`)

## XBP-004 Non-Negotiable Principles

- No feature is complete without tests.
- No implementation changes before planning artifacts exist.
- No analysis execution before an analysis strategy and analysis todo exist.
- Every feature change requires both good and bad behavior coverage.
- Bug fixes require a regression test first.
- Documentation and test matrix updates are mandatory with behavior changes.

## XBP-005 Runtime Modes

| Mode         | Detection Signal                        | Primary Behavior                                                  |
| ------------ | --------------------------------------- | ----------------------------------------------------------------- |
| `greenfield` | No meaningful test/docs baseline exists | Create baseline `docs/testing/*` + enforcement model from scratch |
| `brownfield` | Existing test standards and tests exist | Assimilate + upgrade existing standards by default                |
| `hybrid`     | Partial/inconsistent standards          | Normalize baseline first, then upgrade                            |

Brownfield default policy:

- Default: `assimilate + upgrade`
- Exception: `replace` only when replacement is measurably faster or clearly lowers delivery risk.

## XBP-006 Mandatory Output Set

Required generated/maintained files under `docs/testing/`:

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

## XBP-007 Mandatory Phase Order (Hard Gates)

| Phase                      | Required Artifact(s)                                                                        | Hard Gate                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| P0 Bootstrap               | `RUN_CONTEXT.md`                                                                            | no workflow execution without run context                     |
| P1 Plan Analysis Strategy  | `ANALYSIS_STRATEGY.md`                                                                      | no analysis before strategy exists                            |
| P2 Plan Analysis Tasks     | `ANALYSIS_TODO.md`                                                                          | no analysis before task list exists                           |
| P3 Classify Mode           | `ANALYSIS_DECISION_RECORD.md`                                                               | no deep-dive before mode decision exists                      |
| P4 Discovery Batch A       | `ANALYSIS_UNIVERSE.md`, `TEST_BASELINE_INVENTORY` (in log), `CI_TEST_PIPELINE_MAP` (in log) | no synthesis before universe coverage exists                  |
| P5 Plan Deep Dive          | `DEEP_DIVE_PLAN.md`                                                                         | no domain deep-dive before domain plan exists                 |
| P6 Discovery Batch B       | domain deep-dive records in `ANALYSIS_LOG.md`                                               | no omission audit before deep-dive completion                 |
| P7 Omission Audit          | `OMISSION_AUDIT_REPORT.md`                                                                  | no implementation planning if critical coverage is incomplete |
| P8 Synthesize Testing Docs | strategy/matrix/trace/checklist/guideline docs                                              | no build planning before synthesis                            |
| P9 Plan Implementation     | `IMPLEMENTATION_PLAN.md`                                                                    | no edits/tests before implementation plan                     |
| P10 Build Todo             | `TODO.md`                                                                                   | no edits/tests before build todo                              |
| P11 Apply Changes          | code/tests/docs edits                                                                       | only after P0..P10 pass                                       |
| P12 Validate + Close       | `GENERATION_REPORT.md`                                                                      | done only when gates and checks pass                          |

## XBP-008 Parallel Execution Graph

```text
N0 Preflight
 -> N1 Analysis Strategy Plan
 -> N2 Analysis Todo Plan
 -> N3 Mode Classifier
 -> [Parallel Batch A: N4 + N5 + N6]
 -> N7 Deep-Dive Planner
 -> [Parallel Batch B: N8a + N8b + N8c + N8d ...]
 -> N9 Omission Audit
 -> N10 Synthesis (docs/testing baseline)
 -> N11 Implementation Plan
 -> N12 Build Todo
 -> N13 Apply Changes
```

## XBP-009 Role Contract (Who / What / Where)

| Role                 | Responsibility                               | Required Output                                                                                                                            |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Command Orchestrator | entrypoint, sequencing, gate enforcement     | `RUN_CONTEXT.md`, phase progression                                                                                                        |
| Planner Agent        | strategy, task planning, implementation plan | `ANALYSIS_STRATEGY.md`, `ANALYSIS_TODO.md`, `IMPLEMENTATION_PLAN.md`, `TODO.md`                                                            |
| ContextScout (batch) | repository discovery and domain mapping      | `ANALYSIS_UNIVERSE.md`, deep-dive findings in `ANALYSIS_LOG.md`                                                                            |
| Omission Auditor     | coverage completeness verification           | `OMISSION_AUDIT_REPORT.md`                                                                                                                 |
| Synthesizer Agent    | compose final testing workflow docs          | `TEST_STRATEGY.md`, `DEPENDENCY_TEST_MATRIX.md`, `TRACEABILITY_MATRIX.md`, `REGRESSION_GATE_CHECKLIST.md`, `TEST_ENFORCEMENT_GUIDELINE.md` |
| Build/Test Executor  | apply agreed changes and validate            | updated tests/docs + verification output                                                                                                   |

## XBP-010 Command Contract

Command: `/test-workflow`

Recommended flags:

- `--mode auto|greenfield|brownfield|hybrid`
- `--scope <feature-or-domain>`
- `--feature <feature-name>`
- `--out docs/testing`
- `--plan-only`
- `--apply`
- `--strict`

Behavior:

- `--plan-only`: execute phases P0..P10 only.
- `--apply`: allowed only when P0..P10 artifacts exist and pass gates.
- `--strict`: fail when mandatory information is missing; do not produce partial final docs.

## XBP-011 Agent Contract

Primary agent: `test-workflow-orchestrator`

Mandatory behavior:

- ask maximum 3 targeted questions only when critical information is missing
- never skip phase order from `XBP-007`
- always produce concrete repo-specific outputs (no generic-only advice)
- always include good + bad behavior mapping in matrix output

## XBP-012 Skill Contract

Primary skill: `test-workflow-generator`

Skill responsibilities:

- provide templates and schemas for required docs
- enforce ID conventions and required columns
- enforce test minimums by feature type
- enforce gate checklist structure

Required conventions:

- Matrix IDs: `SET-<BLOCK>-NNN`
- Trace IDs: `TRACE-<DOMAIN>-NNN`
- Priorities: `P0`, `P1`, `P2`
- Status: `Planned`, `Partial`, `Covered`, `Blocked`

## XBP-013 Brownfield Decision Policy

Default:

- preserve working standards and upgrade incrementally

Allow `replace` only if one or more conditions hold:

- replacement effort is materially lower than upgrade effort
- existing baseline is structurally flaky/unreliable
- existing baseline blocks required new capabilities
- traceability debt is so high that remediation is riskier than replacement

Decision must be recorded in `ANALYSIS_DECISION_RECORD.md` with rationale and risk.

## XBP-014 Anti-Omission Controls (Large Codebases)

Mandatory controls:

- `ANALYSIS_UNIVERSE.md` must enumerate all relevant domains/paths.
- Every universe entry must be accounted with status: `covered`, `deferred`, or `excluded`.
- `OMISSION_AUDIT_REPORT.md` must list orphan/unmapped domains.
- Critical domain omission blocks progression beyond P7.

No domain may remain implicit or untracked.

## XBP-015 Context Management Controls

To reduce context pressure:

- use parallel subagents for bounded scopes
- enforce one domain per subagent output
- persist compact artifacts instead of large raw dumps
- synthesize from artifacts, not from repeated full-repo scans
- keep orchestrator state minimal and file-driven

## XBP-016 New-Chat Execution Protocol

When a new LLM session starts:

1. Read `docs/spec/SPEC-INDEX.md`.
2. Read `docs/spec/SPEC-15-docs-testing-execution-blueprint.md`.
3. If present, read existing `docs/testing/*` artifacts.
4. Run `/test-workflow --mode auto --out docs/testing --plan-only`.
5. Review and approve plan artifacts (P0..P10).
6. Run `/test-workflow --mode auto --out docs/testing --apply`.
7. Execute validation checks and update `GENERATION_REPORT.md`.

## XBP-017 docs/testing File Contracts

Minimum required sections:

- `TEST_STRATEGY.md`: scope, layers, priorities, DoD
- `DEPENDENCY_TEST_MATRIX.md`: IDs, dependencies, good/bad, layer, target file, status
- `TRACEABILITY_MATRIX.md`: rule/spec -> tests -> files
- `REGRESSION_GATE_CHECKLIST.md`: pre-impl, impl, CI, release gates
- `TEST_ENFORCEMENT_GUIDELINE.md`: mandatory enforcement and no-go rules

## XBP-018 Acceptance Criteria

Workflow is complete only when:

- all mandatory `docs/testing/*` artifacts exist
- hard gate sequence from `XBP-007` is respected
- matrix and traceability are synchronized
- good and bad behavior coverage exists for all scoped features
- implementation/test todo exists before any code/test modifications

## XBP-019 Portability Rules

To reproduce on another machine/project:

- copy this spec and command/agent/skill definitions
- preserve local context policy (`global` disabled where required)
- run in `--plan-only` first, then `--apply`
- keep outputs under `docs/testing/` for deterministic onboarding

## XBP-020 Backward Compatibility and Maintenance

- Keep existing test IDs stable when possible.
- Mark replaced IDs with explicit migration note in `TRACEABILITY_MATRIX.md`.
- Update this spec when gate order, role contracts, or output contracts change.

## XBP-021 Reference Implementation Paths

Local implementation files in this repository:

- Command entrypoint: `.opencode/command/test-workflow.md`
- Orchestrator agent: `.opencode/agents/test-workflow-orchestrator.md`
- Skill root: `.opencode/skills/test-workflow-generator/SKILL.md`
- Skill router: `.opencode/skills/test-workflow-generator/router.sh`
- Skill validator: `.opencode/skills/test-workflow-generator/scripts/validate-workflow.sh`
- Skill templates: `.opencode/skills/test-workflow-generator/templates/`
- Skill schemas: `.opencode/skills/test-workflow-generator/schemas/`
