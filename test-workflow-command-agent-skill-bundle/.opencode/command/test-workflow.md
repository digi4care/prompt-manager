---
description: Generate project-specific docs/testing workflow with standalone phase gates
argument-hint: "[--mode auto|greenfield|brownfield|hybrid] [--scope <domain>] [--feature <name>] [--out docs/testing] [--plan-only] [--apply] [--strict]"
agent: test-workflow-orchestrator
tools:
  read: true
  write: true
  edit: true
  glob: true
  grep: true
  bash: true
  task: true
  skill: true
  question: true
---

<objective>
Generate and maintain a deterministic testing workflow under `docs/testing/`.

Enforce standalone phase gates so planning is complete before analysis,
analysis is complete before implementation planning, and implementation planning
is complete before apply mode.
</objective>

<execution_context>
@./.opencode/skills/test-workflow-generator/TEST-WORKFLOW_BLUEPRINT.md
@./.opencode/skills/test-workflow-generator/SKILL.md
</execution_context>

<context>
Defaults:
- mode: auto
- out: docs/testing
- execution: plan-only unless `--apply` is explicitly provided

Rules:
- Follow the Mandatory Phase Order defined in `TEST-WORKFLOW_BLUEPRINT.md`.
- Use project-specific evidence (real paths, commands, test files).
- Ask max 3 targeted blocking questions per round only when critical unknowns remain.
- Do not perform non-doc implementation changes before apply phase.
</context>

<process>
1. Parse flags and normalize run mode (`auto|greenfield|brownfield|hybrid`).
2. Run phases P0..P10 and produce planning artifacts in `docs/testing/`.
3. If `--plan-only` is set, stop after P10 and summarize outputs + blockers.
4. If `--apply` is set, verify mandatory artifacts and gates, then run P11..P12.
5. Return generated files, coverage status, and exact next command/action.
</process>
